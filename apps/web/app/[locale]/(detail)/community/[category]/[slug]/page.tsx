import type { Metadata } from "next"
import { Suspense } from "react"

import { TopicDetailFallback, TopicDetailView, topicMetadata } from "@/features/community/topic-detail-view"

/** Sekme başlığı ve açıklama (konu başlığı + özet). */
export function generateMetadata({ params }: PageProps<"/[locale]/community/[category]/[slug]">): Promise<Metadata> {
  return topicMetadata(params)
}

/** Topluluk konusu — /topluluk/[kategori]/[konu] (mobilde odak düzeni: kendi üst çubuğu, alt menü yok). */
export default function TopicPage({ params }: PageProps<"/[locale]/community/[category]/[slug]">) {
  return (
    <Suspense fallback={<TopicDetailFallback />}>
      <TopicDetailView params={params} />
    </Suspense>
  )
}
