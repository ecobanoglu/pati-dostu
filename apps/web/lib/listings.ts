import "server-only"

import { cacheLife, cacheTag } from "next/cache"

import { API_URL } from "./api"

/** GET /listings kartı (apps/api › ListingCard). */
export type ListingCardData = {
  id: string
  listingNo: number
  slug: string | null
  title: string | null
  type: "adoption" | "foster" | "lost" | "found"
  status: string
  coverUrl: string | null
  species: { name: string; slug: string } | null
  city: { name: string; slug: string } | null
  district: string | null
  publishedAt: string | null
  createdAt: string
}

export type ListingPage = { items: ListingCardData[]; total: number; page: number; pageSize: number }

/**
 * Yayındaki ilanlar (GET /listings?…). Herkese açık veri: aynı sorgu 1 dakika önbellekte tutulur.
 * Admin bir ilanı onayladığında `listings` etiketiyle temizlenebilir (API → /api/revalidate, ileride).
 * API'ye ulaşılamazsa boş sayfa döner (önbellek kısa tutulur).
 */
export async function getListings(apiQuery: string): Promise<ListingPage> {
  "use cache"
  cacheTag("listings")
  try {
    const res = await fetch(`${API_URL}/api/v1/listings?${apiQuery}`)
    if (!res.ok) throw new Error(`listings: ${res.status}`)
    cacheLife({ stale: 30, revalidate: 60, expire: 300 })
    return (await res.json()) as ListingPage
  } catch {
    cacheLife("seconds")
    return { items: [], total: 0, page: 1, pageSize: 0 }
  }
}
