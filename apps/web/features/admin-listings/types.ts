import type { ListingCardData } from "@/lib/listings"

/** GET /admin/listings satırı. */
export type AdminListingRow = ListingCardData & {
  owner: { id: string; name: string; email: string }
  submittedAt: string | null
  viewCount: number
  updatedAt: string
}

/** GET /admin/listings yanıtı. */
export type AdminListingPage = {
  items: AdminListingRow[]
  total: number
  page: number
  pageSize: number
  counts: {
    all: number
    pending: number
    active: number
    changes_requested: number
    rejected: number
    adopted: number
    closed: number
  }
}

/** Hazır gerekçe (red / silme). */
export type ReasonOption = { id: string; slug: string; label: string }
