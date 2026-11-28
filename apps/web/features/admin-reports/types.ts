import type { ReportTarget } from "@pati-dostu/validators"

/** GET /admin/reports satırı (hedef başına bir dosya). */
export type ReportCaseRow = {
  targetType: ReportTarget
  targetId: string
  reason: string
  reasons: string[]
  reports: number
  firstAt: string
  lastAt: string
  outcome: "action_taken" | "no_violation" | null
  title: string
  subjectName: string
  listingNo: number | null
}

/** GET /admin/reports yanıtı. */
export type ReportCasePage = {
  items: ReportCaseRow[]
  total: number
  page: number
  pageSize: number
  counts: { open: number; closed: number; byTarget: Record<string, number> }
}

/** GET /admin/reports/{type}/{id} yanıtı. */
export type ReportCase = {
  targetType: ReportTarget
  targetId: string
  open: boolean
  reason: string
  title: string
  body: string | null
  live: boolean
  listing: { no: number; slug: string | null; title: string; status: string } | null
  topic: { slug: string; categorySlug: string; title: string } | null
  reports: Array<{
    id: string
    reason: string
    details: string | null
    status: string
    resolutionNote: string | null
    createdAt: string
    reporter: { id: string; name: string }
  }>
  subject: {
    id: string
    name: string
    email: string
    role: "user" | "clinic" | "shelter" | "admin"
    createdAt: string
    deleted: boolean
    banned: boolean
    banExpires: string | null
    listings: number
    pendingListings: Array<{ id: string; no: number; title: string }>
    previousReports: number
    warnings: number
  } | null
}
