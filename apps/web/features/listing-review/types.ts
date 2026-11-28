import type { ReviewableField, ReviewFlag } from "@pati-dostu/validators"

import type { ListingCardData } from "@/lib/listings"

/** GET /admin/listings/queue öğesi. */
export type ReviewQueueItem = ListingCardData & {
  submittedAt: string | null
  owner: { id: string; name: string; role: "user" | "clinic" | "shelter" | "admin" }
  flags: ReviewFlag[]
}

/** GET /admin/listings/queue yanıtı. */
export type ReviewQueue = {
  items: ReviewQueueItem[]
  counts: { all: number; flagged: number; organization: number; resubmitted: number }
}

/** GET /admin/listings/{id}/review yanıtı. */
export type ReviewInfo = {
  status: string
  submittedAt: string | null
  resubmitted: boolean
  previousNote: string | null
  previousFields: ReviewableField[] | null
  flags: ReviewFlag[]
  contentMatches: Array<{ field: string; reason: string }>
  owner: {
    id: string
    name: string
    email: string
    emailVerified: boolean
    role: "user" | "clinic" | "shelter" | "admin"
    createdAt: string
    otherListings: number
    reports: number
    rejections: number
  }
}

/** GET /admin/listings/rejection-reasons öğesi. */
export type RejectionReasonOption = { id: string; slug: string; label: string }
