import { HttpStatus, Injectable } from "@nestjs/common"
import { auditLog, type Database, favorite, listing, user } from "@pati-dostu/db"
import {
  ADMIN_LISTINGS_PAGE_SIZE,
  type AdminListingsQuery,
  adminListingStatuses,
  type rejectListingSchema,
} from "@pati-dostu/validators"
import { and, asc, count, desc, eq, ilike, inArray, isNull, ne, or, sql } from "drizzle-orm"
import type { z } from "zod"

import type { AuthSession } from "../auth/auth.js"
import { AppException, ErrorCode } from "../common/errors.js"
import { InjectDb } from "../database/database.module.js"
import { NotificationsService } from "../notifications/notifications.service.js"
import { ListingReviewService } from "./listing-review.service.js"
import type { AdminListingPage } from "./listings.dto.js"
import { ListingsService } from "./listings.service.js"

type SessionUser = AuthSession["user"]

/** ILIKE kalıbında `%` ve `_` düz karakter olsun. */
const likeEscape = (q: string) => q.replace(/[\\%_]/g, (c) => `\\${c}`)

/**
 * Admin › İlanlar (5. aşama 3. adım): gönderilmiş tüm ilanlar (taslaklar hariç — karar), arama ve süzgeçler;
 * yayından kaldırma (kapatma, gerekçesiz — karar) ve gerekçeli silme. Her işlem denetim kaydına yazılır, ilan
 * sahibine bildirim gider.
 */
@Injectable()
export class AdminListingsService {
  constructor(
    @InjectDb() private readonly db: Database,
    private readonly listings: ListingsService,
    private readonly review: ListingReviewService,
    private readonly notifications: NotificationsService
  ) {}

  /** Liste: durum, tür, arama (ilan no / başlık / sahibin adı ya da e-postası), sıralama, sayfa; durum sayıları. */
  async list(q: AdminListingsQuery): Promise<AdminListingPage> {
    const term = q.q?.trim()
    const no = term?.match(/^(?:pd-?)?(\d+)$/i)?.[1]
    const search = term
      ? no
        ? eq(listing.listingNo, Number(no))
        : or(
            ilike(listing.title, `%${likeEscape(term)}%`),
            ilike(user.name, `%${likeEscape(term)}%`),
            ilike(user.email, `%${likeEscape(term)}%`)
          )
      : undefined
    const base = and(
      isNull(listing.deletedAt),
      inArray(listing.status, [...adminListingStatuses]),
      q.type ? eq(listing.type, q.type) : undefined,
      search
    )
    const where = and(base, q.status ? eq(listing.status, q.status) : undefined)
    const sortDate = sql`coalesce(${listing.submittedAt}, ${listing.createdAt})`
    const order =
      q.sort === "views"
        ? [desc(listing.viewCount), desc(sortDate)]
        : q.sort === "old"
          ? [asc(sortDate), asc(listing.id)]
          : [desc(sortDate), desc(listing.id)]
    const [rows, [total], byStatus] = await Promise.all([
      this.listings
        .cardQuery()
        .innerJoin(user, eq(user.id, listing.ownerId))
        .where(where)
        .orderBy(...order)
        .limit(ADMIN_LISTINGS_PAGE_SIZE)
        .offset((q.page - 1) * ADMIN_LISTINGS_PAGE_SIZE),
      this.db.select({ value: count() }).from(listing).innerJoin(user, eq(user.id, listing.ownerId)).where(where),
      this.db
        .select({ status: listing.status, value: count() })
        .from(listing)
        .innerJoin(user, eq(user.id, listing.ownerId))
        .where(base)
        .groupBy(listing.status),
    ])
    const ids = rows.map((r) => r.id)
    const [owners, extras] = await Promise.all([
      this.listings.ownerSummaries(ids),
      ids.length
        ? this.db
            .select({ id: listing.id, viewCount: listing.viewCount, updatedAt: listing.updatedAt })
            .from(listing)
            .where(inArray(listing.id, ids))
        : Promise.resolve([]),
    ])
    const extra = new Map(extras.map((e) => [e.id, e]))
    const statusCount = (s: string) => byStatus.find((r) => r.status === s)?.value ?? 0
    return {
      items: rows.map((r) => ({
        ...this.listings.toCard(r, q.locale),
        owner: owners.get(r.id) ?? { id: "", name: "", email: "" },
        submittedAt: r.submittedAt?.toISOString() ?? null,
        viewCount: extra.get(r.id)?.viewCount ?? 0,
        updatedAt: (extra.get(r.id)?.updatedAt ?? r.createdAt).toISOString(),
      })),
      total: total?.value ?? 0,
      page: q.page,
      pageSize: ADMIN_LISTINGS_PAGE_SIZE,
      counts: {
        all: byStatus.reduce((n, r) => n + r.value, 0),
        pending: statusCount("pending"),
        active: statusCount("active"),
        changes_requested: statusCount("changes_requested"),
        rejected: statusCount("rejected"),
        adopted: statusCount("adopted"),
        closed: statusCount("closed"),
      },
    }
  }

  /**
   * Yayından kaldır: yalnız yayındaki ilan "Kapatıldı" olur (sahibi yeniden yayına alamaz). Sahibine kısa bildirim,
   * favoriye ekleyenlere "yayından kaldırıldı" bildirimi (sahibinin kapatmasıyla aynı).
   */
  async close(admin: SessionUser, id: string): Promise<void> {
    const row = await this.find(id)
    if (row.status !== "active") {
      throw new AppException(HttpStatus.CONFLICT, ErrorCode.LISTING_STATUS_INVALID, "İlan yayında değil.")
    }
    await this.db.update(listing).set({ status: "closed", closedAt: new Date() }).where(eq(listing.id, id))
    await this.audit(admin.id, "listing.admin_close", id)
    const base = { listingId: id, listingNo: row.listingNo, title: row.title ?? "" }
    await this.notifications.notify(row.ownerId, { type: "listing_closed_by_admin", ...base })
    const fans = await this.db
      .select({ userId: favorite.userId })
      .from(favorite)
      .where(and(eq(favorite.listingId, id), ne(favorite.userId, row.ownerId)))
    await this.notifications.notify(
      fans.map((f) => f.userId),
      { type: "favorite_closed", listingNo: row.listingNo, title: row.title ?? "", outcome: "closed" }
    )
  }

  /** Sil (yumuşak): hazır gerekçe ve/veya not; sahibine gerekçeli bildirim + e-posta (karar). Her durumda. */
  async remove(admin: SessionUser, id: string, input: z.output<typeof rejectListingSchema>): Promise<void> {
    const row = await this.find(id)
    const reason = await this.review.reasonText(id, input)
    await this.db.update(listing).set({ deletedAt: new Date() }).where(eq(listing.id, id))
    await this.audit(admin.id, "listing.delete", id, { reason })
    await this.notifications.notify(row.ownerId, {
      type: "listing_removed",
      listingId: id,
      listingNo: row.listingNo,
      title: row.title ?? "",
      reason,
    })
  }

  /** Silinmemiş, gönderilmiş ilanı bulur (taslak ve silinmiş → 404). */
  private async find(id: string) {
    const [row] = await this.db
      .select({ status: listing.status, ownerId: listing.ownerId, listingNo: listing.listingNo, title: listing.title })
      .from(listing)
      .where(and(eq(listing.id, id), isNull(listing.deletedAt), ne(listing.status, "draft")))
    if (!row) throw this.listings.notFound()
    return row
  }

  /** Denetim kaydı (yalnızca eklenir). */
  private async audit(actorId: string, action: string, entityId: string, diff?: object): Promise<void> {
    await this.db
      .insert(auditLog)
      .values({ actorId, action, entity: "listing", entityId, diff: diff as Record<string, unknown> })
  }
}
