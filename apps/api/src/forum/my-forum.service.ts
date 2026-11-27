import { Injectable } from "@nestjs/common"
import { type Database, forumCategory, forumReply, forumTopic, forumTopicFollow, localize, user } from "@pati-dostu/db"
import { and, count, desc, eq, inArray, isNull, ne, sql } from "drizzle-orm"

import { InjectDb } from "../database/database.module.js"
import type { MyForumCounts, MyReplyPage, MyTopicPage } from "./forum.dto.js"
import { ForumService, plainExcerpt } from "./forum.service.js"

type Locale = "tr" | "en"

/** Sayfa boyutu (Sorularım sekmeleri). */
const PAGE_SIZE = 20

/**
 * İlişkili alt sorgularda dış tablonun kimliği, tablo adıyla. Drizzle tek tablolu sorguda sütunu tablo adı olmadan
 * ("id") yazar; alt sorgunun içinde bu, alt sorgudaki tablonun id'si sanılır — o yüzden açıkça yazılır.
 */
const TOPIC_ID = sql.raw(`"forum_topic"."id"`)

/** Görünen konu / cevap koşulları (yayımlanmış, silinmemiş). */
const visibleTopic = and(eq(forumTopic.status, "published"), isNull(forumTopic.deletedAt))
const visibleReply = and(eq(forumReply.status, "published"), isNull(forumReply.deletedAt))

/** En iyi cevabın yazarı (Sorularım satırında "En iyi cevap: …"). */
const bestAnswerAuthor = sql<string | null>`(
  select u.name from ${forumReply} r join ${user} u on u.id = r.author_id
  where r.topic_id = ${TOPIC_ID} and r.is_best_answer and r.deleted_at is null limit 1)`

/**
 * Hesabım › Sorularım (4. aşama): kullanıcının konuları, cevapları ve takip ettiği (başkalarının) konular; her yanıtta
 * üç sekmenin sayıları da döner. En yeni önce, 20'şer sayfa.
 */
@Injectable()
export class MyForumService {
  constructor(
    @InjectDb() private readonly db: Database,
    private readonly forum: ForumService
  ) {}

  /** Üç sekmenin sayıları: konularım, cevaplarım (görünen konulardaki), takip ettiğim başkalarının konuları. */
  async counts(meId: string): Promise<MyForumCounts> {
    const [[topics], [replies], [following]] = await Promise.all([
      this.db
        .select({ value: count() })
        .from(forumTopic)
        .where(and(eq(forumTopic.authorId, meId), visibleTopic)),
      this.db
        .select({ value: count() })
        .from(forumReply)
        .innerJoin(forumTopic, eq(forumTopic.id, forumReply.topicId))
        .where(and(eq(forumReply.authorId, meId), visibleReply, visibleTopic)),
      this.db
        .select({ value: count() })
        .from(forumTopicFollow)
        .innerJoin(forumTopic, eq(forumTopic.id, forumTopicFollow.topicId))
        .where(and(eq(forumTopicFollow.userId, meId), ne(forumTopic.authorId, meId), visibleTopic)),
    ])
    return { topics: topics?.value ?? 0, replies: replies?.value ?? 0, following: following?.value ?? 0 }
  }

  /** Konularım (en yeni önce) + en iyi cevabın yazarı. */
  async topics(meId: string, page: number, locale: Locale): Promise<MyTopicPage> {
    const where = and(eq(forumTopic.authorId, meId), visibleTopic)
    const [rows, counts] = await Promise.all([
      this.forum
        .cardQuery()
        .where(where)
        .orderBy(desc(forumTopic.createdAt), desc(forumTopic.id))
        .limit(PAGE_SIZE)
        .offset((page - 1) * PAGE_SIZE),
      this.counts(meId),
    ])
    const best = rows.length
      ? await this.db
          .select({ id: forumTopic.id, name: bestAnswerAuthor })
          .from(forumTopic)
          .where(
            inArray(
              forumTopic.id,
              rows.map((r) => r.id)
            )
          )
      : []
    return {
      items: rows.map((r) => ({
        ...this.forum.toCard(r, locale),
        bestAnswerAuthor: best.find((b) => b.id === r.id)?.name ?? null,
      })),
      total: counts.topics,
      page,
      pageSize: PAGE_SIZE,
      counts,
    }
  }

  /** Takip ettiğim başkalarının konuları, son etkinliği en yeni olan önce. */
  async following(meId: string, page: number, locale: Locale): Promise<MyTopicPage> {
    const [rows, counts] = await Promise.all([
      this.forum
        .cardQuery()
        .innerJoin(
          forumTopicFollow,
          and(eq(forumTopicFollow.topicId, forumTopic.id), eq(forumTopicFollow.userId, meId))
        )
        .where(and(ne(forumTopic.authorId, meId), visibleTopic))
        .orderBy(desc(forumTopic.lastActivityAt), desc(forumTopic.id))
        .limit(PAGE_SIZE)
        .offset((page - 1) * PAGE_SIZE),
      this.counts(meId),
    ])
    return {
      items: rows.map((r) => ({ ...this.forum.toCard(r, locale), bestAnswerAuthor: null })),
      total: counts.following,
      page,
      pageSize: PAGE_SIZE,
      counts,
    }
  }

  /** Cevaplarım (görünen konulardaki), en yeni önce; konunun başlığı ve kategorisiyle. */
  async replies(meId: string, page: number, locale: Locale): Promise<MyReplyPage> {
    const [rows, counts] = await Promise.all([
      this.db
        .select({
          id: forumReply.id,
          body: forumReply.body,
          likeCount: forumReply.likeCount,
          isBestAnswer: forumReply.isBestAnswer,
          createdAt: forumReply.createdAt,
          topicSlug: forumTopic.slug,
          topicTitle: forumTopic.title,
          isSolved: forumTopic.isSolved,
          categorySlug: forumCategory.slug,
          categoryName: forumCategory.name,
        })
        .from(forumReply)
        .innerJoin(forumTopic, eq(forumTopic.id, forumReply.topicId))
        .innerJoin(forumCategory, eq(forumCategory.id, forumTopic.categoryId))
        .where(and(eq(forumReply.authorId, meId), visibleReply, visibleTopic))
        .orderBy(desc(forumReply.createdAt), desc(forumReply.id))
        .limit(PAGE_SIZE)
        .offset((page - 1) * PAGE_SIZE),
      this.counts(meId),
    ])
    return {
      items: rows.map((r) => ({
        id: r.id,
        excerpt: plainExcerpt(r.body, 160),
        likeCount: r.likeCount,
        isBestAnswer: r.isBestAnswer,
        createdAt: r.createdAt.toISOString(),
        topic: {
          slug: r.topicSlug,
          title: r.topicTitle,
          isSolved: r.isSolved,
          category: { slug: r.categorySlug, name: localize(r.categoryName, locale) },
        },
      })),
      total: counts.replies,
      page,
      pageSize: PAGE_SIZE,
      counts,
    }
  }
}
