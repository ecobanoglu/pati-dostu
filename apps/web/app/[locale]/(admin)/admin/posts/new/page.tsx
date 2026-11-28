import type { Metadata } from "next"
import { Suspense } from "react"

import { PostEditorPage, postEditorMetadata } from "@/features/admin-posts/post-editor-page"

/** Sekme başlığı. */
export function generateMetadata(): Promise<Metadata> {
  return postEditorMetadata()
}

/** Admin › Yeni yazı — /admin/yazilar/yeni (?tur=haber ile haber). */
export default function NewPostPage({ searchParams }: PageProps<"/[locale]/admin/posts/new">) {
  return (
    <Suspense fallback={<div className="mx-auto h-96 max-w-site" aria-hidden="true" />}>
      <PostEditorPage searchParams={searchParams} />
    </Suspense>
  )
}
