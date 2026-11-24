import type { Metadata } from "next"
import { Suspense } from "react"

import { ListingsFallback } from "@/components/listings/listings-fallback"
import { listingsMetadata, ListingsView } from "@/components/listings/listings-view"

/** Sekme başlığı ("Tüm ilanlar · Pati Dostu"). */
export function generateMetadata(): Promise<Metadata> {
  return listingsMetadata({})
}

/** Tüm ilanlar — /ilanlar (filtreler sorgu parametresinde). */
export default function ListingsPage({ searchParams }: PageProps<"/[locale]/listings">) {
  return (
    <Suspense fallback={<ListingsFallback />}>
      <ListingsView params={Promise.resolve({})} searchParams={searchParams} />
    </Suspense>
  )
}
