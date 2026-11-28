import type { EditablePostStatus, PostType } from "@pati-dostu/validators"

/** GET /admin/posts satırı. */
export type AdminPostRow = {
  id: string
  type: PostType
  title: string
  slug: string
  /** Görünen durum (saati gelmiş planlı yazı "published"). */
  status: EditablePostStatus
  category: { id: string; name: string } | null
  region: "tr" | "world" | null
  featured: boolean
  publishedAt: string | null
  viewCount: number
  updatedAt: string
}

/** GET /admin/posts yanıtı. */
export type AdminPostPage = {
  items: AdminPostRow[]
  total: number
  page: number
  pageSize: number
  counts: { all: number; blog: number; news: number; published: number; scheduled: number; draft: number }
}

/** GET /admin/posts/{id} (ve kaydetme yanıtı). */
export type AdminPostDetail = {
  id: string
  type: PostType
  status: EditablePostStatus
  title: string
  slug: string
  excerpt: string
  content: Record<string, unknown>
  cover: { key: string; url: string } | null
  categoryId: string | null
  tags: string[]
  featured: boolean
  country: string | null
  sourceName: string | null
  sourceUrl: string | null
  publishedAt: string | null
  everPublished: boolean
  readingTime: number
  viewCount: number
  updatedAt: string
}

/** GET /admin/posts/options: kategoriler ve etiket önerileri. */
export type AdminPostOptions = {
  categories: Array<{ id: string; type: PostType; slug: string; name: string }>
  tags: string[]
}
