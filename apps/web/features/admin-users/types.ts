import type { UserRole } from "@pati-dostu/validators"

/** GET /admin/users satırı. */
export type AdminUserRow = {
  id: string
  name: string
  email: string
  image: string | null
  role: UserRole
  city: string | null
  createdAt: string
  deleted: boolean
  banned: boolean
  banExpires: string | null
  listings: number
  reports: number
}

/** GET /admin/users yanıtı. */
export type AdminUserPage = { items: AdminUserRow[]; total: number; page: number; pageSize: number }

/** GET /admin/users/{id} yanıtı. */
export type AdminUserDetail = AdminUserRow & {
  emailVerified: boolean
  phone: string | null
  bio: string | null
  banReason: string | null
  lastSeenAt: string | null
  listingsByStatus: Record<string, number>
  recentListings: Array<{ id: string; no: number; title: string; slug: string | null; status: string }>
  warnings: Array<{ reason: string; title: string; createdAt: string }>
  history: Array<{ action: string; detail: Record<string, unknown>; actorName: string; createdAt: string }>
  organization: { name: string; type: string; status: string } | null
}
