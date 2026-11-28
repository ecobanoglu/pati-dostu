import { HttpStatus, Injectable } from "@nestjs/common"
import { auditLog, type Database, forumCategory, forumReply, forumTopic, localize, user } from "@pati-dostu/db"
import {
  ADMIN_FORUM_PAGE_SIZE,
  type AdminForumQuery,
  type RemoveForumContentInput,
  type UpdateForumTopicInput,
} from "@pati-dostu/validators"
import { and, asc, count, desc, eq, ilike, isNotNull, isNull, or, type SQL } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"

import type { AuthSession } from "../auth/auth.js"
import { AppException, ErrorCode } from "../common/errors.js"
import { InjectDb } from "../database/database.module.js"
import { NotificationsService } from "../notifications/notifications.service.js"
import type { AdminReplyPage, AdminReplyRow, AdminTopicPage, AdminTopicRow } from "./admin-forum.dto.js"
import { ForumService, plainExcerpt } from "./forum.service.js"

type SessionUser = AuthSession["user"]

/** ILIKE kalıbında `%` ve `_` düz karakter olsun. */
const likeEscape = (q: string) => q.replace(/[\\%_]/g, (c) => `\\${c}`)

/** Yayındaki konu / cevap (herkese açık sorgularla aynı koşul). */
const topicLive = and(eq(forumTopic.status, "published"), isNull(forumTopic.deletedAt))
const replyLive = and(eq(forumReply.status, "published"), isNull(forumReply.deletedAt))

/** Silen kişi (silme bilgisi için ayrı takma ad). */
const remover = alias(user, "remover")

/**
 * Admin › Topluluk (5. aşama 7. adım). Konular ve cevaplar: arama (başlık / metin, yazarın adı ya da e-postası),
 * kategori, yayında / silinmiş, sıralama. İşlemler (kararlar): kategori taşıma, sabitleme ("En yeni"de en üstte),
 * kilitleme (yeni cevap yazılamaz) ve gerekçeli silme — hazır gerekçe (şikâyet nedenleri) + not; yazara site içi +
 * e-posta bildirimi (sabit kanal). Silinenler salt okunur listelenir (geri alma yok). Her işlem denetim kaydına yazılır.
 */
@Injectable()
export class AdminForumService {
  constructor(
    @InjectDb() private readonly db: Database,
    private readonly forum: ForumService,
    private readonly notifications: NotificationsService
  ) {}

  /** Konu listesi. Silinmişlerde en son silinen önce. */
  async topics(q: AdminForumQuery): Promise<AdminTopicPage> {
    const term = q.q ? `%${likeEscape(q.q)}%` : null
    const where = and(
      q.status === "deleted" ? isNotNull(forumTopic.deletedAt) : topicLive,
      q.category ? eq(forumCategory.slug, q.category) : undefined,
      term
        ? or(
            ilike(forumTopic.title, term),
            ilike(forumTopic.body, term),
            ilike(user.name, term),
            ilike(user.email, term)
          )
        : undefined
    )
    const order: SQL[] =
      q.status === "deleted"
        ? [desc(forumTopic.deletedAt)]
        : q.sort === "old"
          ? [asc(forumTopic.createdAt)]
          : q.sort === "replies"
            ? [desc(forumTopic.answerCount), desc(forumTopic.createdAt)]
            : [desc(forumTopic.createdAt)]
    const [rows, [total], counts] = await Promise.all([
      this.db
        .select({
          t: forumTopic,
          category: { id: forumCategory.id, slug: forumCategory.slug, name: forumCategory.name },
          author: { id: user.id, name: user.name, email: user.email },
          removerName: remover.name,
        })
        .from(forumTopic)
        .innerJoin(forumCategory, eq(forumCategory.id, forumTopic.categoryId))
        .innerJoin(user, eq(user.id, forumTopic.authorId))
        .leftJoin(remover, eq(remover.id, forumTopic.removedBy))
        .where(where)
        .orderBy(...order, desc(forumTopic.id))
        .limit(ADMIN_FORUM_PAGE_SIZE)
        .offset((q.page - 1) * ADMIN_FORUM_PAGE_SIZE),
      this.db
        .select({ value: count() })
        .from(forumTopic)
        .innerJoin(forumCategory, eq(forumCategory.id, forumTopic.categoryId))
        .innerJoin(user, eq(user.id, forumTopic.authorId))
        .where(where),
      this.counts(),
    ])
    return {
      items: rows.map((r): AdminTopicRow => ({
        id: r.t.id,
        title: r.t.title,
        slug: r.t.slug,
        category: { id: r.category.id, slug: r.category.slug, name: localize(r.category.name, q.locale) },
        author: r.author,
        answerCount: r.t.answerCount,
        viewCount: r.t.viewCount,
        isSolved: r.t.isSolved,
        isPinned: r.t.isPinned,
        isLocked: r.t.isLocked,
        createdAt: r.t.createdAt.toISOString(),
        removal: this.removal(r.t, r.removerName),
      })),
      total: total?.value ?? 0,
      page: q.page,
      pageSize: ADMIN_FORUM_PAGE_SIZE,
      counts,
    }
  }

  /** Cevap listesi (yayındakilerde konusu da yayında olanlar). En yeni önce; silinmişlerde en son silinen önce. */
  async replies(q: AdminForumQuery): Promise<AdminReplyPage> {
    const term = q.q ? `%${likeEscape(q.q)}%` : null
    const where = and(
      q.status === "deleted" ? isNotNull(forumReply.deletedAt) : and(replyLive, topicLive),
      q.category ? eq(forumCategory.slug, q.category) : undefined,
      term ? or(ilike(forumReply.body, term), ilike(user.name, term), ilike(user.email, term)) : undefined
    )
    const [rows, [total], counts] = await Promise.all([
      this.db
        .select({
          r: forumReply,
          topic: {
            id: forumTopic.id,
            title: forumTopic.title,
            slug: forumTopic.slug,
            deletedAt: forumTopic.deletedAt,
            categorySlug: forumCategory.slug,
          },
          author: { id: user.id, name: user.name, email: user.email },
          removerName: remover.name,
        })
        .from(forumReply)
        .innerJoin(forumTopic, eq(forumTopic.id, forumReply.topicId))
        .innerJoin(forumCategory, eq(forumCategory.id, forumTopic.categoryId))
        .innerJoin(user, eq(user.id, forumReply.authorId))
        .leftJoin(remover, eq(remover.id, forumReply.removedBy))
        .where(where)
        .orderBy(q.status === "deleted" ? desc(forumReply.deletedAt) : desc(forumReply.createdAt), desc(forumReply.id))
        .limit(ADMIN_FORUM_PAGE_SIZE)
        .offset((q.page - 1) * ADMIN_FORUM_PAGE_SIZE),
      this.db
        .select({ value: count() })
        .from(forumReply)
        .innerJoin(forumTopic, eq(forumTopic.id, forumReply.topicId))
        .innerJoin(forumCategory, eq(forumCategory.id, forumTopic.categoryId))
        .innerJoin(user, eq(user.id, forumReply.authorId))
        .where(where),
      this.counts(),
    ])
    return {
      items: rows.map((r): AdminReplyRow => ({
        id: r.r.id,
        excerpt: plainExcerpt(r.r.body),
        topic: {
          id: r.topic.id,
          title: r.topic.title,
          slug: r.topic.slug,
          categorySlug: r.topic.categorySlug,
          deleted: r.topic.deletedAt !== null,
        },
        author: r.author,
        likeCount: r.r.likeCount,
        isBestAnswer: r.r.isBestAnswer,
        createdAt: r.r.createdAt.toISOString(),
        removal: this.removal(r.r, r.removerName),
      })),
      total: total?.value ?? 0,
      page: q.page,
      pageSize: ADMIN_FORUM_PAGE_SIZE,
      counts,
    }
  }

  /** Kategori taşıma, sabitleme, kilitleme (yalnız yayındaki konu). */
  async update(admin: SessionUser, id: string, input: UpdateForumTopicInput): Promise<void> {
    const [topic] = await this.db
      .select({ categoryId: forumTopic.categoryId, isPinned: forumTopic.isPinned, isLocked: forumTopic.isLocked })
      .from(forumTopic)
      .where(and(eq(forumTopic.id, id), topicLive))
    if (!topic) throw new AppException(HttpStatus.NOT_FOUND, ErrorCode.NOT_FOUND, "Konu bulunamadı.")
    if (input.categoryId !== undefined) {
      const [cat] = await this.db
        .select({ id: forumCategory.id })
        .from(forumCategory)
        .where(and(eq(forumCategory.id, input.categoryId), isNull(forumCategory.deletedAt)))
      if (!cat) throw new AppException(HttpStatus.BAD_REQUEST, ErrorCode.CATEGORY_INVALID, "Kategori geçersiz.")
    }
    const set = {
      ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
      ...(input.isPinned !== undefined ? { isPinned: input.isPinned } : {}),
      ...(input.isLocked !== undefined ? { isLocked: input.isLocked } : {}),
    }
    await this.db.update(forumTopic).set(set).where(eq(forumTopic.id, id))
    await this.audit(admin.id, "forum.topic.update", "forum_topic", id, { from: topic, to: set })
  }

  /** Konuyu gerekçeyle siler; yazar admin'in kendisi değilse bildirim + e-posta gider. */
  async removeTopic(admin: SessionUser, id: string, input: RemoveForumContentInput): Promise<void> {
    const topic = await this.forum.removeTopic(admin, id, input)
    await this.audit(admin.id, "forum.topic.remove", "forum_topic", id, input)
    if (topic.authorId !== admin.id) {
      await this.notifications.notify(topic.authorId, {
        type: "forum_content_removed",
        kind: "topic",
        title: topic.title,
        reason: input.reason,
        note: input.note || null,
      })
    }
  }

  /** Cevabı gerekçeyle siler; yazar admin'in kendisi değilse bildirim + e-posta gider. */
  async removeReply(admin: SessionUser, id: string, input: RemoveForumContentInput): Promise<void> {
    const reply = await this.forum.removeReply(admin, id, input)
    await this.audit(admin.id, "forum.reply.remove", "forum_reply", id, input)
    if (reply.authorId !== admin.id) {
      await this.notifications.notify(reply.authorId, {
        type: "forum_content_removed",
        kind: "reply",
        title: reply.topicTitle,
        reason: input.reason,
        note: input.note || null,
      })
    }
  }

  // --- Yardımcılar --------------------------------------------------------------------------------------------

  /** Sekme sayıları: yayındaki konu / cevap, silinmiş konu / cevap. */
  private async counts(): Promise<AdminTopicPage["counts"]> {
    const [[topics], [replies], [deletedTopics], [deletedReplies]] = await Promise.all([
      this.db.select({ value: count() }).from(forumTopic).where(topicLive),
      this.db
        .select({ value: count() })
        .from(forumReply)
        .innerJoin(forumTopic, eq(forumTopic.id, forumReply.topicId))
        .where(and(replyLive, topicLive)),
      this.db.select({ value: count() }).from(forumTopic).where(isNotNull(forumTopic.deletedAt)),
      this.db.select({ value: count() }).from(forumReply).where(isNotNull(forumReply.deletedAt)),
    ])
    return {
      topics: topics?.value ?? 0,
      replies: replies?.value ?? 0,
      deletedTopics: deletedTopics?.value ?? 0,
      deletedReplies: deletedReplies?.value ?? 0,
    }
  }

  /** Silme bilgisi (silinmemişse null). */
  private removal(
    row: {
      deletedAt: Date | null
      authorId: string
      removedBy: string | null
      removalReason: string | null
      removalNote: string | null
    },
    removerName: string | null
  ): AdminTopicRow["removal"] {
    if (!row.deletedAt) return null
    return {
      at: row.deletedAt.toISOString(),
      by: removerName,
      byAuthor: row.removedBy === row.authorId,
      reason: row.removalReason,
      note: row.removalNote,
    }
  }

  /** Denetim kaydı. */
  private async audit(actorId: string, action: string, entity: string, entityId: string, diff: object) {
    await this.db.insert(auditLog).values({ actorId, action, entity, entityId, diff: diff as Record<string, unknown> })
  }
}
