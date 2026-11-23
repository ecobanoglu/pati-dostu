import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core"

import { createdAt, id, timestamps } from "./_common.js"
import { user } from "./auth.js"

export const notification = pgTable(
  "notification",
  {
    id: id(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: text().notNull(),
    payload: jsonb().$type<Record<string, unknown>>().notNull(),
    readAt: timestamp({ withTimezone: true }),
    ...timestamps,
  },
  (t) => [index().on(t.userId, t.readAt, t.createdAt.desc())]
)

/** Denetim kaydı: yalnızca eklenir, güncellenmez ve silinmez. */
export const auditLog = pgTable(
  "audit_log",
  {
    id: id(),
    actorId: text().references(() => user.id),
    action: text().notNull(),
    entity: text().notNull(),
    entityId: text().notNull(),
    diff: jsonb().$type<Record<string, unknown>>(),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.entity, t.entityId), index().on(t.actorId), index().on(t.createdAt)]
)
