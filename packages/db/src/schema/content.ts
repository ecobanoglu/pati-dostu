import { boolean, index, jsonb, pgTable, primaryKey, smallint, text, timestamp, uuid } from "drizzle-orm/pg-core"

import { createdAt, id, type LocalizedText, postStatusEnum, postTypeEnum, timestamps } from "./_common.js"
import { user } from "./auth.js"

/**
 * Blog ya da haber kategorisi (sistem verisi; ad { tr, en }). Blogda konu (Sahiplenme, Sağlık…), haberde tür (Haber,
 * Duyuru, Etkinlik).
 */
export const postCategory = pgTable("post_category", {
  id: id(),
  type: postTypeEnum().notNull(),
  name: jsonb().$type<LocalizedText>().notNull(),
  slug: text().notNull().unique(),
  sortOrder: smallint().notNull().default(0),
  ...timestamps,
})

export const tag = pgTable("tag", {
  id: id(),
  name: text().notNull(),
  slug: text().notNull().unique(),
  ...timestamps,
})

/** Blog yazısı veya haber. İçerik Tiptap JSON'u olarak saklanır. */
export const post = pgTable(
  "post",
  {
    id: id(),
    type: postTypeEnum().notNull(),
    authorId: text()
      .notNull()
      .references(() => user.id),
    categoryId: uuid().references(() => postCategory.id),
    title: text().notNull(),
    slug: text().notNull().unique(),
    excerpt: text(),
    content: jsonb().$type<Record<string, unknown>>().notNull(),
    coverUrl: text(),
    /** Haber: ülke (ISO kodu; "TR" = Türkiye, diğerleri "Dünya") ve kaynak (ad + adres). */
    country: text(),
    sourceName: text(),
    sourceUrl: text(),
    /** Blog listesinin başındaki "Öne çıkan" yazı (en yeni öne çıkan gösterilir). */
    featured: boolean().notNull().default(false),
    status: postStatusEnum().notNull().default("draft"),
    /** scheduled durumunda planlanan yayın zamanı. */
    publishedAt: timestamp({ withTimezone: true }),
    /** Dakika. */
    readingTime: smallint(),
    ...timestamps,
  },
  (t) => [index().on(t.type, t.status, t.publishedAt.desc()), index().on(t.categoryId)]
)

export const postTag = pgTable(
  "post_tag",
  {
    postId: uuid()
      .notNull()
      .references(() => post.id, { onDelete: "cascade" }),
    tagId: uuid()
      .notNull()
      .references(() => tag.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.postId, t.tagId] }), index().on(t.tagId)]
)
