import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { Suspense } from "react"

import { ListingFormFallback, ListingFormPage } from "@/components/listing-form/listing-form-page"

/** Sekme başlığı; arama motorları form sayfasını dizinlemez. */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("ListingForm")
  return { title: t("metaTitle"), robots: { index: false } }
}

/** İlan ver (YZ'siz) — /ilan-ver. */
export default function PostListingPage() {
  return (
    <Suspense fallback={<ListingFormFallback />}>
      <ListingFormPage />
    </Suspense>
  )
}
