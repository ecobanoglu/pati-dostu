import type { Metadata } from "next"
import { Suspense } from "react"

import {
  ListingDetailFallback,
  listingDetailMetadata,
  ListingDetailView,
} from "@/components/listing-detail/listing-detail-view"

/** Sekme başlığı ve paylaşım önizlemesi (ilan başlığı, açıklama, kapak fotoğrafı). */
export async function generateMetadata({ params }: PageProps<"/[locale]/listing/[slug]">): Promise<Metadata> {
  const { slug } = await params
  return listingDetailMetadata(slug)
}

/** İlan detayı — /ilan/{slug}-{ilanNo}. Yayında olmayan ya da olmayan ilan 404. */
export default function ListingDetailPage({ params }: PageProps<"/[locale]/listing/[slug]">) {
  return (
    <Suspense fallback={<ListingDetailFallback />}>
      <ListingDetailView params={params} />
    </Suspense>
  )
}
