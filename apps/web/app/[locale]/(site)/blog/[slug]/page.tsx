import type { Metadata } from "next"
import { Suspense } from "react"

import { PostDetailFallback, PostDetailView, postMetadata } from "@/features/posts/post-detail-view"

/** Sekme başlığı, açıklama ve paylaşım kartı. */
export function generateMetadata({ params }: PageProps<"/[locale]/blog/[slug]">): Promise<Metadata> {
  return postMetadata("blog", params)
}

/** Blog yazısı — /blog/[slug]. */
export default function BlogPostPage({ params }: PageProps<"/[locale]/blog/[slug]">) {
  return (
    <Suspense fallback={<PostDetailFallback />}>
      <PostDetailView type="blog" params={params} />
    </Suspense>
  )
}
