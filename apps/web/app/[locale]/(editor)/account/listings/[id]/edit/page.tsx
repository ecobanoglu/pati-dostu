import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { Suspense } from "react"

import { ListingFormFallback, ListingFormPage } from "@/components/listing-form/listing-form-page"

/** Sekme başlığı; arama motorları form sayfasını dizinlemez. */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("ListingForm")
  return { title: t("metaTitleEdit"), robots: { index: false } }
}

/** İlanın parametresini okur ve formu yükler (parametre istek anında belli olduğu için Suspense içinde). */
async function EditListing({ params }: { params: PageProps<"/[locale]/account/listings/[id]/edit">["params"] }) {
  const { id } = await params
  return <ListingFormPage listingId={id} />
}

/** İlanı düzenle / taslaktan devam et — /hesabim/ilanlarim/{id}/duzenle. */
export default function EditListingPage({ params }: PageProps<"/[locale]/account/listings/[id]/edit">) {
  return (
    <Suspense fallback={<ListingFormFallback />}>
      <EditListing params={params} />
    </Suspense>
  )
}
