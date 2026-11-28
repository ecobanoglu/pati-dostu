import { z } from "zod"

import { ValidationCode as C } from "./codes.js"

/** Kurum türleri: veteriner kliniği ve barınak / dernek. */
export const organizationTypes = ["clinic", "shelter"] as const
export type OrganizationType = (typeof organizationTypes)[number]

/** Türe göre seçilebilen hizmetler (sıra arayüzdeki sıradır; adlar web › messages › OrgApplication.services). */
export const organizationServices = {
  clinic: ["vaccination", "neutering", "emergency", "surgery", "dental", "laboratory", "microchip"],
  shelter: ["adoption", "foster", "rescue", "treatment", "neutering", "volunteering"],
} as const satisfies Record<OrganizationType, readonly string[]>
export type OrganizationService = (typeof organizationServices)[OrganizationType][number]

/** Bir günde en fazla saat aralığı (ör. sabah + öğleden sonra + akşam). */
export const MAX_RANGES_PER_DAY = 3

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/

/**
 * Türkiye telefon numarasını +90XXXXXXXXXX biçimine çevirir: cep (05xx) ya da sabit hat (02xx, 03xx, 04xx, 08xx).
 * Geçersizse null. Boşluk, tire, parantez ve baştaki 0 / 90 / +90 yok sayılır.
 */
export function normalizeTurkishPhone(input: string): string | null {
  const digits = input
    .replace(/[\s()\-.]/g, "")
    .replace(/^\+?90/, "")
    .replace(/^0/, "")
  return /^[2-58]\d{9}$/.test(digits) ? `+90${digits}` : null
}

/** Bir saat aralığı ("09:00"–"19:00"; açılış kapanıştan önce). */
export const hourRangeSchema = z
  .object({
    weekday: z.number().int().min(0).max(6),
    opensAt: z.string().regex(TIME, C.HOURS_INVALID),
    closesAt: z.string().regex(TIME, C.HOURS_INVALID),
  })
  .refine((r) => r.opensAt < r.closesAt, { message: C.HOURS_INVALID, path: ["closesAt"] })
export type HourRange = z.infer<typeof hourRangeSchema>

/** Aynı günün aralıkları çakışmasın, günde en fazla 3 aralık. */
function hoursValid(hours: HourRange[]): boolean {
  for (let day = 0; day < 7; day++) {
    const ranges = hours.filter((h) => h.weekday === day).sort((a, b) => a.opensAt.localeCompare(b.opensAt))
    if (ranges.length > MAX_RANGES_PER_DAY) return false
    for (let i = 1; i < ranges.length; i++) if (ranges[i]!.opensAt < ranges[i - 1]!.closesAt) return false
  }
  return true
}

/**
 * POST /organizations/applications (kurumsal başvuru — belge istenmez). Tür, kurum adı, vergi / kütük no, yetkili
 * kişi, kurum telefonu ve e-postası, şehir + ilçe + açık adres, hizmetler (türe ait, en az 1), çalışma saatleri
 * (7/24 değilse en az bir aralık; gün başına en fazla 3, çakışmasız), beyan ve şartların kabulü. Konum (harita)
 * dizinle birlikte v1.1'de (karar).
 */
export const organizationApplicationSchema = z
  .object({
    type: z.enum(organizationTypes, C.REQUIRED),
    name: z.string().trim().min(3, C.ORG_NAME_TOO_SHORT).max(120, C.ORG_NAME_TOO_LONG),
    registryNo: z
      .string()
      .trim()
      .regex(/^[A-Za-z0-9./-]{5,30}$/, C.REGISTRY_NO_INVALID),
    contactName: z.string().trim().min(3, C.NAME_TOO_SHORT).max(80, C.NAME_TOO_LONG),
    phone: z
      .string()
      .trim()
      .refine((v) => normalizeTurkishPhone(v) !== null, C.PHONE_INVALID),
    email: z.email(C.EMAIL_INVALID).max(200, C.EMAIL_INVALID),
    cityId: z.uuid(C.CITY_INVALID),
    districtId: z.uuid(C.REQUIRED),
    address: z.string().trim().min(10, C.ADDRESS_TOO_SHORT).max(200, C.ADDRESS_TOO_LONG),
    services: z.array(z.string()).min(1, C.SERVICES_REQUIRED).max(20),
    is24h: z.boolean().default(false),
    hours: z
      .array(hourRangeSchema)
      .max(7 * MAX_RANGES_PER_DAY)
      .default([]),
    declaration: z.literal(true, C.DECLARATION_REQUIRED),
    acceptTerms: z.literal(true, C.TERMS_NOT_ACCEPTED),
  })
  .superRefine((v, ctx) => {
    const allowed: readonly string[] = organizationServices[v.type]
    if (v.services.some((s) => !allowed.includes(s)))
      ctx.addIssue({ code: "custom", path: ["services"], message: C.SERVICES_REQUIRED })
    if (!v.is24h && v.hours.length === 0) ctx.addIssue({ code: "custom", path: ["hours"], message: C.HOURS_REQUIRED })
    if (!v.is24h && !hoursValid(v.hours)) ctx.addIssue({ code: "custom", path: ["hours"], message: C.HOURS_INVALID })
  })
export type OrganizationApplicationInput = z.input<typeof organizationApplicationSchema>
export type OrganizationApplicationData = z.output<typeof organizationApplicationSchema>

/** Başvuru durumları. */
export const applicationStatuses = ["pending", "approved", "rejected"] as const
export type ApplicationStatus = (typeof applicationStatuses)[number]

/** Admin başvuru listesinde sayfa boyu. */
export const ADMIN_APPLICATIONS_PAGE_SIZE = 20

/** GET /admin/organizations/applications: durum (varsayılan bekleyen), sayfa. */
export const adminApplicationsQuerySchema = z.object({
  status: z.enum(applicationStatuses).default("pending"),
  page: z.coerce.number().int().min(1).max(500).default(1),
  locale: z.enum(["tr", "en"]).default("tr"),
})
export type AdminApplicationsQuery = z.infer<typeof adminApplicationsQuerySchema>

/** POST /admin/organizations/applications/{id}/reject: kullanıcıya giden gerekçe (en az 10 karakter). */
export const rejectApplicationSchema = z.object({
  reason: z.string().trim().min(10, C.REASON_TOO_SHORT).max(1000),
})
