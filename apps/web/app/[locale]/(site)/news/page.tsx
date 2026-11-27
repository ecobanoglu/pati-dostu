import type { Metadata } from "next"
import { Suspense } from "react"

import { newsMetadata, NewsView } from "@/features/posts/news-view"
import { PostsFallback } from "@/features/posts/posts-shared"

/** Sekme başlığı ("Haberler · Pati Dostu"). */
export function generateMetadata(): Promise<Metadata> {
  return newsMetadata()
}

/** Haberler — /haberler (bölge, tür ve sayfa sorguda). */
export default function NewsPage({ searchParams }: PageProps<"/[locale]/news">) {
  return (
    <Suspense fallback={<PostsFallback />}>
      <NewsView searchParams={searchParams} />
    </Suspense>
  )
}
