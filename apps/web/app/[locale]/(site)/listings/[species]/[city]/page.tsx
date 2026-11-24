import type { Metadata } from "next"
import { Suspense } from "react"

import { ListingsFallback } from "@/features/listings/listings-fallback"
import { listingsMetadata, ListingsView } from "@/features/listings/listings-view"

/** Sekme başlığı ("İzmir – Kedi ilanları · Pati Dostu"). */
export async function generateMetadata({
  params,
}: PageProps<"/[locale]/listings/[species]/[city]">): Promise<Metadata> {
  const { species, city } = await params
  return listingsMetadata({ species, city })
}

/** Bir türün bir şehirdeki ilanları — /ilanlar/kedi/izmir. Geçersiz tür ya da şehir 404. */
export default function SpeciesCityListingsPage({
  params,
  searchParams,
}: PageProps<"/[locale]/listings/[species]/[city]">) {
  return (
    <Suspense fallback={<ListingsFallback />}>
      <ListingsView params={params} searchParams={searchParams} />
    </Suspense>
  )
}
