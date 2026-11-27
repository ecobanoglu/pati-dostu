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
