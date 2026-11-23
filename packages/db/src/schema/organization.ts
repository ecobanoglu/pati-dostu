import { sql } from "drizzle-orm"
import {
  boolean,
  check,
  date,
  doublePrecision,
  index,
  integer,
  pgTable,
  smallint,
  text,
  time,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core"

import { id, organizationTypeEnum, reviewStatusEnum, timestamps } from "./_common.js"
import { user } from "./auth.js"
import { city, district } from "./dictionary.js"

/**
 * Klinik veya barınak. Kullanıcı "Kurumsal hesap başvurusu" doldurur (belge istenmez);
 * admin onaylayınca status = approved, verifiedAt dolar ve kullanıcının rolü clinic/shelter olur.
 */
export const organization = pgTable(
  "organization",
  {
    id: id(),
    userId: text()
      .notNull()
      .unique()
      .references(() => user.id),
    type: organizationTypeEnum().notNull(),
    name: text().notNull(),
    slug: text().notNull().unique(),
    /** Vergi no (klinik) veya kütük / kayıt no (barınak). */
    registryNo: text().notNull(),
    description: text(),
    phone: text(),
    email: text(),
    website: text(),
    address: text().notNull(),
    cityId: uuid()
      .notNull()
      .references(() => city.id),
    districtId: uuid().references(() => district.id),
    lat: doublePrecision(),
    lng: doublePrecision(),
    /** Sunulan hizmetler (ör. aşı, kısırlaştırma, acil). */
    services: text()
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    /** Yalnızca barınak. */
    capacity: integer(),
    /** 7/24 açık; işaretliyse org_hours yok sayılır. */
    is24h: boolean().notNull().default(false),
    status: reviewStatusEnum().notNull().default("pending"),
    reviewedBy: text().references(() => user.id),
    reviewedAt: timestamp({ withTimezone: true }),
    rejectionReason: text(),
    verifiedAt: timestamp({ withTimezone: true }),
    ...timestamps,
  },
  (t) => [index().on(t.type, t.status, t.cityId)]
)

/** Haftalık çalışma saatleri; bir güne birden çok aralık girilebilir, satırı olmayan gün kapalıdır. */
export const orgHours = pgTable(
  "org_hours",
  {
    id: id(),
    orgId: uuid()
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    /** 0 = Pazartesi … 6 = Pazar */
    weekday: smallint().notNull(),
    opensAt: time().notNull(),
    closesAt: time().notNull(),
    ...timestamps,
  },
  (t) => [
    index().on(t.orgId, t.weekday),
    check("org_hours_weekday_range", sql`${t.weekday} between 0 and 6`),
    check("org_hours_range_order", sql`${t.opensAt} < ${t.closesAt}`),
  ]
)

/** Özel günler: bayram, resmî tatil gibi tek günlük kapanışlar. */
export const orgClosures = pgTable(
  "org_closures",
  {
    id: id(),
    orgId: uuid()
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    date: date().notNull(),
    note: text(),
    ...timestamps,
  },
  (t) => [unique().on(t.orgId, t.date)]
)
