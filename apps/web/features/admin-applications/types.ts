import type { HourRange, OrganizationType } from "@pati-dostu/validators"

type Status = "pending" | "approved" | "rejected"

/** GET /admin/organizations/applications › items[] */
export type AdminApplicationRow = {
  id: string
  type: OrganizationType
  name: string
  city: string
  district: string | null
  contactName: string | null
  applicant: { id: string; name: string; email: string }
  status: Status
  submittedAt: string
  reviewedAt: string | null
  resubmitted: boolean
}

/** GET /admin/organizations/applications */
export type AdminApplicationPage = {
  items: AdminApplicationRow[]
  total: number
  page: number
  pageSize: number
  counts: Record<Status, number>
}

/** GET /admin/organizations/applications/{id} */
export type AdminApplicationDetail = {
  id: string
  type: OrganizationType
  name: string
  registryNo: string
  contactName: string | null
  phone: string | null
  email: string | null
  city: string
  district: string | null
  address: string
  services: string[]
  is24h: boolean
  hours: HourRange[]
  status: Status
  rejectionReason: string | null
  submittedAt: string
  reviewedAt: string | null
  applicant: {
    id: string
    name: string
    email: string
    emailVerified: boolean
    role: string
    createdAt: string
    listings: number
  }
  reviewer: string | null
  resubmitted: boolean
}
