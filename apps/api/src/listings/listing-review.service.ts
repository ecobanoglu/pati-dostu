import { HttpStatus, Injectable } from "@nestjs/common"
import { auditLog, type Database, listing, localize, rejectionReason, report, user } from "@pati-dostu/db"
import { type ReviewFlag, type ReviewQueueQuery, rejectListingSchema, warningFlags } from "@pati-dostu/validators"
import { and, asc, count, desc, eq, inArray, isNull, or, sql } from "drizzle-orm"
import type { z } from "zod"

import type { AuthSession } from "../auth/auth.js"
import { AppException, ErrorCode } from "../common/errors.js"
import { InjectDb } from "../database/database.module.js"
import { ModerationService } from "../moderation/moderation.service.js"
import type { ReviewInfo, ReviewQueue, ReviewQueueItem } from "./listings.dto.js"
import { ListingsService } from "./listings.service.js"

type SessionUser = AuthSession["user"]
type Locale = "tr" | "en"

/** Kuyrukta en fazla kaç ilan döner (MVP: tek liste, sayfalama yok). */
const QUEUE_MAX = 200
/** "Yeni üye": hesabı bu kadar günden yeni ve daha önce yayına girmiş ilanı yok. */
const NEW_USER_DAYS = 7
/** Benzer başlık eşiği (pg_trgm benzerliği). */
const SIMILAR_THRESHOLD = 0.6

// Alt sorgularda dış tablonun sütunları açıkça yazılır (Drizzle tek tablolu sorguda tablo adını atlayabilir).
const L_ID = sql.raw('"listing"."id"')
const L_OWNER = sql.raw('"listing"."owner_id"')
const L_TITLE = sql.raw('"listing"."title"')

/**
 * Admin › İlan onayı (5. aşama 2. adım): onay kuyruğu (basit otomatik kontrollerin işaretleriyle), bir ilanın
 * inceleme bilgisi (içerik taraması, ilan sahibinin geçmişi, önceki inceleme notu) ve hazır gerekçeli red. Kararın
 * kendisi (durum, bildirim, denetim kaydı) `ListingsService.review` ile.
 */
@Injectable()
export class ListingReviewService {
  constructor(
    @InjectDb() private readonly db: Database,
    private readonly listings: ListingsService,
    private readonly moderation: ModerationService
  ) {}

  /** Onay bekleyen ilanlar (en eski ya da en yeni önce), işaretler ve süzgeç sayıları. */
  async queue(q: ReviewQueueQuery): Promise<ReviewQueue> {
    const rows = await this.listings
      .cardQuery()
      .where(and(eq(listing.status, "pending"), isNull(listing.deletedAt)))
      .orderBy(q.sort === "newest" ? desc(listing.submittedAt) : asc(listing.submittedAt), asc(listing.id))
      .limit(QUEUE_MAX)
    const facts = await this.facts(rows.map((r) => r.id))
    const all: ReviewQueueItem[] = []
    for (const r of rows) {
      const f = facts.get(r.id)
      if (!f) continue
      all.push({
        ...this.listings.toCard(r, q.locale),
        submittedAt: r.submittedAt?.toISOString() ?? null,
        owner: { id: f.ownerId, name: f.ownerName, role: f.ownerRole },
        flags: f.flags,
      })
    }
    const isFlagged = (i: ReviewQueueItem) => i.flags.some((x) => warningFlags.includes(x))
    const pick = {
      all: () => true,
      flagged: isFlagged,
      organization: (i: ReviewQueueItem) => i.flags.includes("organization"),
      resubmitted: (i: ReviewQueueItem) => i.flags.includes("resubmitted"),
    }
    return {
      items: all.filter(pick[q.filter]),
      counts: {
        all: all.length,
        flagged: all.filter(pick.flagged).length,
        organization: all.filter(pick.organization).length,
        resubmitted: all.filter(pick.resubmitted).length,
      },
    }
  }

  /** Tek ilanın inceleme bilgisi (her durumda; admin önizleme için). Yoksa 404. */
  async info(id: string): Promise<ReviewInfo> {
    const f = (await this.facts([id])).get(id)
    if (!f) throw this.listings.notFound()
    const [[others], [reports], [rejections]] = await Promise.all([
      this.db
        .select({ value: count() })
        .from(listing)
        .where(and(eq(listing.ownerId, f.ownerId), isNull(listing.deletedAt), sql`${listing.id} <> ${id}`)),
      this.db
        .select({ value: count() })
        .from(report)
        .where(
          or(
            and(eq(report.targetType, "user"), eq(report.targetId, f.ownerId)),
            and(
              eq(report.targetType, "listing"),
              sql`${report.targetId} in (select l.id::text from listing l where l.owner_id = ${f.ownerId})`
            )
          )
        ),
      this.db
        .select({ value: count() })
        .from(auditLog)
        .where(
          and(
            eq(auditLog.action, "listing.reject"),
            sql`${auditLog.entityId} in (select l.id::text from listing l where l.owner_id = ${f.ownerId})`
          )
        ),
    ])
    return {
      status: f.status,
      submittedAt: f.submittedAt?.toISOString() ?? null,
      resubmitted: f.flags.includes("resubmitted"),
      previousNote: f.reviewNote ?? f.rejectionReason,
      previousFields: f.reviewFields,
      flags: f.flags,
      contentMatches: f.contentMatches,
      owner: {
        id: f.ownerId,
        name: f.ownerName,
        email: f.ownerEmail,
        emailVerified: f.ownerEmailVerified,
        role: f.ownerRole,
        createdAt: f.ownerCreatedAt.toISOString(),
        otherListings: others?.value ?? 0,
        reports: reports?.value ?? 0,
        rejections: rejections?.value ?? 0,
      },
    }
  }

  /** Etkin red gerekçeleri (istenen dilde, sırayla). */
  async reasons(locale: Locale) {
    const rows = await this.db
      .select({ id: rejectionReason.id, slug: rejectionReason.slug, label: rejectionReason.label })
      .from(rejectionReason)
      .where(and(eq(rejectionReason.active, true), isNull(rejectionReason.deletedAt)))
      .orderBy(asc(rejectionReason.sortOrder))
    return rows.map((r) => ({ id: r.id, slug: r.slug, label: localize(r.label, locale) }))
  }

  /**
   * Kullanıcıya giden gerekçe metni: seçilen hazır gerekçenin adı (ilan sahibinin dilinde) + " — " + not. Gerekçe
   * yoksa yalnız not (şema en az 10 karakter ister). Red ve admin silmesi kullanır.
   */
  async reasonText(listingId: string, input: z.output<typeof rejectListingSchema>): Promise<string> {
    let label: string | null = null
    if (input.reasonId) {
      const [row] = await this.db
        .select({ label: rejectionReason.label, locale: user.locale })
        .from(rejectionReason)
        .innerJoin(listing, eq(listing.id, listingId))
        .innerJoin(user, eq(user.id, listing.ownerId))
        .where(and(eq(rejectionReason.id, input.reasonId), isNull(rejectionReason.deletedAt)))
      if (!row) {
        throw new AppException(HttpStatus.BAD_REQUEST, ErrorCode.REASON_INVALID, "Red gerekçesi geçersiz.", {
          field: "reasonId",
        })
      }
      label = localize(row.label, row.locale as Locale)
    }
    return [label, input.note].filter(Boolean).join(" — ")
  }

  /** Reddet: gerekçe metni + `ListingsService.review` (durum, bildirim, denetim kaydı). */
  async reject(admin: SessionUser, id: string, input: z.output<typeof rejectListingSchema>): Promise<void> {
    await this.listings.review(admin, id, { kind: "reject", reason: await this.reasonText(id, input) })
  }

  /**
   * İlanların işaretleri ve inceleme için gereken bilgiler (tek sorgu + içerik taraması): sahibi, yeni üye mi,
   * aynı sahibin benzer başlıklı başka ilanı, daha önce incelenmiş mi, önceki not.
   */
  private async facts(ids: string[]) {
    const out = new Map<
      string,
      {
        status: string
        submittedAt: Date | null
        ownerId: string
        ownerName: string
        ownerEmail: string
        ownerEmailVerified: boolean
        ownerRole: "user" | "clinic" | "shelter" | "admin"
        ownerCreatedAt: Date
        reviewNote: string | null
        rejectionReason: string | null
        reviewFields: ReviewInfo["previousFields"]
        flags: ReviewFlag[]
        contentMatches: ReviewInfo["contentMatches"]
      }
    >()
    if (ids.length === 0) return out
    const rows = await this.db
      .select({
        id: listing.id,
        status: listing.status,
        submittedAt: listing.submittedAt,
        title: listing.title,
        description: listing.description,
        reviewNote: listing.reviewNote,
        rejectionReason: listing.rejectionReason,
        reviewFields: listing.reviewFields,
        ownerId: user.id,
        ownerName: user.name,
        ownerEmail: user.email,
        ownerEmailVerified: user.emailVerified,
        ownerRole: user.role,
        ownerCreatedAt: user.createdAt,
        publishedBefore: sql<boolean>`exists (select 1 from listing l2 where l2.owner_id = ${L_OWNER} and l2.id <> ${L_ID} and l2.published_at is not null)`,
        similar: sql<boolean>`exists (select 1 from listing l2 where l2.owner_id = ${L_OWNER} and l2.id <> ${L_ID} and l2.deleted_at is null and l2.title is not null and similarity(l2.title, ${L_TITLE}) > ${SIMILAR_THRESHOLD})`,
        reviewed: sql<boolean>`exists (select 1 from audit_log a where a.entity = 'listing' and a.entity_id = ${L_ID}::text and a.action in ('listing.approve', 'listing.reject', 'listing.request_changes'))`,
      })
      .from(listing)
      .innerJoin(user, eq(user.id, listing.ownerId))
      .where(inArray(listing.id, ids))
    const newSince = Date.now() - NEW_USER_DAYS * 86_400_000
    await Promise.all(
      rows.map(async (r) => {
        const contentMatches = await this.moderation.inspect({ title: r.title, description: r.description })
        const flags: ReviewFlag[] = []
        if (r.ownerCreatedAt.getTime() > newSince && !r.publishedBefore) flags.push("new_user")
        if (contentMatches.length > 0) flags.push("content")
        if (r.similar) flags.push("similar")
        if (r.ownerRole === "clinic" || r.ownerRole === "shelter") flags.push("organization")
        if (r.reviewed) flags.push("resubmitted")
        out.set(r.id, {
          status: r.status,
          submittedAt: r.submittedAt,
          ownerId: r.ownerId,
          ownerName: r.ownerName,
          ownerEmail: r.ownerEmail,
          ownerEmailVerified: r.ownerEmailVerified,
          ownerRole: r.ownerRole as "user" | "clinic" | "shelter" | "admin",
          ownerCreatedAt: r.ownerCreatedAt,
          reviewNote: r.reviewNote,
          rejectionReason: r.rejectionReason,
          reviewFields: (r.reviewFields as ReviewInfo["previousFields"]) ?? null,
          flags,
          contentMatches,
        })
      })
    )
    return out
  }
}
