import { boolean, index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"

import { createdAt, localeEnum, roleEnum, updatedAt } from "./_common.js"
import { city } from "./dictionary.js"

/**
 * Better Auth tabloları (çekirdek + admin eklentisi). Kimlikler Better Auth'un ürettiği text değerlerdir.
 * Çekirdek alan adlarını Better Auth belirler; Pati Dostu alanları apps/api/src/auth/auth.ts › additionalFields'ta da tanımlıdır.
 */
export const user = pgTable(
  "user",
  {
    id: text().primaryKey(),
    name: text().notNull(),
    email: text().notNull().unique(),
    emailVerified: boolean().notNull().default(false),
    image: text(),
    // admin eklentisi
    role: roleEnum().notNull().default("user"),
    banned: boolean().notNull().default(false),
    banReason: text(),
    banExpires: timestamp({ withTimezone: true }),
    // Pati Dostu alanları
    phone: text(),
    cityId: uuid().references(() => city.id),
    bio: text(),
    /** E-postaların ve (girişten sonra) arayüzün dili. */
    locale: localeEnum().notNull().default("tr"),
    /** Yeni ilan ve blog e-postaları (kayıt formundaki isteğe bağlı onay). */
    marketingOptIn: boolean().notNull().default(false),
    /** Yeni ilan formunda "Telefonumu göster" bu değerle başlar (Profil ve ayarlar › Gizlilik). */
    showPhoneByDefault: boolean().notNull().default(false),
    /** Bildirim tercihleri: konu → { inApp, email } (eksik konular varsayılanla tamamlanır — validators › notifications). */
    notificationPrefs: jsonb().$type<Record<string, { inApp?: boolean; email?: boolean }>>().notNull().default({}),
    /** KVKK aydınlatma metni ve kullanım şartlarının kabul edildiği an (kayıtta zorunlu). */
    termsAcceptedAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: timestamp({ withTimezone: true }),
  },
  (t) => [index().on(t.role)]
)

export const session = pgTable(
  "session",
  {
    id: text().primaryKey(),
    token: text().notNull().unique(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    ipAddress: text(),
    userAgent: text(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    // admin eklentisi
    impersonatedBy: text(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index().on(t.userId)]
)

export const account = pgTable(
  "account",
  {
    id: text().primaryKey(),
    accountId: text().notNull(),
    providerId: text().notNull(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text(),
    refreshToken: text(),
    idToken: text(),
    accessTokenExpiresAt: timestamp({ withTimezone: true }),
    refreshTokenExpiresAt: timestamp({ withTimezone: true }),
    scope: text(),
    password: text(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index().on(t.userId)]
)

export const verification = pgTable(
  "verification",
  {
    id: text().primaryKey(),
    identifier: text().notNull(),
    value: text().notNull(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index().on(t.identifier)]
)
