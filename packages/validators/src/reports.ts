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
