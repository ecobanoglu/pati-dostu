import { HttpStatus, Injectable } from "@nestjs/common"
import { auditLog, city, type Database, listing, notification, organization, session, user } from "@pati-dostu/db"
import { ADMIN_USERS_PAGE_SIZE, type AdminUsersQuery } from "@pati-dostu/validators"
import { and, count, desc, eq, ilike, isNotNull, isNull, ne, or, type SQL, sql } from "drizzle-orm"

import type { AuthSession } from "../auth/auth.js"
import { AppException, ErrorCode } from "../common/errors.js"
import { InjectDb } from "../database/database.module.js"
import type { AdminUserDetail, AdminUserPage, AdminUserRow } from "./admin-users.dto.js"

type SessionUser = AuthSession["user"]

/** UTF-8 bayt sırası işareti: Excel dosyayı UTF-8 olarak açsın (Türkçe karakterler). */
const BOM = String.fromCharCode(0xfeff)
/** CSV dışa aktarmada en fazla satır. */
const CSV_MAX = 10_000
// Alt sorgularda dış tablonun kimliği açıkça yazılır (Drizzle tek tablolu sorguda tablo adını atlayabilir).
const U_ID = sql.raw('"user"."id"')

/** ILIKE kalıbında `%` ve `_` düz karakter olsun. */
const likeEscape = (q: string) => q.replace(/[\\%_]/g, (c) => `\\${c}`)

/** Kullanıcı ya da içerikleri (ilan, yorum, konu, cevap) hakkındaki şikâyet sayısı (dış sorgudaki kullanıcı için). */
const reportsAgainst = sql<number>`(select count(*)::int from report r where
  (r.target_type = 'user' and r.target_id = ${U_ID})
  or (r.target_type = 'listing' and r.target_id in (select l.id::text from listing l where l.owner_id = ${U_ID}))
  or (r.target_type = 'comment' and r.target_id in (select c.id::text from listing_comment c where c.author_id = ${U_ID}))
  or (r.target_type = 'topic' and r.target_id in (select t.id::text from forum_topic t where t.author_id = ${U_ID}))
  or (r.target_type = 'reply' and r.target_id in (select y.id::text from forum_reply y where y.author_id = ${U_ID})))`
/** Gönderilmiş (taslak değil), silinmemiş ilan sayısı. */
const listingCount = sql<number>`(select count(*)::int from listing l where l.owner_id = ${U_ID} and l.deleted_at is null and l.status <> 'draft')`
/** Askı şu an geçerli mi (süresi dolmamış). */
const banActive = sql<boolean>`(${user.banned} and (${user.banExpires} is null or ${user.banExpires} > now()))`

/**
 * Admin › Kullanıcılar (5. aşama 5. adım): liste (ad / e-posta / telefon araması, rol, durum), ayrıntı (ilanlar,
 * şikâyetler, uyarılar, yaptırım geçmişi, kurum kaydı), rol değiştirme (yalnız Üye ↔ Admin — karar; kendi rolünü ve
 * son admin'i düşüremez) ve CSV dışa aktarma. Uyarı / askıya alma / askıyı kaldırma `UserModerationService` ile.
 */
@Injectable()
export class AdminUsersService {
  constructor(@InjectDb() private readonly db: Database) {}

  /** Liste: en yeni kayıt önce, 20'şer. */
  async list(q: AdminUsersQuery): Promise<AdminUserPage> {
    const where = this.where(q)
    const [rows, [total]] = await Promise.all([
      this.rows(where)
        .limit(ADMIN_USERS_PAGE_SIZE)
        .offset((q.page - 1) * ADMIN_USERS_PAGE_SIZE),
      this.db.select({ value: count() }).from(user).where(where),
    ])
    return {
      items: rows.map((r) => this.toRow(r)),
      total: total?.value ?? 0,
      page: q.page,
      pageSize: ADMIN_USERS_PAGE_SIZE,
    }
  }

  /** CSV (geçerli süzgeçlerle, en fazla 10.000 satır): Excel Türkçe karakterleri doğru açsın diye UTF-8 BOM. */
  async csv(q: AdminUsersQuery): Promise<string> {
    const rows = (await this.rows(this.where(q)).limit(CSV_MAX)).map((r) => this.toRow(r))
    const roleLabel = { user: "Üye", clinic: "Klinik", shelter: "Barınak", admin: "Admin" }
    const cell = (v: string | number) => {
      const s = String(v)
      // Formül enjeksiyonuna karşı (=, +, -, @ ile başlayan hücreler) başa tek tırnak.
      const safe = /^[=+\-@]/.test(s) ? `'${s}` : s
      return /[;"\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
    }
    const lines = [
      ["Ad", "E-posta", "Rol", "Şehir", "İlan", "Şikayet", "Kayıt", "Durum"].join(";"),
      ...rows.map((r) =>
        [
          r.name,
          r.email,
          roleLabel[r.role],
          r.city ?? "",
          r.listings,
          r.reports,
          r.createdAt.slice(0, 10),
          r.deleted ? "Silinmiş" : r.banned ? "Askıda" : "Etkin",
        ]
          .map(cell)
          .join(";")
      ),
    ]
    return `${BOM}${lines.join("\r\n")}\r\n`
  }

  /** Ayrıntı: profil, ilan sayıları ve son ilanlar, şikâyetler, uyarılar, yaptırım geçmişi, kurum kaydı. */
  async detail(id: string): Promise<AdminUserDetail> {
    const [row] = await this.rows(eq(user.id, id))
    if (!row) throw new AppException(HttpStatus.NOT_FOUND, ErrorCode.NOT_FOUND, "Kullanıcı bulunamadı.")
    const actor = this.db.$with("actor").as(this.db.select({ id: user.id, name: user.name }).from(user))
    const [extra, byStatus, recent, warnings, history, [org], [lastSeen]] = await Promise.all([
      this.db
        .select({ emailVerified: user.emailVerified, phone: user.phone, bio: user.bio, banReason: user.banReason })
        .from(user)
        .where(eq(user.id, id)),
      this.db
        .select({ status: listing.status, value: count() })
        .from(listing)
        .where(and(eq(listing.ownerId, id), isNull(listing.deletedAt), ne(listing.status, "draft")))
        .groupBy(listing.status),
      this.db
        .select({
          id: listing.id,
          no: listing.listingNo,
          title: listing.title,
          slug: listing.slug,
          status: listing.status,
        })
        .from(listing)
        .where(and(eq(listing.ownerId, id), isNull(listing.deletedAt), ne(listing.status, "draft")))
        .orderBy(desc(listing.createdAt))
        .limit(5),
      this.db
        .select({ payload: notification.payload, createdAt: notification.createdAt })
        .from(notification)
        .where(and(eq(notification.userId, id), eq(notification.type, "user_warned")))
        .orderBy(desc(notification.createdAt)),
      this.db
        .with(actor)
        .select({ action: auditLog.action, diff: auditLog.diff, createdAt: auditLog.createdAt, actorName: actor.name })
        .from(auditLog)
        .leftJoin(actor, eq(actor.id, auditLog.actorId))
        .where(and(eq(auditLog.entity, "user"), eq(auditLog.entityId, id)))
        .orderBy(desc(auditLog.createdAt))
        .limit(20),
      this.db
        .select({ name: organization.name, type: organization.type, status: organization.status })
        .from(organization)
        .where(and(eq(organization.userId, id), isNull(organization.deletedAt))),
      this.db
        .select({ at: sql<Date | null>`max(${session.updatedAt})` })
        .from(session)
        .where(eq(session.userId, id)),
    ])
    const e = extra[0]!
    return {
      ...this.toRow(row),
      emailVerified: e.emailVerified,
      phone: e.phone,
      bio: e.bio,
      banReason: e.banReason,
      lastSeenAt: lastSeen?.at ? new Date(lastSeen.at).toISOString() : null,
      listingsByStatus: Object.fromEntries(byStatus.map((b) => [b.status, b.value])),
      recentListings: recent.map((l) => ({ ...l, title: l.title ?? "" })),
      warnings: warnings.map((w) => ({
        reason: typeof w.payload.reason === "string" ? w.payload.reason : "other",
        title: typeof w.payload.title === "string" ? w.payload.title : "",
        createdAt: w.createdAt.toISOString(),
      })),
      history: history.map((h) => ({
        action: h.action,
        detail: h.diff && typeof h.diff === "object" ? (h.diff as Record<string, unknown>) : {},
        actorName: h.actorName ?? "—",
        createdAt: h.createdAt.toISOString(),
      })),
      organization: org ?? null,
    }
  }

  /**
   * Rol değiştir: yalnız Üye ↔ Admin. Klinik / barınak hesabının rolü buradan değişmez (kurum başvurusuyla gelir),
   * admin kendi rolünü düşüremez, son admin düşürülemez. Admin'e çevrilen kullanıcının askısı varsa önce kaldırılmalı.
   */
  async setRole(admin: SessionUser, id: string, role: "user" | "admin"): Promise<void> {
    const [row] = await this.db
      .select({ role: user.role, banned: banActive })
      .from(user)
      .where(and(eq(user.id, id), isNull(user.deletedAt)))
    if (!row) throw new AppException(HttpStatus.NOT_FOUND, ErrorCode.NOT_FOUND, "Kullanıcı bulunamadı.")
    if (row.role === role) return
    const fail = (code: ErrorCode, message: string) => new AppException(HttpStatus.BAD_REQUEST, code, message)
    if (row.role === "clinic" || row.role === "shelter") {
      throw fail(ErrorCode.ROLE_CHANGE_NOT_ALLOWED, "Kurum hesabının rolü kurum başvurusuyla belirlenir.")
    }
    if (id === admin.id) throw fail(ErrorCode.ROLE_CHANGE_NOT_ALLOWED, "Kendi rolünüzü değiştiremezsiniz.")
    if (role === "admin" && row.banned) throw fail(ErrorCode.ROLE_CHANGE_NOT_ALLOWED, "Askıdaki hesap admin olamaz.")
    if (role === "user") {
      const [admins] = await this.db
        .select({ value: count() })
        .from(user)
        .where(and(eq(user.role, "admin"), isNull(user.deletedAt)))
      if ((admins?.value ?? 0) <= 1) throw fail(ErrorCode.ROLE_CHANGE_NOT_ALLOWED, "Son admin düşürülemez.")
    }
    await this.db.update(user).set({ role }).where(eq(user.id, id))
    await this.db.insert(auditLog).values({
      actorId: admin.id,
      action: "user.role",
      entity: "user",
      entityId: id,
      diff: { from: row.role, to: role },
    })
  }

  // --- Yardımcılar --------------------------------------------------------------------------------------------

  /** Süzgeç koşulu: arama (ad / e-posta / telefon), rol, durum (varsayılan: silinmişler hariç). */
  private where(q: AdminUsersQuery): SQL | undefined {
    const term = q.q?.trim()
    const like = term ? `%${likeEscape(term)}%` : null
    return and(
      like ? or(ilike(user.name, like), ilike(user.email, like), ilike(user.phone, like)) : undefined,
      q.role ? eq(user.role, q.role) : undefined,
      q.status === "deleted"
        ? isNotNull(user.deletedAt)
        : q.status === "banned"
          ? and(isNull(user.deletedAt), banActive)
          : q.status === "active"
            ? and(isNull(user.deletedAt), sql`not ${banActive}`)
            : isNull(user.deletedAt)
    )
  }

  /** Liste satırları (en yeni kayıt önce). */
  private rows(where: SQL | undefined) {
    return this.db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.role,
        cityName: city.name,
        createdAt: user.createdAt,
        deletedAt: user.deletedAt,
        banned: banActive,
        banExpires: user.banExpires,
        listings: listingCount,
        reports: reportsAgainst,
      })
      .from(user)
      .leftJoin(city, eq(city.id, user.cityId))
      .where(where)
      .orderBy(desc(user.createdAt), desc(user.id))
      .$dynamic()
  }

  /** Satırı yanıt biçimine çevirir. */
  private toRow(r: Awaited<ReturnType<AdminUsersService["rows"]>>[number]): AdminUserRow {
    return {
      id: r.id,
      name: r.name,
      email: r.email,
      image: r.image,
      role: r.role as AdminUserRow["role"],
      city: r.cityName ?? null,
      createdAt: r.createdAt.toISOString(),
      deleted: r.deletedAt !== null,
      banned: Boolean(r.banned),
      banExpires: r.banned && r.banExpires ? r.banExpires.toISOString() : null,
      listings: Number(r.listings),
      reports: Number(r.reports),
    }
  }
}
