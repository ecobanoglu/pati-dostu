import { index, jsonb, pgTable, text, uuid } from "drizzle-orm/pg-core"

import { applicationStatusEnum, id, reviewStatusEnum, timestamps } from "./_common.js"
import { user } from "./auth.js"
import { listing } from "./listing.js"

export const adoptionApplication = pgTable(
  "adoption_application",
  {
    id: id(),
    listingId: uuid()
      .notNull()
      .references(() => listing.id),
    applicantId: text()
      .notNull()
      .references(() => user.id),
    answers: jsonb().$type<Record<string, unknown>>().notNull(),
    status: applicationStatusEnum().notNull().default("pending"),
    contractUrl: text(),
    ...timestamps,
  },
  (t) => [index().on(t.listingId, t.status), index().on(t.applicantId)]
)

export const successStory = pgTable(
  "success_story",
  {
    id: id(),
    listingId: uuid().references(() => listing.id),
    authorId: text()
      .notNull()
      .references(() => user.id),
    body: text().notNull(),
    photoUrl: text(),
    status: reviewStatusEnum().notNull().default("pending"),
    ...timestamps,
  },
  (t) => [index().on(t.status)]
)
