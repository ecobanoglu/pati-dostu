import { HttpStatus, Injectable } from "@nestjs/common"
import { type Database, forumReply, forumTopic, listing, listingComment, report, user } from "@pati-dostu/db"
import type { ReportInput, ReportTarget } from "@pati-dostu/validators"
import { and, eq, isNull, ne } from "drizzle-orm"

import type { AuthSession } from "../auth/auth.js"
import { AppException, ErrorCode } from "../common/errors.js"
import { InjectDb } from "../database/database.module.js"
import { ListingsService } from "../listings/listings.service.js"
import { NotificationsService } from "../notifications/notifications.service.js"
import { RateLimitService } from "../redis/rate-limit.service.js"

type SessionUser = AuthSession["user"]

/** Şikâyet edilen şeyin admin bildiriminde gösterilecek özeti. */
type TargetSummary = {
  id: string
  ownerId: string
  listingNo?: number
  slug?: string | null
  title?: string | null
  name?: string
}

/**
 * Şikâyetler (3. aşama): ilan, yorum ve kullanıcı. Kararlar: hazır neden + açıklama; şikâyet yalnız kaydedilir —
 * içerik admin inceleyene kadar yayında kalır (otomatik gizleme yok); admin'lere site içi bildirim gider. Aynı kişi
 * aynı hedefi açık bir şikâyeti varken tekrar şikâyet ederse yeni kayıt açılmaz (`alreadyReported`). Kendi ilanını,
 * yorumunu ya da kendini şikâyet edemez. Admin tarafı (liste, sonuçlandırma) 5. aşamada.
 */
@Injectable()
export class ReportsService {
  constructor(
    @InjectDb() private readonly db: Database,
    private readonly listings: ListingsService,
    private readonly notifications: NotificationsService,
    private readonly rateLimit: RateLimitService
  ) {}

  /** Yayındaki ilanı şikâyet eder. */
  async reportListing(me: SessionUser, ref: string, input: ReportInput) {
    const [row] = await this.db
      .select({
        id: listing.id,
        ownerId: listing.ownerId,
        listingNo: listing.listingNo,
        slug: listing.slug,
        title: listing.title,
      })
      .from(listing)
      .where(and(this.listings.refCondition(ref), eq(listing.status, "active"), isNull(listing.deletedAt)))
    if (!row) throw this.listings.notFound()
    return this.create(me, "listing", row, input)
  }

  /** Yayındaki bir ilanın görünen yorumunu şikâyet eder. */
  async reportComment(me: SessionUser, id: string, input: ReportInput) {
    const [row] = await this.db
      .select({
        id: listingComment.id,
        ownerId: listingComment.authorId,
        listingNo: listing.listingNo,
        slug: listing.slug,
        title: listing.title,
      })
      .from(listingComment)
      .innerJoin(listing, eq(listing.id, listingComment.listingId))
      .where(
        and(
          eq(listingComment.id, id),
          isNull(listingComment.deletedAt),
          eq(listingComment.status, "published"),
          eq(listing.status, "active"),
          isNull(listing.deletedAt)
        )
      )
    if (!row) throw new AppException(HttpStatus.NOT_FOUND, ErrorCode.NOT_FOUND, "Yorum bulunamadı.")
    return this.create(me, "comment", row, input)
  }

  /** Yayındaki topluluk konusunu şikâyet eder. */
  async reportTopic(me: SessionUser, id: string, input: ReportInput) {
    const [row] = await this.db
      .select({ id: forumTopic.id, ownerId: forumTopic.authorId, title: forumTopic.title })
      .from(forumTopic)
      .where(and(eq(forumTopic.id, id), eq(forumTopic.status, "published"), isNull(forumTopic.deletedAt)))
    if (!row) throw new AppException(HttpStatus.NOT_FOUND, ErrorCode.NOT_FOUND, "Konu bulunamadı.")
    return this.create(me, "topic", row, input)
  }

  /** Yayındaki konunun görünen cevabını şikâyet eder. */
  async reportReply(me: SessionUser, id: string, input: ReportInput) {
    const [row] = await this.db
      .select({ id: forumReply.id, ownerId: forumReply.authorId, title: forumTopic.title })
      .from(forumReply)
      .innerJoin(forumTopic, eq(forumTopic.id, forumReply.topicId))
      .where(
        and(
          eq(forumReply.id, id),
          eq(forumReply.status, "published"),
          isNull(forumReply.deletedAt),
          eq(forumTopic.status, "published"),
          isNull(forumTopic.deletedAt)
        )
      )
    if (!row) throw new AppException(HttpStatus.NOT_FOUND, ErrorCode.NOT_FOUND, "Cevap bulunamadı.")
    return this.create(me, "reply", row, input)
  }

  /** Kullanıcıyı şikâyet eder (Mesajlar'daki konuşma başlığından). Hesabını kapatmış kişi şikâyet edilemez. */
  async reportUser(me: SessionUser, id: string, input: ReportInput) {
    const [row] = await this.db
      .select({ id: user.id, name: user.name })
      .from(user)
      .where(and(eq(user.id, id), isNull(user.deletedAt)))
    if (!row) throw new AppException(HttpStatus.NOT_FOUND, ErrorCode.NOT_FOUND, "Kullanıcı bulunamadı.")
    return this.create(me, "user", { id: row.id, ownerId: row.id, name: row.name }, input)
  }

  /**
   * Şikâyeti kaydeder: kendi içeriği değilse, istek sınırı içindeyse; açık bir şikâyeti varsa yenisini açmaz.
   * Yeni kayıtta admin'lere bildirim gider.
   */
  private async create(
    me: SessionUser,
    targetType: ReportTarget,
    target: TargetSummary,
    input: ReportInput
  ): Promise<{ alreadyReported: boolean }> {
    if (target.ownerId === me.id) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        ErrorCode.CANNOT_REPORT_SELF,
        "Kendi içeriğinizi şikâyet edemezsiniz."
      )
    }
    const [open] = await this.db
      .select({ id: report.id })
      .from(report)
      .where(
        and(
          eq(report.reporterId, me.id),
          eq(report.targetType, targetType),
          eq(report.targetId, target.id),
          eq(report.status, "open"),
          isNull(report.deletedAt)
        )
      )
    if (open) return { alreadyReported: true }

    await this.rateLimit.consume("report", me.id)
    const [created] = await this.db
      .insert(report)
      .values({
        reporterId: me.id,
        targetType,
        targetId: target.id,
        reason: input.reason as typeof report.$inferInsert.reason,
        details: input.details?.trim() || null,
      })
      .returning({ id: report.id })

    const admins = await this.db
      .select({ id: user.id })
      .from(user)
      .where(and(eq(user.role, "admin"), isNull(user.deletedAt), ne(user.id, me.id)))
    if (admins.length > 0) {
      await this.notifications.notify(
        admins.map((a) => a.id),
        {
          type: "report_created",
          reportId: created!.id,
          targetType,
          reason: input.reason,
          listingNo: target.listingNo ?? null,
          slug: target.slug ?? null,
          title: target.title ?? target.name ?? "",
        }
      )
    }
    return { alreadyReported: false }
  }
}
