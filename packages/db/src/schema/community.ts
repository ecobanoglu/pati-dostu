import { sql } from "drizzle-orm"
import { boolean, index, integer, pgTable, smallint, text, unique, uuid } from "drizzle-orm/pg-core"

import { contentStatusEnum, createdAt, id, timestamps } from "./_common.js"
import { user } from "./auth.js"

export const forumCategory = pgTable("forum_category", {
  id: id(),
  name: text().notNull(),
  slug: text().notNull().unique(),
  description: text(),
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
    title: text().notNull(),
    slug: text().notNull().unique(),
    body: text().notNull(),
    status: contentStatusEnum().notNull().default("published"),
    isSolved: boolean().notNull().default(false),
    viewCount: integer().notNull().default(0),
    answerCount: integer().notNull().default(0),
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
