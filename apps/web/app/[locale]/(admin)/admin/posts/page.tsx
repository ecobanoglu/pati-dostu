import type { Metadata } from "next"
import { Suspense } from "react"

import { AdminPostsView, adminPostsMetadata } from "@/features/admin-posts/posts-list-view"

/** Sekme başlığı. */
export function generateMetadata(): Promise<Metadata> {
  return adminPostsMetadata()
}

/** Admin › Blog ve haberler — /admin/yazilar. */
export default function AdminPostsPage({ searchParams }: PageProps<"/[locale]/admin/posts">) {
  return (
    <Suspense fallback={<div className="mx-auto h-96 max-w-site" aria-hidden="true" />}>
      <AdminPostsView searchParams={searchParams} />
    </Suspense>
  )
}
