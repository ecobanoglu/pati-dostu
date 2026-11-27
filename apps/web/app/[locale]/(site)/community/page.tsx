import type { Metadata } from "next"
import { Suspense } from "react"

import { CommunityFallback, communityMetadata, CommunityView } from "@/features/community/community-view"

/** Sekme başlığı ("Topluluk · Pati Dostu"). */
export function generateMetadata(): Promise<Metadata> {
  return communityMetadata(null)
}

/** Topluluk — /topluluk (tüm konular; arama, sıralama, sayfa sorguda). */
export default function CommunityPage({ searchParams }: PageProps<"/[locale]/community">) {
  return (
    <Suspense fallback={<CommunityFallback />}>
      <CommunityView category={null} searchParams={searchParams} />
    </Suspense>
  )
}
