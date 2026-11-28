import { HttpStatus, Injectable } from "@nestjs/common"
import {
  auditLog,
  breed,
  favorite,
  city,
  type Database,
  district,
  listing,
  listingImage,
  localize,
  type LocalizedText,
  slugify,
  species,
  user,
} from "@pati-dostu/db"
import {
  type ListingQuery,
  type ListingStatus,
  LOCATION_TYPES,
  type ReviewableField,
  type SaveListing,
} from "@pati-dostu/validators"
import { and, asc, count, desc, eq, inArray, isNull, ne, type SQL, sql } from "drizzle-orm"

import type { AuthSession } from "../auth/auth.js"
import { AppException, ErrorCode } from "../common/errors.js"
import { InjectDb } from "../database/database.module.js"
import { ModerationService } from "../moderation/moderation.service.js"
import { NotificationsService } from "../notifications/notifications.service.js"
import { StorageService } from "../storage/storage.service.js"
import { ListingImagesService } from "./listing-images.service.js"
import { statusOnOwnerClose, statusOnReview, statusOnSave, type TransitionResult } from "./listing-status.js"
import type { ListingCard, MyListing } from "./listings.dto.js"

type Locale = "tr" | "en"
type SessionUser = AuthSession["user"]

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null)

/** "+905321234567" → "0532 *** ** 67" (ilan sayfasında numaranın varlığını gösterir, kendisini değil). */
export function maskPhone(e164: string): string {
  const digits = e164.replace(/\D/g, "").replace(/^90/, "")
  if (digits.length !== 10) return "*** *** ** **"
  return `0${digits.slice(0, 3)} *** ** ${digits.slice(8)}`
}

/** Kart satırı: ilan sütunları + birleştirilen tür/il/ilçe adları ve kapak fotoğrafı anahtarı. */
export type CardRow = {
  id: string
  listingNo: number
  slug: string | null
  title: string | null
  type: ListingCard["type"]
  status: ListingStatus
  gender: ListingCard["gender"]
  vaccinated: boolean
  neutered: boolean
  publishedAt: Date | null
  createdAt: Date
  speciesName: LocalizedText | null
  speciesSlug: string | null
  cityName: string | null
  citySlug: string | null
  districtName: string | null
  cover: string | null
}

/** Kart için gereken sütunlar (tür/il/ilçe adları ve kapak fotoğrafı birleştirilerek). */
const cardColumns = {
  id: listing.id,
  listingNo: listing.listingNo,
  slug: listing.slug,
  title: listing.title,
  type: listing.type,
  status: listing.status,
  gender: listing.gender,
  vaccinated: listing.vaccinated,
  neutered: listing.neutered,
  publishedAt: listing.publishedAt,
  submittedAt: listing.submittedAt,
  createdAt: listing.createdAt,
  speciesName: species.name,
  speciesSlug: species.slug,
  cityName: city.name,
  citySlug: city.slug,
  districtName: district.name,
  cover: listingImage.url,
}

/**
 * İlanlar: oluşturma, düzenleme, onay akışı, listeleme ve detay (CLAUDE.md › Ürün kuralları › İlan onayı).
 * Herkese açık sorgular yalnızca `active` ve silinmemiş ilanları döndürür.
 */
@Injectable()
export class ListingsService {
  constructor(
    @InjectDb() private readonly db: Database,
    private readonly images: ListingImagesService,
    private readonly moderation: ModerationService,
    private readonly storage: StorageService,
    private readonly notifications: NotificationsService
  ) {}

  // --- Sahibi --------------------------------------------------------------------------------------------------

  /** Yeni ilan: taslak ya da doğrudan onaya gönderim. Fotoğraflar doğrulanıp ilanın klasörüne taşınır. */
  async create(owner: SessionUser, body: SaveListing, locale: Locale) {
    this.ensureVerified(owner)
    const status = this.unwrap(statusOnSave(null, body.submit))
    await this.validate(owner, body)

    const id = await this.db.transaction(async (tx) => {
      const [row] = await tx
        .insert(listing)
        .values({ ...this.columns(body), ownerId: owner.id, status, submittedAt: body.submit ? new Date() : null })
        .returning({ id: listing.id })
      if (!row) throw new Error("İlan oluşturulamadı")
      const plan = await this.images.prepare(tx, row.id, owner.id, body.images)
      await this.images.write(tx, row.id, plan.keys)
      return row.id
    })
    return this.getOwn(owner.id, id, locale)
  }

  /**
   * İlanı kaydeder (form ilanın tamamını gönderir). Onaya gönderimde ilan her zaman yeniden `pending` olur;
   * admin notu (düzeltme isteği) onaylanana kadar korunur ki admin neyin istendiğini görsün.
   */
  async update(owner: SessionUser, id: string, body: SaveListing, locale: Locale) {
    this.ensureVerified(owner)
    const current = await this.findOwned(owner.id, id)
    const status = this.unwrap(statusOnSave(current.status, body.submit))
    await this.validate(owner, body)

    const removed = await this.db.transaction(async (tx) => {
      await tx
        .update(listing)
        .set({ ...this.columns(body), status, ...(body.submit ? { submittedAt: new Date() } : {}) })
        .where(eq(listing.id, id))
      const plan = await this.images.prepare(tx, id, owner.id, body.images)
      await this.images.write(tx, id, plan.keys)
      return plan.removedKeys
    })
    await this.images.cleanup(removed)
    return this.getOwn(owner.id, id, locale)
  }

  /** Yalnızca fotoğrafların sırası/kapağı: taslak taslak kalır, diğerleri yeniden onaya düşer (en az 1 fotoğraf). */
  async updateImages(owner: SessionUser, id: string, keys: string[], locale: Locale) {
    const current = await this.findOwned(owner.id, id)
    const isDraft = current.status === "draft"
    const status = isDraft ? "draft" : this.unwrap(statusOnSave(current.status, true))
    if (!isDraft && keys.length === 0) {
      throw new AppException(HttpStatus.BAD_REQUEST, ErrorCode.VALIDATION_FAILED, "En az 1 fotoğraf gerekli.", {
        reason: "IMAGES_REQUIRED",
      })
    }

    const removed = await this.db.transaction(async (tx) => {
      const plan = await this.images.prepare(tx, id, owner.id, keys)
      await this.images.write(tx, id, plan.keys)
      await tx
        .update(listing)
        .set({ status, ...(isDraft ? {} : { submittedAt: new Date() }) })
        .where(eq(listing.id, id))
      return plan.removedKeys
    })
    await this.images.cleanup(removed)
    return this.getOwn(owner.id, id, locale)
  }

  /** Sahiplendirildi / kapatıldı. */
  async setOwnerStatus(owner: SessionUser, id: string, target: "adopted" | "closed", locale: Locale) {
    const current = await this.findOwned(owner.id, id)
    const status = this.unwrap(statusOnOwnerClose(current.status, target))
    await this.db.update(listing).set({ status, closedAt: new Date() }).where(eq(listing.id, id))

    // Favoriye ekleyenlere bildirim: sahiplendirildi / kavuştu / yayından kaldırıldı (sahibi hariç).
    const fans = await this.db
      .select({ userId: favorite.userId })
      .from(favorite)
      .where(and(eq(favorite.listingId, id), ne(favorite.userId, owner.id)))
    const reunion = current.type === "lost" || current.type === "found"
    await this.notifications.notify(
      fans.map((f) => f.userId),
      {
        type: "favorite_closed",
        listingNo: current.listingNo,
        title: current.title ?? "",
        outcome: target === "closed" ? "closed" : reunion ? "reunited" : "adopted",
      }
    )
    return this.getOwn(owner.id, id, locale)
  }

  /** Yumuşak silme: sahibi ya da admin. Fotoğraflar depoda kalır (geri alma ve denetim için). */
  async remove(actor: SessionUser, id: string): Promise<void> {
    const [row] = await this.db
      .select({ ownerId: listing.ownerId })
      .from(listing)
      .where(and(eq(listing.id, id), isNull(listing.deletedAt)))
    if (!row || (row.ownerId !== actor.id && actor.role !== "admin")) throw this.notFound()
    await this.db.update(listing).set({ deletedAt: new Date() }).where(eq(listing.id, id))
    if (actor.role === "admin" && row.ownerId !== actor.id) {
      await this.audit(actor.id, "listing.delete", id)
    }
  }

  /**
   * Kullanıcının kendi ilanları (tüm durumlar, silinenler hariç), en son güncellenen önce. Kart verisine ek olarak
   * görüntülenme, admin notu / düzeltilecek alanlar, red gerekçesi ve son güncelleme tarihi (İlanlarım sayfası).
   */
  async myListings(ownerId: string, locale: Locale): Promise<MyListing[]> {
    const rows = await this.cardQuery()
      .where(and(eq(listing.ownerId, ownerId), isNull(listing.deletedAt)))
      .orderBy(desc(listing.updatedAt))
    if (rows.length === 0) return []
    const extras = await this.db
      .select({
        id: listing.id,
        viewCount: listing.viewCount,
        reviewNote: listing.reviewNote,
        reviewFields: listing.reviewFields,
        rejectionReason: listing.rejectionReason,
        updatedAt: listing.updatedAt,
      })
      .from(listing)
      .where(
        inArray(
          listing.id,
          rows.map((r) => r.id)
        )
      )
    const byId = new Map(extras.map((e) => [e.id, e]))
    return rows.map((r) => {
      const e = byId.get(r.id)
      return {
        ...this.toCard(r, locale),
        viewCount: e?.viewCount ?? 0,
        reviewNote: e?.reviewNote ?? null,
        reviewFields: (e?.reviewFields as ReviewableField[] | null) ?? null,
        rejectionReason: e?.rejectionReason ?? null,
        updatedAt: (e?.updatedAt ?? new Date()).toISOString(),
      }
    })
  }

  /** Düzenleme formu için ilanın tamamı (yalnızca sahibine). */
  async getOwn(ownerId: string, id: string, locale: Locale) {
    const row = await this.detailRow(and(eq(listing.id, id), eq(listing.ownerId, ownerId)))
    if (!row) throw this.notFound()
    const keys = await this.images.currentKeys(this.db, id)
    return {
      ...this.toDetailBase(row, locale),
      speciesId: row.l.speciesId,
      breedId: row.l.breedId,
      cityId: row.l.cityId,
      districtId: row.l.districtId,
      microchipNumber: row.l.microchipNumber,
      showPhone: row.l.showPhone,
      images: keys.map((key) => ({ key, url: this.storage.publicUrl(key) })),
      reviewNote: row.l.reviewNote,
      reviewFields: (row.l.reviewFields as ReviewableField[] | null) ?? null,
      rejectionReason: row.l.rejectionReason,
      submittedAt: iso(row.l.submittedAt),
    }
  }

  // --- Herkese açık -----------------------------------------------------------------------------------------------

  /** Filtreli, sayfalı ilan listesi (yalnızca yayındakiler). */
  async list(q: ListingQuery) {
    const where = and(...this.filters(q))
    const order =
      q.sort === "oldest"
        ? [asc(listing.publishedAt), asc(listing.listingNo)]
        : [desc(listing.publishedAt), desc(listing.listingNo)]

    const [rows, [total]] = await Promise.all([
      this.cardQuery()
        .leftJoin(breed, eq(breed.id, listing.breedId))
        .where(where)
        .orderBy(...order)
        .limit(q.pageSize)
        .offset((q.page - 1) * q.pageSize),
      this.db
        .select({ value: count() })
        .from(listing)
        .leftJoin(species, eq(species.id, listing.speciesId))
        .leftJoin(city, eq(city.id, listing.cityId))
        .leftJoin(district, eq(district.id, listing.districtId))
        .leftJoin(breed, eq(breed.id, listing.breedId))
        .where(where),
    ])
    return {
      items: rows.map((r) => this.toCard(r, q.locale)),
      total: total?.value ?? 0,
      page: q.page,
      pageSize: q.pageSize,
    }
  }

  /**
   * İlan detayı. Herkes yalnızca yayındaki ilanı görür; sahibi ve admin diğer durumları da görebilir (önizleme).
   * Telefon: ilan sahibi "Telefonumu göster"i açtıysa ve bakan giriş yapmışsa. Çip numarası: yalnızca admin.
   */
  async detail(ref: string, viewer: SessionUser | null, locale: Locale) {
    const row = await this.detailRow(this.refCondition(ref))
    if (!row) throw this.notFound()
    const isOwner = viewer?.id === row.l.ownerId
    const isAdmin = viewer?.role === "admin"
    if (row.l.status !== "active" && !isOwner && !isAdmin) throw this.notFound()

    const [keys, [active]] = await Promise.all([
      this.images.currentKeys(this.db, row.l.id),
      this.db
        .select({ value: count() })
        .from(listing)
        .where(and(eq(listing.ownerId, row.l.ownerId), eq(listing.status, "active"), isNull(listing.deletedAt))),
    ])
    const showPhone = row.l.showPhone && Boolean(row.owner.phone)
    return {
      ...this.toDetailBase(row, locale),
      images: keys.map((key) => ({ url: this.storage.publicUrl(key) })),
      owner: {
        id: row.owner.id,
        name: row.owner.name,
        image: row.owner.image,
        role: row.owner.role,
        memberSince: row.owner.createdAt.toISOString(),
        activeListings: active?.value ?? 0,
      },
      contact: { showPhone, phoneMasked: showPhone ? maskPhone(row.owner.phone ?? "") : null },
      microchipNumber: isAdmin ? row.l.microchipNumber : null,
    }
  }

  /**
   * İlan sahibinin tam telefon numarası: yalnızca giriş yapmış kullanıcıya, yayındaki ve "Telefonumu göster" açık
   * ilanda (sahibi ve admin her durumda). Aksi hâlde 404 (numaranın varlığı sızdırılmaz).
   */
  async phone(ref: string, viewer: SessionUser): Promise<{ phone: string }> {
    const [row] = await this.db
      .select({ ownerId: listing.ownerId, status: listing.status, showPhone: listing.showPhone, phone: user.phone })
      .from(listing)
      .innerJoin(user, eq(user.id, listing.ownerId))
      .where(and(this.refCondition(ref), isNull(listing.deletedAt)))
    const privileged = row && (row.ownerId === viewer.id || viewer.role === "admin")
    if (!row?.phone || (!privileged && (row.status !== "active" || !row.showPhone))) throw this.notFound()
    return { phone: row.phone }
  }

  /** Görüntülenme sayısını artırır (yalnızca yayındaki ilan; sahibinin kendi bakışı sayılmaz). */
  async recordView(ref: string, viewer: SessionUser | null): Promise<void> {
    await this.db
      .update(listing)
      .set({ viewCount: sql`${listing.viewCount} + 1`, updatedAt: sql`${listing.updatedAt}` })
      .where(
        and(
          this.refCondition(ref),
          eq(listing.status, "active"),
          isNull(listing.deletedAt),
          viewer ? ne(listing.ownerId, viewer.id) : undefined
        )
      )
  }

  /** Benzer ilanlar: aynı tür ve ildeki yayındaki ilanlardan rastgele 4; yetmezse aynı türden tamamlanır. */
  async similar(ref: string, locale: Locale): Promise<ListingCard[]> {
    const [base] = await this.db
      .select({ id: listing.id, speciesId: listing.speciesId, cityId: listing.cityId })
      .from(listing)
      .where(and(this.refCondition(ref), eq(listing.status, "active"), isNull(listing.deletedAt)))
    if (!base?.speciesId) throw this.notFound()

    const active = and(eq(listing.status, "active"), isNull(listing.deletedAt), ne(listing.id, base.id))
    const sameCity = base.cityId
      ? await this.cardQuery()
          .where(and(active, eq(listing.speciesId, base.speciesId), eq(listing.cityId, base.cityId)))
          .orderBy(sql`random()`)
          .limit(4)
      : []
    const seen = sameCity.map((r) => r.id)
    const rest =
      sameCity.length < 4
        ? await this.cardQuery()
            .where(
              and(
                active,
                eq(listing.speciesId, base.speciesId),
                seen.length ? sql`${listing.id} not in ${seen}` : undefined
              )
            )
            .orderBy(sql`random()`)
            .limit(4 - sameCity.length)
        : []
    return [...sameCity, ...rest].map((r) => this.toCard(r, locale))
  }

  // --- Admin --------------------------------------------------------------------------------------------------

  /** Admin kararı: onayla (yayına al), düzeltme iste (not + alanlar) ya da reddet (gerekçe). Denetim kaydı yazılır. */
  async review(
    admin: SessionUser,
    id: string,
    decision:
      | { kind: "approve" }
      | { kind: "reject"; reason: string }
      | { kind: "request_changes"; note: string; fields: ReviewableField[] }
  ): Promise<void> {
    const [row] = await this.db
      .select({
        status: listing.status,
        publishedAt: listing.publishedAt,
        ownerId: listing.ownerId,
        listingNo: listing.listingNo,
        slug: listing.slug,
        title: listing.title,
      })
      .from(listing)
      .where(and(eq(listing.id, id), isNull(listing.deletedAt)))
    if (!row) throw this.notFound()
    const status = this.unwrap(statusOnReview(row.status, decision.kind))
    const now = new Date()

    await this.db
      .update(listing)
      .set({
        status,
        reviewedBy: admin.id,
        reviewedAt: now,
        ...(decision.kind === "approve"
          ? { publishedAt: row.publishedAt ?? now, reviewNote: null, reviewFields: null, rejectionReason: null }
          : decision.kind === "reject"
            ? { rejectionReason: decision.reason, reviewNote: null, reviewFields: null }
            : { reviewNote: decision.note, reviewFields: decision.fields }),
      })
      .where(eq(listing.id, id))
    await this.audit(admin.id, `listing.${decision.kind}`, id, decision)

    // İlan sahibine bildirim (site içi + e-posta, tercihine göre).
    const base = { listingId: id, listingNo: row.listingNo, title: row.title ?? "" }
    await this.notifications.notify(
      row.ownerId,
      decision.kind === "approve"
        ? { type: "listing_approved", ...base, slug: row.slug }
        : decision.kind === "reject"
          ? { type: "listing_rejected", ...base, reason: decision.reason }
          : { type: "listing_changes_requested", ...base, note: decision.note }
    )
  }

  // --- Yardımcılar --------------------------------------------------------------------------------------------

  /** Kart sorgusunun temeli: tür, il, ilçe ve kapak fotoğrafı birleştirilmiş (favoriler modülü de kullanır). */
  cardQuery() {
    return this.db
      .select(cardColumns)
      .from(listing)
      .leftJoin(species, eq(species.id, listing.speciesId))
      .leftJoin(city, eq(city.id, listing.cityId))
      .leftJoin(district, eq(district.id, listing.districtId))
      .leftJoin(listingImage, and(eq(listingImage.listingId, listing.id), eq(listingImage.isCover, true)))
      .$dynamic()
  }

  /** Detay için tek satır: ilan + tür/il/ilçe/ırk + sahibi. */
  private async detailRow(condition: SQL | undefined) {
    const [row] = await this.db
      .select({
        l: listing,
        speciesName: species.name,
        speciesSlug: species.slug,
        cityName: city.name,
        citySlug: city.slug,
        districtName: district.name,
        breedName: breed.name,
        breedSlug: breed.slug,
        cover: listingImage.url,
        owner: {
          id: user.id,
          name: user.name,
          image: user.image,
          role: user.role,
          phone: user.phone,
          createdAt: user.createdAt,
        },
      })
      .from(listing)
      .innerJoin(user, eq(user.id, listing.ownerId))
      .leftJoin(species, eq(species.id, listing.speciesId))
      .leftJoin(breed, eq(breed.id, listing.breedId))
      .leftJoin(city, eq(city.id, listing.cityId))
      .leftJoin(district, eq(district.id, listing.districtId))
      .leftJoin(listingImage, and(eq(listingImage.listingId, listing.id), eq(listingImage.isCover, true)))
      .where(and(condition, isNull(listing.deletedAt)))
    return row
  }

  /** Kart satırını yanıt biçimine çevirir (adlar istenen dilde, kapak herkese açık adres). */
  toCard(r: CardRow, locale: Locale): ListingCard {
    return {
      id: r.id,
      listingNo: r.listingNo,
      slug: r.slug,
      title: r.title,
      type: r.type,
      status: r.status,
      coverUrl: r.cover ? this.storage.publicUrl(r.cover) : null,
      gender: r.gender,
      vaccinated: r.vaccinated,
      neutered: r.neutered,
      species: r.speciesName && r.speciesSlug ? { name: localize(r.speciesName, locale), slug: r.speciesSlug } : null,
      city: r.cityName && r.citySlug ? { name: r.cityName, slug: r.citySlug } : null,
      district: r.districtName,
      publishedAt: iso(r.publishedAt),
      createdAt: r.createdAt.toISOString(),
    }
  }

  /** Detay ve sahibin görünümünde ortak alanlar. */
  private toDetailBase(row: NonNullable<Awaited<ReturnType<ListingsService["detailRow"]>>>, locale: Locale) {
    const l = row.l
    return {
      ...this.toCard(
        {
          ...l,
          speciesName: row.speciesName,
          speciesSlug: row.speciesSlug,
          cityName: row.cityName,
          citySlug: row.citySlug,
          districtName: row.districtName,
          cover: row.cover,
        },
        locale
      ),
      description: l.description,
      breed: row.breedName && row.breedSlug ? { name: localize(row.breedName, locale), slug: row.breedSlug } : null,
      name: l.name,
      gender: l.gender,
      ageGroup: l.ageGroup,
      size: l.size,
      vaccinated: l.vaccinated,
      neutered: l.neutered,
      microchipped: l.microchipped,
      childFriendly: l.childFriendly,
      source: l.source,
      lastSeenAddress: l.lastSeenAddress,
      lastSeenLat: l.lastSeenLat,
      lastSeenLng: l.lastSeenLng,
      viewCount: l.viewCount,
    }
  }

  /** Liste filtreleri (slug'larla). Her zaman: yayında ve silinmemiş. */
  private filters(q: ListingQuery): Array<SQL | undefined> {
    const anyOf = <T extends string>(column: Parameters<typeof inArray>[0], values: T[] | undefined) =>
      values?.length ? inArray(column, values) : undefined
    return [
      eq(listing.status, "active"),
      isNull(listing.deletedAt),
      anyOf(listing.type, q.type),
      q.species ? eq(species.slug, q.species) : undefined,
      q.breed ? eq(breed.slug, q.breed) : undefined,
      q.city ? eq(city.slug, q.city) : undefined,
      q.district ? eq(district.slug, q.district) : undefined,
      anyOf(listing.gender, q.gender),
      anyOf(listing.ageGroup, q.ageGroup),
      anyOf(listing.size, q.size),
      anyOf(listing.source, q.source),
      ...(q.features ?? []).map((f) => eq(listing[f], true)),
      q.q ? sql`${listing.searchVector} @@ websearch_to_tsquery('turkish', ${q.q})` : undefined,
    ]
  }

  /** İlan numarası (rakamlar) ya da uuid ile arama koşulu. */
  refCondition(ref: string): SQL {
    return /^\d+$/.test(ref) ? eq(listing.listingNo, Number(ref)) : eq(listing.id, ref)
  }

  /** Form gövdesini sütunlara çevirir: boşlar null; konum yalnız kayıp/bulunanda; çip numarası yalnız mikroçipliyse. */
  private columns(body: SaveListing) {
    const hasLocation = LOCATION_TYPES.includes(body.type)
    return {
      type: body.type,
      title: body.title ?? null,
      slug: body.title ? slugify(body.title) : null,
      description: body.description ?? null,
      speciesId: body.speciesId ?? null,
      breedId: body.breedId ?? null,
      name: body.name ?? null,
      gender: body.gender,
      ageGroup: body.ageGroup ?? null,
      size: body.size ?? null,
      vaccinated: body.vaccinated,
      neutered: body.neutered,
      microchipped: body.microchipped,
      microchipNumber: body.microchipped ? (body.microchipNumber ?? null) : null,
      childFriendly: body.childFriendly,
      source: body.source ?? null,
      cityId: body.cityId ?? null,
      districtId: body.districtId ?? null,
      lastSeenAddress: hasLocation ? (body.lastSeenAddress ?? null) : null,
      lastSeenLat: hasLocation ? (body.lastSeenLat ?? null) : null,
      lastSeenLng: hasLocation ? (body.lastSeenLng ?? null) : null,
      showPhone: body.showPhone,
    }
  }

  /** İş kuralları: ırk türe, ilçe ile ait olmalı; telefon gösterilecekse profilde telefon olmalı; içerik filtresi. */
  private async validate(owner: SessionUser, body: SaveListing): Promise<void> {
    const bad = (code: ErrorCode, field: string) =>
      new AppException(HttpStatus.BAD_REQUEST, code, "Geçersiz alan.", { field })

    if (body.speciesId) {
      const [s] = await this.db
        .select({ id: species.id })
        .from(species)
        .where(and(eq(species.id, body.speciesId), isNull(species.deletedAt)))
      if (!s) throw bad(ErrorCode.SPECIES_INVALID, "speciesId")
    }
    if (body.breedId) {
      const [b] = await this.db.select({ speciesId: breed.speciesId }).from(breed).where(eq(breed.id, body.breedId))
      if (!b || b.speciesId !== body.speciesId) throw bad(ErrorCode.BREED_MISMATCH, "breedId")
    }
    if (body.cityId) {
      const [c] = await this.db.select({ id: city.id }).from(city).where(eq(city.id, body.cityId))
      if (!c) throw bad(ErrorCode.CITY_INVALID, "cityId")
    }
    if (body.districtId) {
      const [d] = await this.db
        .select({ cityId: district.cityId })
        .from(district)
        .where(eq(district.id, body.districtId))
      if (!d || d.cityId !== body.cityId) throw bad(ErrorCode.DISTRICT_MISMATCH, "districtId")
    }
    if (body.showPhone && !owner.phone) throw bad(ErrorCode.PHONE_REQUIRED, "showPhone")

    await this.moderation.assertAllowed("listing", owner.id, {
      title: body.title,
      description: body.description,
      name: body.name,
      lastSeenAddress: LOCATION_TYPES.includes(body.type) ? body.lastSeenAddress : null,
    })
  }

  /** Sahibinin silinmemiş ilanı; yoksa ya da başkasınınsa 404 (varlığı sızdırılmaz). */
  private async findOwned(ownerId: string, id: string) {
    const [row] = await this.db
      .select({ status: listing.status, type: listing.type, listingNo: listing.listingNo, title: listing.title })
      .from(listing)
      .where(and(eq(listing.id, id), eq(listing.ownerId, ownerId), isNull(listing.deletedAt)))
    if (!row) throw this.notFound()
    return row
  }

  /** Kuyruktaki ilanların gönderenleri. */
  async ownerSummaries(ids: string[]) {
    if (!ids.length) return new Map<string, { id: string; name: string; email: string }>()
    const rows = await this.db
      .select({ listingId: listing.id, id: user.id, name: user.name, email: user.email })
      .from(listing)
      .innerJoin(user, eq(user.id, listing.ownerId))
      .where(inArray(listing.id, ids))
    return new Map(rows.map((r) => [r.listingId, { id: r.id, name: r.name, email: r.email }]))
  }

  /** Denetim kaydı (admin işlemleri; yalnızca eklenir). */
  private async audit(actorId: string, action: string, entityId: string, diff?: object): Promise<void> {
    await this.db
      .insert(auditLog)
      .values({ actorId, action, entity: "listing", entityId, diff: diff as Record<string, unknown> })
  }

  /** E-postası doğrulanmamış kullanıcı ilan veremez/düzenleyemez. */
  private ensureVerified(owner: SessionUser): void {
    if (!owner.emailVerified) {
      throw new AppException(HttpStatus.FORBIDDEN, ErrorCode.EMAIL_NOT_VERIFIED, "E-posta adresiniz doğrulanmamış.")
    }
  }

  /** Durum geçişi sonucunu açar; geçersizse kodlu hata fırlatır (409). */
  private unwrap(result: TransitionResult): ListingStatus {
    if (result.ok) return result.status
    throw new AppException(HttpStatus.CONFLICT, ErrorCode[result.error], "Bu işlem ilanın şu anki durumunda yapılamaz.")
  }

  /** "İlan bulunamadı" (404) hatası; yetkisiz erişimde de bu döner ki ilanın varlığı sızmasın. */
  notFound() {
    return new AppException(HttpStatus.NOT_FOUND, ErrorCode.NOT_FOUND, "İlan bulunamadı.")
  }
}
