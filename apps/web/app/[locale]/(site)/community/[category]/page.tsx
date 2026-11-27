import type { Metadata } from "next"
import { Suspense } from "react"

import { CommunityFallback, communityMetadata, CommunityView } from "@/features/community/community-view"

/** Sekme başlığı ("Beslenme · Topluluk"). */
export async function generateMetadata({ params }: PageProps<"/[locale]/community/[category]">): Promise<Metadata> {
  const { category } = await params
  return communityMetadata(category)
}

/** Kategori yol parametresini okuyup listeyi çizer (parametre okunduğu için Suspense içinde). */
async function CategoryView({
  params,
  searchParams,
}: Pick<PageProps<"/[locale]/community/[category]">, "params" | "searchParams">) {
  const { category } = await params
  return <CommunityView category={decodeURIComponent(category)} searchParams={searchParams} />
}

/** Topluluk kategorisi — /topluluk/[kategori] (olmayan kategori 404). */
export default function CommunityCategoryPage({ params, searchParams }: PageProps<"/[locale]/community/[category]">) {
  return (
    <Suspense fallback={<CommunityFallback />}>
      <CategoryView params={params} searchParams={searchParams} />
    </Suspense>
  )
}
