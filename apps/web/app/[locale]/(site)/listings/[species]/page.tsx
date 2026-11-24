import type { Metadata } from "next"
import { Suspense } from "react"

import { ListingsFallback } from "@/features/listings/listings-fallback"
import { listingsMetadata, ListingsView } from "@/features/listings/listings-view"

/** Sekme başlığı ("Kedi ilanları · Pati Dostu"). */
export async function generateMetadata({ params }: PageProps<"/[locale]/listings/[species]">): Promise<Metadata> {
  const { species } = await params
  return listingsMetadata({ species })
}

/** Bir türün ilanları — /ilanlar/kedi. Geçersiz tür 404. */
export default function SpeciesListingsPage({ params, searchParams }: PageProps<"/[locale]/listings/[species]">) {
  return (
    <Suspense fallback={<ListingsFallback />}>
      <ListingsView params={params} searchParams={searchParams} />
    </Suspense>
  )
}
