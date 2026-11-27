import "server-only"

import { cacheLife, cacheTag } from "next/cache"

import { API_URL } from "./api"

type Named = { slug: string; name: string }

/** GET /posts kartı (apps/api › PostCard). */
export type PostCardData = {
  id: string
  type: "blog" | "news"
  slug: string
  title: string
  excerpt: string | null
  coverUrl: string | null
  category: Named | null
  /** Haber: "tr" (Türkiye) ya da "world"; blogda null. */
  region: "tr" | "world" | null
  sourceName: string | null
  readingTime: number | null
  featured: boolean
  publishedAt: string
  author: { name: string; image: string | null }
}

/** GET /posts yanıtı (apps/api › PostPage). */
export type PostPageData = {
  items: PostCardData[]
  featured: PostCardData | null
  total: number
  page: number
  pageSize: number
  categories: Named[]
}

/** GET /posts/{slug} yanıtı (apps/api › PostDetail). */
export type PostDetailData = PostCardData & {
  content: Record<string, unknown>
  tags: Named[]
  sourceUrl: string | null
  related: PostCardData[]
}

/**
 * Blog / haber listesi: 5 dakika önbellekte (`posts` etiketi — editör yayınlayınca 7. adımda temizlenir). API'ye
 * ulaşılamazsa boş sayfa (önbellek kısa).
 */
export async function getPosts(apiQuery: string): Promise<PostPageData> {
  "use cache"
  cacheTag("posts")
  try {
    const res = await fetch(`${API_URL}/api/v1/posts?${apiQuery}`)
    if (!res.ok) throw new Error(`posts: ${res.status}`)
    cacheLife({ stale: 60, revalidate: 300, expire: 3600 })
    return (await res.json()) as PostPageData
  } catch {
    cacheLife("seconds")
    return { items: [], featured: null, total: 0, page: 1, pageSize: 10, categories: [] }
  }
}

/**
 * Yazı detayı (içerik, etiketler, ilgili yazılar): 5 dakika önbellekte (`posts` etiketi). Yoksa ya da yayında
 * değilse null; API hatasında fırlatır (yanlışlıkla 404 önbelleğe alınmasın).
 */
export async function getPost(slug: string, locale: string): Promise<PostDetailData | null> {
  "use cache"
  cacheTag("posts")
  cacheLife({ stale: 60, revalidate: 300, expire: 3600 })
  const res = await fetch(`${API_URL}/api/v1/posts/${encodeURIComponent(slug)}?locale=${locale}`)
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`post: ${res.status}`)
  return (await res.json()) as PostDetailData
}
