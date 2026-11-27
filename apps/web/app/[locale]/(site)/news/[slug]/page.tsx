import type { Metadata } from "next"
import { Suspense } from "react"

import { PostDetailFallback, PostDetailView, postMetadata } from "@/features/posts/post-detail-view"

/** Sekme başlığı, açıklama ve paylaşım kartı. */
export function generateMetadata({ params }: PageProps<"/[locale]/news/[slug]">): Promise<Metadata> {
  return postMetadata("news", params)
}

/** Haber — /haberler/[slug]. */
export default function NewsPostPage({ params }: PageProps<"/[locale]/news/[slug]">) {
  return (
    <Suspense fallback={<PostDetailFallback />}>
      <PostDetailView type="news" params={params} />
    </Suspense>
  )
}
