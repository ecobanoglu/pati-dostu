import { HttpStatus, Injectable } from "@nestjs/common"
import {
  auditLog,
  type Database,
  forumCategory,
  forumReply,
  forumTopic,
  listing,
  listingComment,
  notification,
  rejectionReason,
  report,
  user,
} from "@pati-dostu/db"
import type { AdminReportsQuery, ReportTarget, resolveReportSchema } from "@pati-dostu/validators"
import { and, asc, count, desc, eq, inArray, isNull, ne, sql } from "drizzle-orm"
import type { z } from "zod"

import type { AuthSession } from "../auth/auth.js"
import { AppException, ErrorCode } from "../common/errors.js"
import { CommentsService } from "../comments/comments.service.js"
import { InjectDb } from "../database/database.module.js"
import { ForumService } from "../forum/forum.service.js"
import { AdminListingsService } from "../listings/admin-listings.service.js"
import { NotificationsService } from "../notifications/notifications.service.js"
import { UserModerationService } from "../users/user-moderation.service.js"
import type { ReportCase, ReportCasePage } from "./admin-reports.dto.js"

type SessionUser = AuthSession["user"]

/** Sayfa boyutu (dosya sayısı). */
const PAGE_SIZE = 20
/** Şikâyet nedeni → ilan silinirken kullanılan hazır red gerekçesi (slug). */
const REMOVE_REASON: Record<string, string> = {
  sale: "satis",
  fake: "yaniltici",
  fake_account: "yaniltici",
  animal_abuse: "uygunsuz",
  inappropriate: "uygunsuz",
  harassment: "uygunsuz",
}

/** Hedefin içeriği ve sahibi (dosya ayrıntısı ve listedeki özet için). */
type TargetInfo = {
  /** Görünen başlık: ilan / konu başlığı, yorum ve cevapta metnin başı, kullanıcıda ad. */
  title: string
  /** Yorum / cevap / konu metni (kısaltılmamış); ilan ve kullanıcıda null. */
  body: string | null
  /** İçeriğin sahibi (yaptırımın uygulanacağı kişi). */
  subjectId: string | null
  subjectName: string
  /** İçerik hâlâ yerinde mi (silinmiş / kapatılmış değil). */
  live: boolean
  /** Bağlam: ilan (no, slug, başlık, durum) ya da konu (slug, kategori, başlık). */
  listing: { no: number; slug: string | null; title: string; status: string } | null
  topic: { slug: string; categorySlug: string; title: string } | null
}

/**
 * Admin › Şikayetler (5. aşama 4. adım): şikâyetler hedef başına tek "dosya" olarak toplanır (aynı içerik birden çok
 * kez şikâyet edilirse tek kayıt). Açık dosyalar en eski önce; sonuçlananlar en yeni önce. Sonuçlandırma: içeriği
 * kaldır (ilanda kapat / sil), içerik sahibini uyar, hesabı askıya al — en az biri; ya da asılsız say. Şikâyet edenlere
 * sonuç site içinde bildirilir (kimin şikâyet ettiği karşı tarafa gösterilmez). Her karar denetim kaydına yazılır.
 */
@Injectable()
export class AdminReportsService {
  constructor(
    @InjectDb() private readonly db: Database,
    private readonly listings: AdminListingsService,
    private readonly comments: CommentsService,
    private readonly forum: ForumService,
    private readonly users: UserModerationService,
    private readonly notifications: NotificationsService
  ) {}

  /** Dosya listesi: durum (açık / sonuçlanan), hedef türü, sayfa; sekme ve tür sayıları. */
  async list(q: AdminReportsQuery): Promise<ReportCasePage> {
    const statusWhere = q.status === "open" ? eq(report.status, "open") : ne(report.status, "open")
    const where = and(statusWhere, q.target ? eq(report.targetType, q.target) : undefined)
    const firstAt = sql<Date>`min(${report.createdAt})`
    const lastAt = sql<Date>`max(${report.updatedAt})`
    const [rows, total, openCases, closedCases, byTarget] = await Promise.all([
      this.db
        .select({
          targetType: report.targetType,
          targetId: report.targetId,
          reports: count(),
          reasons: sql<string[]>`array_agg(${report.reason}::text order by ${report.createdAt})`,
          firstAt,
          lastAt,
          dismissed: sql<boolean>`bool_and(${report.status} = 'dismissed')`,
        })
        .from(report)
        .where(where)
        .groupBy(report.targetType, report.targetId)
        .orderBy(q.status === "open" ? asc(firstAt) : desc(lastAt))
        .limit(PAGE_SIZE)
        .offset((q.page - 1) * PAGE_SIZE),
      this.caseCount(where),
      this.caseCount(eq(report.status, "open")),
      this.caseCount(ne(report.status, "open")),
      this.db
        .select({ targetType: report.targetType, value: sql<number>`count(distinct ${report.targetId})::int` })
        .from(report)
        .where(statusWhere)
        .groupBy(report.targetType),
    ])
    const infos = await Promise.all(rows.map((r) => this.targetInfo(r.targetType, r.targetId)))
    return {
      items: rows.map((r, i) => {
        const info = infos[i]!
        return {
          targetType: r.targetType,
          targetId: r.targetId,
          reason: topReason(r.reasons),
          reasons: [...new Set(r.reasons)],
          reports: r.reports,
          firstAt: new Date(r.firstAt).toISOString(),
          lastAt: new Date(r.lastAt).toISOString(),
          outcome: q.status === "open" ? null : r.dismissed ? "no_violation" : "action_taken",
          title: info.title,
          subjectName: info.subjectName,
          listingNo: info.listing?.no ?? null,
        }
      }),
      total,
      page: q.page,
      pageSize: PAGE_SIZE,
      counts: {
        open: openCases,
        closed: closedCases,
        byTarget: Object.fromEntries(byTarget.map((b) => [b.targetType, b.value])) as Record<string, number>,
      },
    }
  }

  /** Dosya ayrıntısı: hedef içeriği, şikâyetler (notlarıyla), içerik sahibi ve geçmişi, ilgili kayıtlar. */
  async detail(targetType: ReportTarget, targetId: string): Promise<ReportCase> {
    const reports = await this.db
      .select({
        id: report.id,
        reason: report.reason,
        details: report.details,
        status: report.status,
        resolutionNote: report.resolutionNote,
        createdAt: report.createdAt,
        updatedAt: report.updatedAt,
        reporterId: user.id,
        reporterName: user.name,
      })
      .from(report)
      .innerJoin(user, eq(user.id, report.reporterId))
      .where(and(eq(report.targetType, targetType), eq(report.targetId, targetId)))
      .orderBy(asc(report.createdAt))
    if (reports.length === 0) throw new AppException(HttpStatus.NOT_FOUND, ErrorCode.NOT_FOUND, "Şikâyet yok.")
    const info = await this.targetInfo(targetType, targetId)
    const open = reports.filter((r) => r.status === "open")
    return {
      targetType,
      targetId,
      open: open.length > 0,
      reason: topReason((open.length ? open : reports).map((r) => r.reason)),
      title: info.title,
      body: info.body,
      live: info.live,
      listing: info.listing,
      topic: info.topic,
      reports: reports.map((r) => ({
        id: r.id,
        reason: r.reason,
        details: r.details,
        status: r.status,
        resolutionNote: r.resolutionNote,
        createdAt: r.createdAt.toISOString(),
        reporter: { id: r.reporterId, name: r.reporterName },
      })),
      subject: info.subjectId ? await this.subject(info.subjectId) : null,
    }
  }

  /** Seçili işlemleri uygular ve açık şikâyetleri "çözüldü" yapar; şikâyet edenlere sonuç bildirilir. */
  async resolve(
    admin: SessionUser,
    targetType: ReportTarget,
    targetId: string,
    input: z.output<typeof resolveReportSchema>
  ): Promise<void> {
    const open = await this.openReports(targetType, targetId)
    const info = await this.targetInfo(targetType, targetId)
    const reason = topReason(open.map((r) => r.reason))
    if ((input.warn || input.ban !== "none") && !info.subjectId) {
      throw new AppException(HttpStatus.BAD_REQUEST, ErrorCode.NOT_FOUND, "İçerik sahibi bulunamadı.")
    }
    const actions: string[] = []
    if (input.removeContent && info.live) {
      await this.removeContent(admin, targetType, targetId, input.listingAction, reason, info)
      actions.push(targetType === "listing" ? `listing.${input.listingAction}` : `${targetType}.remove`)
    }
    if (input.warn && info.subjectId) {
      await this.users.warn(admin.id, info.subjectId, reason, { targetType, title: info.title })
      actions.push("warn")
    }
    if (input.ban !== "none" && info.subjectId) {
      await this.users.ban(admin.id, info.subjectId, input.ban, `report:${reason}`)
      actions.push(`ban.${input.ban}`)
    }
    await this.close(admin, open, "resolved", input.note, info, targetType, { actions })
  }

  /** Asılsız say: açık şikâyetler "asılsız" olur, içerikte değişiklik yapılmaz. */
  async dismiss(admin: SessionUser, targetType: ReportTarget, targetId: string, note?: string): Promise<void> {
    const open = await this.openReports(targetType, targetId)
    const info = await this.targetInfo(targetType, targetId)
    await this.close(admin, open, "dismissed", note, info, targetType, {})
  }

  // --- Yardımcılar --------------------------------------------------------------------------------------------

  /** Dosya sayısı (hedef başına bir). */
  private async caseCount(where: ReturnType<typeof and>): Promise<number> {
    const [row] = await this.db
      .select({ value: sql<number>`count(distinct (${report.targetType}, ${report.targetId}))::int` })
      .from(report)
      .where(where)
    return row?.value ?? 0
  }

  /** Hedefin açık şikâyetleri; yoksa 409. */
  private async openReports(targetType: ReportTarget, targetId: string) {
    const rows = await this.db
      .select({ id: report.id, reason: report.reason, reporterId: report.reporterId })
      .from(report)
      .where(and(eq(report.targetType, targetType), eq(report.targetId, targetId), eq(report.status, "open")))
    if (rows.length === 0) {
      throw new AppException(HttpStatus.CONFLICT, ErrorCode.REPORT_NOT_OPEN, "Bu içeriğin açık şikâyeti yok.")
    }
    return rows
  }

  /** Şikâyetleri kapatır, denetim kaydı yazar, şikâyet edenlere sonucu bildirir. */
  private async close(
    admin: SessionUser,
    open: Array<{ id: string; reporterId: string }>,
    status: "resolved" | "dismissed",
    note: string | undefined,
    info: TargetInfo,
    targetType: ReportTarget,
    diff: object
  ) {
    const ids = open.map((r) => r.id)
    await this.db
      .update(report)
      .set({ status, resolvedBy: admin.id, resolutionNote: note || null, updatedAt: new Date() })
      .where(inArray(report.id, ids))
    await this.db.insert(auditLog).values(
      ids.map((id) => ({
        actorId: admin.id,
        action: `report.${status === "resolved" ? "resolve" : "dismiss"}`,
        entity: "report",
        entityId: id,
        diff: diff as Record<string, unknown>,
      }))
    )
    await this.notifications.notify(
      open.map((r) => r.reporterId),
      {
        type: "report_resolved",
        outcome: status === "resolved" ? "action_taken" : "no_violation",
        targetType,
        title: info.title,
      }
    )
  }

  /** İçeriği kaldırır: ilanda kapat / sil (hazır gerekçeyle), yorum / konu / cevapta yumuşak silme. */
  private async removeContent(
    admin: SessionUser,
    targetType: ReportTarget,
    targetId: string,
    listingAction: "close" | "remove",
    reason: string,
    info: TargetInfo
  ) {
    if (targetType === "listing") {
      if (listingAction === "close" && info.listing?.status === "active") {
        await this.listings.close(admin, targetId)
        return
      }
      const [r] = await this.db
        .select({ id: rejectionReason.id })
        .from(rejectionReason)
        .where(eq(rejectionReason.slug, REMOVE_REASON[reason] ?? "kurallara-aykiri"))
      await this.listings.remove(admin, targetId, { reasonId: r?.id, note: "" })
    } else if (targetType === "comment") await this.comments.remove(admin, targetId)
    else if (targetType === "topic") await this.forum.removeTopic(admin, targetId, { reason })
    else if (targetType === "reply") await this.forum.removeReply(admin, targetId, { reason })
  }

  /** İçerik sahibi ve geçmişi: üyelik, ilan sayıları, onay bekleyen ilanları, önceki sonuçlanan şikâyetler, uyarılar. */
  private async subject(userId: string): Promise<ReportCase["subject"]> {
    const [row] = await this.db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        banned: user.banned,
        banExpires: user.banExpires,
        deletedAt: user.deletedAt,
      })
      .from(user)
      .where(eq(user.id, userId))
    if (!row) return null
    const [listings, pending, [previous], [warnings]] = await Promise.all([
      this.db
        .select({ value: count() })
        .from(listing)
        .where(and(eq(listing.ownerId, userId), isNull(listing.deletedAt), ne(listing.status, "draft"))),
      this.db
        .select({ id: listing.id, no: listing.listingNo, title: listing.title })
        .from(listing)
        .where(and(eq(listing.ownerId, userId), isNull(listing.deletedAt), eq(listing.status, "pending")))
        .orderBy(asc(listing.submittedAt))
        .limit(5),
      this.db
        .select({ value: count() })
        .from(auditLog)
        .where(
          and(eq(auditLog.action, "report.resolve"), sql`${auditLog.entityId} in (${this.reportIdsAgainst(userId)})`)
        ),
      this.db
        .select({ value: count() })
        .from(notification)
        .where(and(eq(notification.userId, userId), eq(notification.type, "user_warned"))),
    ])
    const banActive = row.banned && (!row.banExpires || row.banExpires.getTime() > Date.now())
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role as "user" | "clinic" | "shelter" | "admin",
      createdAt: row.createdAt.toISOString(),
      deleted: row.deletedAt !== null,
      banned: banActive,
      banExpires: banActive && row.banExpires ? row.banExpires.toISOString() : null,
      listings: listings[0]?.value ?? 0,
      pendingListings: pending.map((p) => ({ id: p.id, no: p.no, title: p.title ?? "" })),
      previousReports: previous?.value ?? 0,
      warnings: warnings?.value ?? 0,
    }
  }

  /** Kullanıcı ya da içerikleri hakkındaki şikâyetlerin kimlikleri (metin, denetim kaydıyla eşleştirmek için). */
  private reportIdsAgainst(userId: string) {
    return sql`select r.id::text from report r where (r.target_type = 'user' and r.target_id = ${userId})
      or (r.target_type = 'listing' and r.target_id in (select l.id::text from listing l where l.owner_id = ${userId}))
      or (r.target_type = 'comment' and r.target_id in (select c.id::text from listing_comment c where c.author_id = ${userId}))
      or (r.target_type = 'topic' and r.target_id in (select t.id::text from forum_topic t where t.author_id = ${userId}))
      or (r.target_type = 'reply' and r.target_id in (select y.id::text from forum_reply y where y.author_id = ${userId}))`
  }

  /** Hedefin başlığı, metni, sahibi ve bağlamı (silinmiş hedefler de okunur). */
  private async targetInfo(targetType: ReportTarget, targetId: string): Promise<TargetInfo> {
    const empty: TargetInfo = {
      title: "—",
      body: null,
      subjectId: null,
      subjectName: "—",
      live: false,
      listing: null,
      topic: null,
    }
    const uuid = /^[0-9a-f-]{36}$/i.test(targetId)
    if (targetType === "user") {
      const [u] = await this.db
        .select({ id: user.id, name: user.name, deletedAt: user.deletedAt })
        .from(user)
        .where(eq(user.id, targetId))
      return u ? { ...empty, title: u.name, subjectId: u.id, subjectName: u.name, live: u.deletedAt === null } : empty
    }
    if (!uuid) return empty
    if (targetType === "listing") {
      const [l] = await this.db
        .select({ l: listing, ownerName: user.name })
        .from(listing)
        .innerJoin(user, eq(user.id, listing.ownerId))
        .where(eq(listing.id, targetId))
      if (!l) return empty
      return {
        ...empty,
        title: l.l.title ?? "",
        subjectId: l.l.ownerId,
        subjectName: l.ownerName,
        live: l.l.deletedAt === null && !["closed", "adopted"].includes(l.l.status),
        listing: { no: l.l.listingNo, slug: l.l.slug, title: l.l.title ?? "", status: l.l.status },
      }
    }
    if (targetType === "comment") {
      const [c] = await this.db
        .select({
          body: listingComment.body,
          authorId: listingComment.authorId,
          deletedAt: listingComment.deletedAt,
          authorName: user.name,
          no: listing.listingNo,
          slug: listing.slug,
          title: listing.title,
          status: listing.status,
        })
        .from(listingComment)
        .innerJoin(user, eq(user.id, listingComment.authorId))
        .innerJoin(listing, eq(listing.id, listingComment.listingId))
        .where(eq(listingComment.id, targetId))
      if (!c) return empty
      return {
        ...empty,
        title: excerpt(c.body),
        body: c.body,
        subjectId: c.authorId,
        subjectName: c.authorName,
        live: c.deletedAt === null,
        listing: { no: c.no, slug: c.slug, title: c.title ?? "", status: c.status },
      }
    }
    if (targetType === "topic") {
      const [t] = await this.db
        .select({ t: forumTopic, authorName: user.name, categorySlug: forumCategory.slug })
        .from(forumTopic)
        .innerJoin(user, eq(user.id, forumTopic.authorId))
        .innerJoin(forumCategory, eq(forumCategory.id, forumTopic.categoryId))
        .where(eq(forumTopic.id, targetId))
      if (!t) return empty
      return {
        ...empty,
        title: t.t.title,
        body: t.t.body,
        subjectId: t.t.authorId,
        subjectName: t.authorName,
        live: t.t.deletedAt === null,
        topic: { slug: t.t.slug, categorySlug: t.categorySlug, title: t.t.title },
      }
    }
    const [r] = await this.db
      .select({
        body: forumReply.body,
        authorId: forumReply.authorId,
        deletedAt: forumReply.deletedAt,
        authorName: user.name,
        topicSlug: forumTopic.slug,
        topicTitle: forumTopic.title,
        categorySlug: forumCategory.slug,
      })
      .from(forumReply)
      .innerJoin(user, eq(user.id, forumReply.authorId))
      .innerJoin(forumTopic, eq(forumTopic.id, forumReply.topicId))
      .innerJoin(forumCategory, eq(forumCategory.id, forumTopic.categoryId))
      .where(eq(forumReply.id, targetId))
    if (!r) return empty
    return {
      ...empty,
      title: excerpt(r.body),
      body: r.body,
      subjectId: r.authorId,
      subjectName: r.authorName,
      live: r.deletedAt === null,
      topic: { slug: r.topicSlug, categorySlug: r.categorySlug, title: r.topicTitle },
    }
  }
}

/** En sık şikâyet nedeni (eşitlikte ilk gelen). */
function topReason(reasons: readonly string[]): string {
  const counts = new Map<string, number>()
  for (const r of reasons) counts.set(r, (counts.get(r) ?? 0) + 1)
  let best = reasons[0] ?? "other"
  for (const [r, n] of counts) if (n > (counts.get(best) ?? 0)) best = r
  return best
}

/** Metnin ilk 80 karakteri (liste başlığı için). */
function excerpt(text: string): string {
  const flat = text.replace(/\s+/g, " ").trim()
  return flat.length > 80 ? `${flat.slice(0, 79)}…` : flat
}
