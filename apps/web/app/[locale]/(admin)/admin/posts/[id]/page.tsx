import type { Metadata } from "next"
import { Suspense } from "react"

import { PostEditorPage, postEditorMetadata } from "@/features/admin-posts/post-editor-page"

/** Sekme başlığı. */
export function generateMetadata(): Promise<Metadata> {
  return postEditorMetadata()
}

/** Admin › Yazıyı düzenle — /admin/yazilar/[id]. */
export default function EditPostPage({ params }: PageProps<"/[locale]/admin/posts/[id]">) {
  return (
    <Suspense fallback={<div className="mx-auto h-96 max-w-site" aria-hidden="true" />}>
      <PostEditorPage params={params} />
    </Suspense>
  )
}
