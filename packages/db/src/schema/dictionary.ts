import { boolean, index, jsonb, pgTable, smallint, text, unique, uuid } from "drizzle-orm/pg-core"

import { id, type LocalizedText, sizeEnum, timestamps } from "./_common.js"

export const city = pgTable("city", {
  id: id(),
  name: text().notNull(),
  slug: text().notNull().unique(),
  plateCode: smallint().notNull().unique(),
  ...timestamps,
})

export const district = pgTable(
  "district",
  {
    id: id(),
    cityId: uuid()
      .notNull()
      .references(() => city.id),
    name: text().notNull(),
    slug: text().notNull(),
    ...timestamps,
  },
  (t) => [unique().on(t.cityId, t.slug), index().on(t.cityId)]
)

export const species = pgTable("species", {
  id: id(),
  /** Dile göre ad: { tr, en }. Türkçe zorunlu; çevirisi olmayan dilde Türkçe gösterilir. */
  name: jsonb().$type<LocalizedText>().notNull(),
  slug: text().notNull().unique(),
  /** lucide ikon adı: cat, dog, bird, rabbit */
  icon: text(),
  sortOrder: smallint().notNull().default(0),
  ...timestamps,
})

export const breed = pgTable(
  "breed",
  {
    id: id(),
    speciesId: uuid()
      .notNull()
      .references(() => species.id),
    /** Dile göre ad: { tr, en }. Türkçe zorunlu; çevirisi olmayan dilde Türkçe gösterilir. */
    name: jsonb().$type<LocalizedText>().notNull(),
    slug: text().notNull(),
    /** Köpek ırklarında tipik boyut; ilan formunda öneri olarak kullanılır. */
    size: sizeEnum(),
    /** "Melez / Bilinmiyor" seçeneği; listede en üstte gösterilir. */
    isMixed: boolean().notNull().default(false),
    ...timestamps,
  },
  (t) => [unique().on(t.speciesId, t.slug), index().on(t.speciesId)]
)
