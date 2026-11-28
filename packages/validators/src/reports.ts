import { z } from "zod"

import { ValidationCode as C } from "./codes.js"

/** Şikâyet açıklamasının en fazla uzunluğu; "Diğer" seçilince en az uzunluk. */
export const REPORT_DETAILS_MAX = 500
export const REPORT_DETAILS_MIN = 10

/** Şikâyet edilebilen hedefler. */
export const reportTargets = ["listing", "comment", "user", "topic", "reply"] as const
export type ReportTarget = (typeof reportTargets)[number]

/**
 * Hedefe göre seçilebilen nedenler (karar: hazır nedenler + açıklama). Sıra arayüzdeki sıradır; "other" her zaman
 * sonda ve açıklama ister. Değerler DB'deki `report_reason` enum'unun alt kümeleridir.
 */
export const reportReasons = {
  listing: ["sale", "fake", "animal_abuse", "inappropriate", "spam", "other"],
  comment: ["inappropriate", "spam", "sale", "misinformation", "other"],
  user: ["harassment", "fake_account", "sale", "spam", "other"],
  topic: ["inappropriate", "spam", "sale", "misinformation", "other"],
  reply: ["inappropriate", "spam", "sale", "misinformation", "other"],
} as const satisfies Record<ReportTarget, readonly string[]>
export type ReportReason = (typeof reportReasons)[ReportTarget][number]

/** Hedefin şikâyet gövdesi: neden (hedefe izinli olanlardan) + açıklama ("Diğer"de zorunlu, en az 10 karakter). */
export function reportSchema<T extends ReportTarget>(target: T) {
  return z
    .object({
      reason: z.enum(reportReasons[target] as unknown as [string, ...string[]], { message: C.REQUIRED }),
      details: z.string().trim().max(REPORT_DETAILS_MAX, C.REPORT_DETAILS_TOO_LONG).optional(),
    })
    .refine((v) => v.reason !== "other" || (v.details?.length ?? 0) >= REPORT_DETAILS_MIN, {
      message: C.REPORT_DETAILS_REQUIRED,
      path: ["details"],
    })
}
export type ReportInput = z.infer<ReturnType<typeof reportSchema>>

// --- Admin -----------------------------------------------------------------------------------------------------------

/** Ban süreleri (admin › Şikayetler / Kullanıcılar). */
export const banDurations = ["7d", "30d", "permanent"] as const
export type BanDuration = (typeof banDurations)[number]

/** GET /admin/reports: açık ya da sonuçlanmış (çözülen + asılsız) şikâyet dosyaları, hedef türü, sayfa. */
export const adminReportsQuerySchema = z.object({
  status: z.enum(["open", "closed"]).default("open"),
  target: z.enum(reportTargets).optional(),
  page: z.coerce.number().int().min(1).max(500).default(1),
  locale: z.enum(["tr", "en"]).default("tr"),
})
export type AdminReportsQuery = z.infer<typeof adminReportsQuerySchema>

/** Şikâyet dosyası adres parametreleri: hedef türü + kimliği. */
export const reportCaseParamsSchema = z.object({
  targetType: z.enum(reportTargets),
  targetId: z.string().min(1).max(100),
})

/**
 * POST /admin/reports/{targetType}/{targetId}/resolve: seçili işlemleri uygula. `removeContent` içeriği kaldırır
 * (ilanda `listingAction`: kapat ya da sil; yorum / konu / cevap silinir); `warn` içerik sahibini uyarır (hazır metin +
 * neden); `ban` hesabı askıya alır. En az bir işlem seçilmeli (yoksa "Şikayeti asılsız say" kullanılır). `note` iç
 * nottur, yalnız admin'ler görür.
 */
export const resolveReportSchema = z
  .object({
    removeContent: z.boolean().default(false),
    listingAction: z.enum(["close", "remove"]).default("close"),
    warn: z.boolean().default(false),
    ban: z.enum(["none", ...banDurations]).default("none"),
    note: z.string().trim().max(1000).optional(),
  })
  .refine((v) => v.removeContent || v.warn || v.ban !== "none", { message: C.ACTION_REQUIRED, path: ["removeContent"] })
export type ResolveReportInput = z.input<typeof resolveReportSchema>

/** POST /admin/reports/{targetType}/{targetId}/dismiss: asılsız say (iç not isteğe bağlı). */
export const dismissReportSchema = z.object({ note: z.string().trim().max(1000).optional() })
