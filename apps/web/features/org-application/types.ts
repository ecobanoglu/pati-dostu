import type { HourRange, OrganizationType } from "@pati-dostu/validators"

/** GET /organizations/applications/me › application (API OrganizationApplication). */
export type OrgApplication = {
  id: string
  type: OrganizationType
  name: string
  registryNo: string
  contactName: string | null
  phone: string | null
  email: string | null
  cityId: string
  districtId: string | null
  city: string
  district: string | null
  address: string
  services: string[]
  is24h: boolean
  hours: HourRange[]
  status: "pending" | "approved" | "rejected"
  rejectionReason: string | null
  submittedAt: string
  reviewedAt: string | null
}

/** Formdaki bir günün durumu: açık mı ve saat aralıkları. */
export type DayHours = { open: boolean; ranges: Array<{ opensAt: string; closesAt: string }> }

/** Varsayılan hafta (tasarım): hafta içi 09:00–19:00, cumartesi 10:00–17:00, pazar kapalı. */
export function defaultWeek(): DayHours[] {
  return Array.from({ length: 7 }, (_, day) =>
    day < 5
      ? { open: true, ranges: [{ opensAt: "09:00", closesAt: "19:00" }] }
      : day === 5
        ? { open: true, ranges: [{ opensAt: "10:00", closesAt: "17:00" }] }
        : { open: false, ranges: [{ opensAt: "09:00", closesAt: "19:00" }] }
  )
}

/** API'deki aralık listesinden form haftası (satırı olmayan gün kapalı). */
export function weekFromHours(hours: HourRange[]): DayHours[] {
  if (hours.length === 0) return defaultWeek()
  return Array.from({ length: 7 }, (_, day) => {
    const ranges = hours.filter((h) => h.weekday === day).map(({ opensAt, closesAt }) => ({ opensAt, closesAt }))
    return ranges.length ? { open: true, ranges } : { open: false, ranges: [{ opensAt: "09:00", closesAt: "19:00" }] }
  })
}

/** Form haftasından API'ye gidecek aralıklar (yalnız açık günler). */
export function hoursFromWeek(week: DayHours[]): HourRange[] {
  return week.flatMap((d, weekday) => (d.open ? d.ranges.map((r) => ({ weekday, ...r })) : []))
}
