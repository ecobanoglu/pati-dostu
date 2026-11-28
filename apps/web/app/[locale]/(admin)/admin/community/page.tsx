import type { Metadata } from "next"
import { Suspense } from "react"

import { CommunityView, communityMetadata } from "@/features/admin-community/community-view"

/** Sekme başlığı. */
export function generateMetadata(): Promise<Metadata> {
  return communityMetadata()
}

/** Admin › Topluluk — /admin/topluluk (?sekme=cevaplar|silinenler&tur=cevap&ara=&kategori=&sirala=&sayfa=). */
export default function AdminCommunityPage({ searchParams }: PageProps<"/[locale]/admin/community">) {
  return (
    <Suspense fallback={<div className="h-96" aria-hidden="true" />}>
      <CommunityView searchParams={searchParams} />
    </Suspense>
  )
}
