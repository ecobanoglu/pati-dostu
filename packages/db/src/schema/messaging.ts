import { index, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core"

import { id, timestamps } from "./_common.js"
import { user } from "./auth.js"
import { listing } from "./listing.js"

/** İlan üzerinden başlayan iki kişilik konuşma; aynı ilan + başlatan için tek konuşma. */
export const conversation = pgTable(
  "conversation",
  {
    id: id(),
    listingId: uuid()
      .notNull()
      .references(() => listing.id),
    starterId: text()
      .notNull()
      .references(() => user.id),
    ownerId: text()
      .notNull()
      .references(() => user.id),
    lastMessageAt: timestamp({ withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    unique().on(t.listingId, t.starterId),
    index().on(t.starterId, t.lastMessageAt.desc()),
    index().on(t.ownerId, t.lastMessageAt.desc()),
  ]
)

export const message = pgTable(
  "message",
  {
    id: id(),
    conversationId: uuid()
      .notNull()
      .references(() => conversation.id, { onDelete: "cascade" }),
    senderId: text()
      .notNull()
      .references(() => user.id),
    body: text().notNull(),
    readAt: timestamp({ withTimezone: true }),
    ...timestamps,
  },
  (t) => [index().on(t.conversationId, t.createdAt)]
)
