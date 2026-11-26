import { randomUUID } from "node:crypto"

import { HttpStatus, Injectable } from "@nestjs/common"
import { account, city, type Database, favorite, listing, session, user, verification } from "@pati-dostu/db"
import {
  type DeleteAccountInput,
  imageContentTypes,
  imageExtensions,
  MAX_IMAGE_UPLOAD_BYTES,
  normalizeTurkishMobile,
  type NotificationPrefs,
  resolveNotificationPrefs,
  type UpdateMeInput,
} from "@pati-dostu/validators"
import { and, eq, isNull } from "drizzle-orm"

import type { Auth, AuthSession } from "../auth/auth.js"
import { InjectAuth } from "../auth/auth.tokens.js"
import { AppException, ErrorCode } from "../common/errors.js"
import { InjectDb } from "../database/database.module.js"
import { sniffImageType } from "../listings/listing-images.service.js"
import { ModerationService } from "../moderation/moderation.service.js"
import { StorageService } from "../storage/storage.service.js"

type SessionUser = AuthSession["user"]

/** Henüz profile bağlanmamış profil fotoğraflarının öneki (kullanıcıya özel; okuma izni yok). */
export const TMP_AVATARS = "tmp/avatars"
/** Profil fotoğraflarının kalıcı öneki (herkese açık okunur). */
export const AVATARS = "avatars"

/**
 * Profil ve ayarlar: profil bilgileri, telefon, tercihler, profil fotoğrafı ve hesabı kapatma.
 * Kullanıcı tablosuna yazan tek yer burasıdır (Better Auth'un /update-user ucu kapalı — auth.ts), böylece
 * "Hakkımda" metni her zaman içerik filtresinden geçer.
 */
@Injectable()
export class ProfileService {
  constructor(
    @InjectDb() private readonly db: Database,
    @InjectAuth() private readonly auth: Auth,
    private readonly moderation: ModerationService,
    private readonly storage: StorageService
  ) {}

  /**
   * Gönderilen alanları günceller (PATCH: gönderilmeyen alan değişmez). Telefon "+90…" biçimine çevrilir, şehir
   * var mı bakılır, "Hakkımda" içerik filtresinden geçer (takılırsa kaydedilmez, CONTENT_BLOCKED).
   */
  async update(me: SessionUser, body: UpdateMeInput): Promise<void> {
    const set: Partial<typeof user.$inferInsert> = {}
    if (body.name !== undefined) set.name = body.name
    if (body.marketingOptIn !== undefined) set.marketingOptIn = body.marketingOptIn
    if (body.showPhoneByDefault !== undefined) set.showPhoneByDefault = body.showPhoneByDefault
    if (body.notificationPrefs !== undefined) set.notificationPrefs = body.notificationPrefs
    if (body.phone !== undefined) set.phone = body.phone === "" ? null : normalizeTurkishMobile(body.phone)
    if (body.cityId !== undefined) {
      if (body.cityId !== "") {
        const [found] = await this.db.select({ id: city.id }).from(city).where(eq(city.id, body.cityId))
        if (!found) throw new AppException(HttpStatus.BAD_REQUEST, ErrorCode.CITY_INVALID, "Geçersiz şehir.")
      }
      set.cityId = body.cityId || null
    }
    if (body.bio !== undefined) {
      await this.moderation.assertAllowed("profile", me.id, { bio: body.bio })
      set.bio = body.bio || null
    }
    if (Object.keys(set).length === 0) return
    await this.db.update(user).set(set).where(eq(user.id, me.id))
  }

  /**
   * Tarayıcının geçici alana yüklediği fotoğrafı profil fotoğrafı yapar: anahtar bu kullanıcının geçici alanında
   * olmalı, dosya gerçekten JPEG/PNG/WebP olmalı; kalıcı alana taşınır, eski fotoğraf silinir.
   */
  async setAvatar(me: SessionUser, tmpKey: string): Promise<{ image: string }> {
    const invalid = () => new AppException(HttpStatus.BAD_REQUEST, ErrorCode.IMAGE_INVALID, "Fotoğraf geçersiz.")
    if (!tmpKey.startsWith(`${TMP_AVATARS}/${me.id}/`) || tmpKey.includes("..")) throw invalid()
    const head = await this.storage.head(tmpKey)
    if (!head || head.size > MAX_IMAGE_UPLOAD_BYTES) throw invalid()
    const sniffed = sniffImageType(await this.storage.readStart(tmpKey, 12))
    if (!sniffed || !(imageContentTypes as readonly string[]).includes(sniffed)) throw invalid()

    const finalKey = `${AVATARS}/${me.id}/${randomUUID()}.${imageExtensions[sniffed]}`
    await this.storage.move(tmpKey, finalKey)
    const image = this.storage.publicUrl(finalKey)
    const previous = me.image
    await this.db.update(user).set({ image }).where(eq(user.id, me.id))
    await this.deleteOwnAvatar(previous)
    return { image }
  }

  /** Profil fotoğrafını kaldırır (avatar baş harflere döner). */
  async removeAvatar(me: SessionUser): Promise<void> {
    await this.db.update(user).set({ image: null }).where(eq(user.id, me.id))
    await this.deleteOwnAvatar(me.image)
  }

  /**
   * Hesabı kapatır ve anonimleştirir (karar: anında, KVKK). Şifreli hesapta mevcut şifre doğrulanır. Sonra:
   * ilanlar yumuşak silinir (yayından kalkar), favoriler, oturumlar, giriş hesapları ve doğrulama kayıtları silinir;
   * ad "Silinmiş kullanıcı", e-posta benzersiz ve geçersiz bir adres olur; telefon, fotoğraf, hakkımda, şehir
   * temizlenir. Aynı e-postayla yeniden kayıt olunabilir.
   */
  async deleteAccount(me: SessionUser, body: DeleteAccountInput): Promise<void> {
    const [credential] = await this.db
      .select({ password: account.password })
      .from(account)
      .where(and(eq(account.userId, me.id), eq(account.providerId, "credential")))
    if (credential?.password) {
      const ctx = await this.auth.$context
      const ok = await ctx.password.verify({ hash: credential.password, password: body.password })
      if (!ok) {
        throw new AppException(HttpStatus.BAD_REQUEST, ErrorCode.INVALID_PASSWORD, "Mevcut şifre hatalı.")
      }
    }

    const now = new Date()
    await this.db.transaction(async (tx) => {
      await tx
        .update(listing)
        .set({ deletedAt: now })
        .where(and(eq(listing.ownerId, me.id), isNull(listing.deletedAt)))
      await tx.delete(favorite).where(eq(favorite.userId, me.id))
      await tx.delete(session).where(eq(session.userId, me.id))
      await tx.delete(account).where(eq(account.userId, me.id))
      await tx.delete(verification).where(eq(verification.identifier, me.email))
      await tx
        .update(user)
        .set({
          name: "Silinmiş kullanıcı",
          email: `deleted-${me.id}@deleted.invalid`,
          emailVerified: false,
          image: null,
          phone: null,
          bio: null,
          cityId: null,
          marketingOptIn: false,
          showPhoneByDefault: false,
          deletedAt: now,
        })
        .where(eq(user.id, me.id))
    })
    await this.deleteOwnAvatar(me.image)
  }

  /**
   * /me yanıtının oturumda olmayan parçaları: e-posta/şifre hesabı var mı (yalnız Google ile girenlerde yok) ve
   * bildirim tercihleri (eksik konular varsayılanla tamamlanmış).
   */
  async extras(userId: string): Promise<{ hasPassword: boolean; notificationPrefs: NotificationPrefs }> {
    const [[credential], [row]] = await Promise.all([
      this.db
        .select({ id: account.id })
        .from(account)
        .where(and(eq(account.userId, userId), eq(account.providerId, "credential"))),
      this.db.select({ prefs: user.notificationPrefs }).from(user).where(eq(user.id, userId)),
    ])
    return { hasPassword: Boolean(credential), notificationPrefs: resolveNotificationPrefs(row?.prefs) }
  }

  /** Adres bizim depodaki bir profil fotoğrafıysa nesneyi siler (Google profil fotoğrafı gibi dış adreslere dokunmaz). */
  private async deleteOwnAvatar(image: string | null | undefined): Promise<void> {
    const prefix = this.storage.publicUrl(`${AVATARS}/`)
    if (!image?.startsWith(prefix)) return
    await this.storage.delete(image.slice(this.storage.publicUrl("").length)).catch(() => undefined)
  }
}
