import { sql } from "drizzle-orm"
import { boolean, index, integer, jsonb, pgTable, smallint, text, timestamp, unique, uuid } from "drizzle-orm/pg-core"

import { contentStatusEnum, createdAt, id, type LocalizedText, timestamps } from "./_common.js"
import { user } from "./auth.js"
import { species } from "./dictionary.js"

/** Topluluk kategorisi (sistem verisi; ad ve açıklama tür adları gibi { tr, en }). */
export const forumCategory = pgTable("forum_category", {
  id: id(),
  name: jsonb().$type<LocalizedText>().notNull(),
  slug: text().notNull().unique(),
  description: jsonb().$type<LocalizedText>(),
  sortOrder: smallint().notNull().default(0),
  ...timestamps,
})

export const forumTopic = pgTable(
  "forum_topic",
  {
    id: id(),
    categoryId: uuid()
      .notNull()
      .references(() => forumCategory.id),
    authorId: text()
      .notNull()
      .references(() => user.id),
    /** İsteğe bağlı hayvan türü ("Hangi tür?"); listede türe göre süzülür. */
    speciesId: uuid().references(() => species.id),
    title: text().notNull(),
    slug: text().notNull().unique(),
    /** Sınırlı Markdown: **kalın**, *italik*, "- " ile liste (bağlantı yok). */
    body: text().notNull(),
    status: contentStatusEnum().notNull().default("published"),
    isSolved: boolean().notNull().default(false),
    viewCount: integer().notNull().default(0),
    answerCount: integer().notNull().default(0),
    /** Son cevap (yoksa oluşturulma) zamanı; "son etkinlik" ve listeleme için. */
    lastActivityAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    ...timestamps,
  },
  (t) => [
    index().on(t.categoryId, t.status, t.createdAt.desc()),
    index().on(t.authorId),
    // Benzer konular ve yazım hatalı arama
    index("forum_topic_title_trgm_idx").using("gin", sql`${t.title} gin_trgm_ops`),
  ]
)

export const forumReply = pgTable(
  "forum_reply",
  {
    id: id(),
    topicId: uuid()
      .notNull()
      .references(() => forumTopic.id, { onDelete: "cascade" }),
    authorId: text()
      .notNull()
      .references(() => user.id),
    body: text().notNull(),
    status: contentStatusEnum().notNull().default("published"),
    isBestAnswer: boolean().notNull().default(false),
    likeCount: integer().notNull().default(0),
    ...timestamps,
  },
  (t) => [index().on(t.topicId, t.createdAt)]
)

/** Birleştirme tablosu: beğeniyi geri almak satırı siler. */
export const forumReplyLike = pgTable(
  "forum_reply_like",
  {
    id: id(),
    replyId: uuid()
      .notNull()
      .references(() => forumReply.id, { onDelete: "cascade" }),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [unique().on(t.replyId, t.userId)]
)

/** Konu fotoğrafı (en fazla 3; ilk = kapak, anasayfa kartında görünür). `url` depo anahtarıdır (forum/{konuId}/…). */
export const forumTopicImage = pgTable(
  "forum_topic_image",
  {
    id: id(),
    topicId: uuid()
      .notNull()
      .references(() => forumTopic.id, { onDelete: "cascade" }),
    url: text().notNull(),
    sortOrder: smallint().notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.topicId, t.sortOrder)]
)

/** Konu takibi: takip eden yeni cevapta bildirim alır ("Takip ettiklerim"). Soru sahibi varsayılan olarak takip eder. */
export const forumTopicFollow = pgTable(
  "forum_topic_follow",
  {
    id: id(),
    topicId: uuid()
      .notNull()
      .references(() => forumTopic.id, { onDelete: "cascade" }),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [unique().on(t.topicId, t.userId), index().on(t.userId)]
)
