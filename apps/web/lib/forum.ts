import "server-only"

import { cacheLife, cacheTag } from "next/cache"

import { API_URL } from "./api"

/** GET /forum/categories öğesi (apps/api › ForumCategory). */
export type ForumCategory = { id: string; slug: string; name: string; description: string | null; topicCount: number }

/** GET /forum/topics kartı (apps/api › ForumTopicCard). */
export type TopicCardData = {
  id: string
  slug: string
  title: string
  excerpt: string
  category: { slug: string; name: string }
  species: { slug: string; name: string } | null
  author: { id: string; name: string; image: string | null; role: "user" | "clinic" | "shelter" | "admin" }
  isSolved: boolean
  vetAnswered: boolean
  answerCount: number
  viewCount: number
  coverUrl: string | null
  createdAt: string
  lastActivityAt: string
}

export type TopicPageData = { items: TopicCardData[]; total: number; page: number; pageSize: number }

/**
 * Topluluk kategorileri (sırasıyla, konu sayılarıyla): 5 dakika önbellekte (`forum` etiketi). API'ye ulaşılamazsa
 * boş liste (önbellek kısa).
 */
export async function getForumCategories(locale: string): Promise<ForumCategory[]> {
  "use cache"
  cacheTag("forum")
  try {
    const res = await fetch(`${API_URL}/api/v1/forum/categories?locale=${locale}`)
    if (!res.ok) throw new Error(`forum categories: ${res.status}`)
    cacheLife({ stale: 60, revalidate: 300, expire: 3600 })
    return (await res.json()) as ForumCategory[]
  } catch {
    cacheLife("seconds")
    return []
  }
}

/**
 * Konu listesi (herkese açık): 1 dakika önbellekte (`forum` etiketi). Yeni konu açan kişi doğrudan konuya gittiği
 * için listedeki kısa gecikme sorun değil. API'ye ulaşılamazsa boş sayfa.
 */
export async function getTopics(apiQuery: string): Promise<TopicPageData> {
  "use cache"
  cacheTag("forum")
  try {
    const res = await fetch(`${API_URL}/api/v1/forum/topics?${apiQuery}`)
    if (!res.ok) throw new Error(`forum topics: ${res.status}`)
    cacheLife({ stale: 30, revalidate: 60, expire: 300 })
    return (await res.json()) as TopicPageData
  } catch {
    cacheLife("seconds")
    return { items: [], total: 0, page: 1, pageSize: 20 }
  }
}

/** Konu cevabı (apps/api › ForumReply). */
export type ReplyData = {
  id: string
  body: string
  author: TopicCardData["author"]
  likeCount: number
  isBestAnswer: boolean
  createdAt: string
}

/** GET /forum/topics/{slug} yanıtı (apps/api › ForumTopicDetail). */
export type TopicDetailData = TopicCardData & {
  categoryId: string
  body: string
  images: string[]
  replies: ReplyData[]
}

/** GET /forum/similar öğesi. */
export type SimilarTopicData = {
  id: string
  slug: string
  title: string
  category: { slug: string; name: string }
  answerCount: number
  isSolved: boolean
  vetAnswered: boolean
}

/**
 * Konu detayı + cevaplar: önbelleksiz (yeni cevap, beğeni ve en iyi cevap sayfa yenilenince hemen görünsün; detay
 * zaten oturuma bakan dinamik kısımda). Yoksa ya da silindiyse null.
 */
export async function getTopic(slug: string, locale: string): Promise<TopicDetailData | null> {
  const res = await fetch(`${API_URL}/api/v1/forum/topics/${encodeURIComponent(slug)}?locale=${locale}`, {
    cache: "no-store",
  })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`forum topic: ${res.status}`)
  return (await res.json()) as TopicDetailData
}

/** Benzer konular (başlığa göre, aynı kategori önce): 5 dakika önbellekte. Hata olursa boş liste. */
export async function getSimilarTopics(
  title: string,
  categoryId: string,
  exclude: string,
  locale: string
): Promise<SimilarTopicData[]> {
  "use cache"
  cacheTag("forum")
  try {
    const q = new URLSearchParams({ title: title.slice(0, 120), categoryId, exclude, locale })
    const res = await fetch(`${API_URL}/api/v1/forum/similar?${q}`)
    if (!res.ok) throw new Error(`forum similar: ${res.status}`)
    cacheLife({ stale: 60, revalidate: 300, expire: 3600 })
    return (await res.json()) as SimilarTopicData[]
  } catch {
    cacheLife("seconds")
    return []
  }
}
