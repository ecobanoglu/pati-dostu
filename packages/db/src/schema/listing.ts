import { type SQL, sql } from "drizzle-orm"
import {
  type AnyPgColumn,
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core"

import {
  ageGroupEnum,
  contentStatusEnum,
  createdAt,
  genderEnum,
  id,
  listingSourceEnum,
  listingStatusEnum,
  listingTypeEnum,
  shareTemplateEnum,
  sizeEnum,
  timestamps,
  tsvector,
} from "./_common.js"
import { user } from "./auth.js"
import { breed, city, district, species } from "./dictionary.js"

export const listing = pgTable(
  "listing",
  {
    id: id(),
    /** Kullanıcıya gösterilen ilan numarası. */
    listingNo: integer().notNull().unique().generatedAlwaysAsIdentity({ startWith: 100001 }),
    ownerId: text()
      .notNull()
      .references(() => user.id),
    type: listingTypeEnum().notNull(),
    /** 10–80 karakter (doğrulama Zod şemasında). */
    title: text().notNull(),
    slug: text().notNull(),
    description: text().notNull(),

    // Hayvan
    speciesId: uuid()
      .notNull()
      .references(() => species.id),
    breedId: uuid().references(() => breed.id),
    /** Hayvanın adı; bulunan hayvan ilanlarında isteğe bağlı. */
    name: text(),
    gender: genderEnum().notNull().default("unknown"),
    ageGroup: ageGroupEnum(),
    size: sizeEnum(),
    vaccinated: boolean().notNull().default(false),
    neutered: boolean().notNull().default(false),
    microchipped: boolean().notNull().default(false),
    /** Yalnızca admin görür. */
    microchipNumber: text(),
    childFriendly: boolean().notNull().default(false),
    source: listingSourceEnum(),

    // Konum
    cityId: uuid()
      .notNull()
      .references(() => city.id),
    districtId: uuid().references(() => district.id),
    /** Kayıp / bulunan: son görüldüğü ya da bulunduğu yer. */
    lastSeenAddress: text(),
    lastSeenLat: doublePrecision(),
    lastSeenLng: doublePrecision(),

    // İletişim
    /** Varsayılan gizli; açıksa giriş yapmış kullanıcılara Ara / WhatsApp görünür. */
    showPhone: boolean().notNull().default(false),

    // Onay akışı
    status: listingStatusEnum().notNull().default("draft"),
    submittedAt: timestamp({ withTimezone: true }),
    reviewedBy: text().references(() => user.id),
    reviewedAt: timestamp({ withTimezone: true }),
    /** changes_requested: admin notu ve düzeltilecek alanlar. */
    reviewNote: text(),
    reviewFields: text().array(),
    /** rejected: gerekçe. */
    rejectionReason: text(),
    publishedAt: timestamp({ withTimezone: true }),
    closedAt: timestamp({ withTimezone: true }),

    viewCount: integer().notNull().default(0),
    searchVector: tsvector().generatedAlwaysAs(
      (): SQL =>
        sql`setweight(to_tsvector('turkish', coalesce("title", '')), 'A') || setweight(to_tsvector('turkish', coalesce("description", '')), 'B')`
    ),
    ...timestamps,
  },
  (t) => [
    index("listing_public_idx").on(t.status, t.speciesId, t.cityId, t.publishedAt.desc()),
    index().on(t.ownerId),
    index("listing_search_idx").using("gin", t.searchVector),
    index("listing_title_trgm_idx").using("gin", sql`${t.title} gin_trgm_ops`),
  ]
)

export const listingImage = pgTable(
  "listing_image",
  {
    id: id(),
    listingId: uuid()
      .notNull()
      .references(() => listing.id, { onDelete: "cascade" }),
    /** Depolama anahtarı (R2 nesne yolu); herkese açık adres S3_PUBLIC_URL ile kurulur. */
    url: text().notNull(),
    sortOrder: smallint().notNull().default(0),
    isCover: boolean().notNull().default(false),
    /** Kopya görsel tespiti için algısal hash. */
    imageHash: text(),
    ...timestamps,
  },
  (t) => [index().on(t.listingId), index().on(t.imageHash)]
)

export const listingShareImage = pgTable(
  "listing_share_image",
  {
    id: id(),
    listingId: uuid()
      .notNull()
      .references(() => listing.id, { onDelete: "cascade" }),
    template: shareTemplateEnum().notNull(),
    url: text().notNull(),
    ...timestamps,
  },
  (t) => [unique().on(t.listingId, t.template)]
)

/** Birleştirme tablosu: yumuşak silme yok, favoriden çıkarma satırı siler. */
export const favorite = pgTable(
  "favorite",
  {
    id: id(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    listingId: uuid()
      .notNull()
      .references(() => listing.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [unique().on(t.userId, t.listingId), index().on(t.listingId)]
)

export const listingComment = pgTable(
  "listing_comment",
  {
    id: id(),
    listingId: uuid()
      .notNull()
      .references(() => listing.id, { onDelete: "cascade" }),
    authorId: text()
      .notNull()
      .references(() => user.id),
    parentId: uuid().references((): AnyPgColumn => listingComment.id),
    body: text().notNull(),
    status: contentStatusEnum().notNull().default("published"),
    ...timestamps,
  },
  (t) => [index().on(t.listingId, t.createdAt)]
)

export const savedSearch = pgTable(
  "saved_search",
  {
    id: id(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text(),
    filters: jsonb().$type<Record<string, unknown>>().notNull(),
    notifyEmail: boolean().notNull().default(true),
    notifyPush: boolean().notNull().default(false),
    ...timestamps,
  },
  (t) => [index().on(t.userId)]
)
