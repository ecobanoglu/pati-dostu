import { sql } from "drizzle-orm"
import { boolean, check, index, jsonb, pgTable, smallint, text, uuid } from "drizzle-orm/pg-core"

import {
  bannedTermCategoryEnum,
  createdAt,
  id,
  type LocalizedText,
  moderationAreaEnum,
  moderationRuleKindEnum,
  reportReasonEnum,
  reportStatusEnum,
  reportTargetEnum,
  termMatchEnum,
  timestamps,
} from "./_common.js"
import { user } from "./auth.js"

export const report = pgTable(
  "report",
  {
    id: id(),
    reporterId: text()
      .notNull()
      .references(() => user.id),
    targetType: reportTargetEnum().notNull(),
    /** Hedef kaydın kimliği (user için text, diğerleri için uuid metni). */
    targetId: text().notNull(),
    reason: reportReasonEnum().notNull(),
    /** Şikâyet edenin açıklaması (isteğe bağlı; "Diğer"de zorunlu). Yalnız admin görür. */
    details: text(),
    status: reportStatusEnum().notNull().default("open"),
    resolvedBy: text().references(() => user.id),
    resolutionNote: text(),
    ...timestamps,
  },
  (t) => [index().on(t.status, t.createdAt), index().on(t.targetType, t.targetId)]
)

/** Hazır kalıp kuralları (telefon, e-posta, URL, IBAN, fiyat, tekrar); admin açıp kapatır. */
export const moderationRule = pgTable("moderation_rule", {
  id: id(),
  kind: moderationRuleKindEnum().notNull().unique(),
  enabled: boolean().notNull().default(true),
  areas: moderationAreaEnum().array().notNull(),
  /** İçerik engellendiğinde kullanıcıya gösterilen açıklama. */
  userMessage: text().notNull(),
  ...timestamps,
})

/**
 * Yasaklı kelimeler. `term` normalize edilmiş hâliyle saklanır (küçük harf, ı→i, ş→s, ğ→g, ü→u, ö→o, ç→c);
 * eşleştirme metnin aynı şekilde normalize edilmiş hâline yapılır.
 */
export const bannedTerm = pgTable("banned_term", {
  id: id(),
  term: text().notNull().unique(),
  category: bannedTermCategoryEnum().notNull(),
  match: termMatchEnum().notNull().default("contains"),
  ...timestamps,
})

/** Yalnızca hangi kuralın tetiklendiği sayılır; engellenen metin saklanmaz. */
export const moderationHit = pgTable(
  "moderation_hit",
  {
    id: id(),
    ruleId: uuid().references(() => moderationRule.id, { onDelete: "set null" }),
    termId: uuid().references(() => bannedTerm.id, { onDelete: "set null" }),
    area: moderationAreaEnum().notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    index().on(t.createdAt),
    check("moderation_hit_source", sql`${t.ruleId} is not null or ${t.termId} is not null`),
  ]
)

/**
 * İlan reddinde seçilen hazır gerekçeler (admin › İlan onayı; Sözlük › Red gerekçeleri sekmesinden yönetilir).
 * Kullanıcıya gösterilen red metni seçilen gerekçe + admin'in notudur (ilanın `rejectionReason` alanına yazılır).
 */
export const rejectionReason = pgTable("rejection_reason", {
  id: id(),
  slug: text().notNull().unique(),
  label: jsonb().$type<LocalizedText>().notNull(),
  sortOrder: smallint().notNull().default(0),
  active: boolean().notNull().default(true),
  ...timestamps,
})
