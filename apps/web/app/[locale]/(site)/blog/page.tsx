import type { Metadata } from "next"
import { Suspense } from "react"

import { blogMetadata, BlogView } from "@/features/posts/blog-view"
import { PostsFallback } from "@/features/posts/posts-shared"

/** Sekme başlığı ("Blog · Pati Dostu"). */
export function generateMetadata(): Promise<Metadata> {
  return blogMetadata()
}

/** Blog — /blog (kategori ve sayfa sorguda). */
export default function BlogPage({ searchParams }: PageProps<"/[locale]/blog">) {
  return (
    <Suspense fallback={<PostsFallback />}>
      <BlogView searchParams={searchParams} />
    </Suspense>
  )
}
