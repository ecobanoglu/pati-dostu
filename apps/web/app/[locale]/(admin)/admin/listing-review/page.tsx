import type { Metadata } from "next"
import { Suspense } from "react"

import { ReviewView, reviewMetadata } from "@/features/listing-review/review-view"

/** Sekme başlığı. */
export function generateMetadata(): Promise<Metadata> {
  return reviewMetadata()
}

/** Admin › İlan onayı — /admin/ilan-onayi (?ilan={no}&suzgec=&sirala=). */
export default function ListingReviewPage({ searchParams }: PageProps<"/[locale]/admin/listing-review">) {
  return (
    <Suspense fallback={<div className="h-96" aria-hidden="true" />}>
      <ReviewView searchParams={searchParams} />
    </Suspense>
  )
}
