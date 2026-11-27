import { customType, pgEnum, timestamp, uuid } from "drizzle-orm/pg-core"

/** Zaman damgaları: her tabloda createdAt / updatedAt, yumuşak silme için deletedAt. */
export const createdAt = () => timestamp({ withTimezone: true }).notNull().defaultNow()

/** Güncelleme zamanı: kayıt her güncellendiğinde Drizzle tarafından otomatik yenilenir. */
export const updatedAt = () =>
  timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date())

export const timestamps = {
  createdAt: createdAt(),
  updatedAt: updatedAt(),
  deletedAt: timestamp({ withTimezone: true }),
}

/** Uygulama tablolarının birincil anahtarı (Better Auth tabloları text id kullanır). */
export const id = () => uuid().primaryKey().defaultRandom()

/** PostgreSQL tam metin arama sütunu. */
export const tsvector = customType<{ data: string }>({
  dataType: () => "tsvector",
})

// --- Enum'lar ---------------------------------------------------------------

export const roleEnum = pgEnum("role", ["user", "clinic", "shelter", "admin"])

/** Desteklenen diller (apps/web/i18n/routing.ts ile aynı). */
export const locales = ["tr", "en"] as const
export type Locale = (typeof locales)[number]

/** Çevrilebilir metin (tür, ırk, kategori adları): Türkçe zorunlu, diğer diller isteğe bağlı. */
export type LocalizedText = { tr: string } & Partial<Record<Exclude<Locale, "tr">, string>>

/** Çevrilebilir metnin istenen dildeki karşılığı; çevirisi yoksa Türkçe. */
export function localize(text: LocalizedText, locale: Locale): string {
  return text[locale] ?? text.tr
}

/** Arayüz ve e-posta dili. Varsayılan Türkçe; İngilizce kodda hazır, yayında kapalı. */
export const localeEnum = pgEnum("locale", locales)

export const organizationTypeEnum = pgEnum("organization_type", ["clinic", "shelter"])

/** Kurumsal başvuru, başarı hikâyesi gibi admin incelemesinden geçen kayıtlar. */
export const reviewStatusEnum = pgEnum("review_status", ["pending", "approved", "rejected"])

export const listingTypeEnum = pgEnum("listing_type", ["adoption", "foster", "lost", "found"])

/**
 * draft → pending → active (yayında)
 *                 ↘ changes_requested (admin notu) → kullanıcı düzenler → pending
 *                 ↘ rejected (gerekçe)
 * active → adopted | closed; active ilan düzenlenirse yeniden pending.
 */
export const listingStatusEnum = pgEnum("listing_status", [
  "draft",
  "pending",
  "changes_requested",
  "active",
  "adopted",
  "closed",
  "rejected",
])

/** İlanın "Kimden" alanı. */
export const listingSourceEnum = pgEnum("listing_source", ["foster_home", "street", "shelter", "clinic"])

export const genderEnum = pgEnum("gender", ["unknown", "male", "female"])

/** Yavru 0–6 ay, Genç 6 ay–2 yaş, Yetişkin 2–7 yaş, Yaşlı 7+. */
export const ageGroupEnum = pgEnum("age_group", ["puppy", "young", "adult", "senior"])

export const sizeEnum = pgEnum("size", ["small", "medium", "large"])

export const shareTemplateEnum = pgEnum("share_template", [
  "classic",
  "polaroid",
  "poster",
  "minimal",
  "orange",
  "character",
])

export const applicationStatusEnum = pgEnum("application_status", ["pending", "interview", "approved", "rejected"])

/** Yorum, konu, cevap: filtreden geçen içerik anında yayınlanır; admin gizleyebilir. */
export const contentStatusEnum = pgEnum("content_status", ["published", "hidden"])

export const postTypeEnum = pgEnum("post_type", ["blog", "news"])

/** pending: kurumların önerdiği, admin onayı bekleyen blog yazısı. */
export const postStatusEnum = pgEnum("post_status", ["draft", "pending", "scheduled", "published", "rejected"])

export const reportTargetEnum = pgEnum("report_target", ["listing", "comment", "topic", "reply", "user"])

export const reportStatusEnum = pgEnum("report_status", ["open", "resolved", "dismissed"])

/**
 * Şikâyet nedeni (hedefe göre izinli alt küme packages/validators › reports.ts). sale: satış/ücret talebi; fake:
 * sahte/yanıltıcı ilan; animal_abuse: hayvana kötü muamele; inappropriate: uygunsuz/hakaret içeren; spam; misinformation:
 * yanlış bilgi; harassment: taciz/hakaret (kullanıcı); fake_account: sahte hesap; other: diğer (açıklama zorunlu).
 */
export const reportReasonEnum = pgEnum("report_reason", [
  "sale",
  "fake",
  "animal_abuse",
  "inappropriate",
  "spam",
  "misinformation",
  "harassment",
  "fake_account",
  "other",
])

export const moderationRuleKindEnum = pgEnum("moderation_rule_kind", [
  "phone",
  "email",
  "url",
  "iban",
  "price",
  "duplicate",
])

export const moderationAreaEnum = pgEnum("moderation_area", [
  "listing",
  "comment",
  "topic",
  "reply",
  "message",
  "contact",
])

export const bannedTermCategoryEnum = pgEnum("banned_term_category", ["insult", "sale", "other"])

export const termMatchEnum = pgEnum("term_match", ["exact", "contains"])
