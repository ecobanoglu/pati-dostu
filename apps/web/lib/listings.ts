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
  gender: "unknown" | "male" | "female"
  vaccinated: boolean
  neutered: boolean
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

/** GET /listings/{ref} yanıtı (apps/api › ListingDetailDto). */
export type ListingDetailData = ListingCardData & {
  description: string | null
  breed: { name: string; slug: string } | null
  name: string | null
  ageGroup: "puppy" | "young" | "adult" | "senior" | null
  size: "small" | "medium" | "large" | null
  microchipped: boolean
  childFriendly: boolean
  source: "foster_home" | "street" | "shelter" | "clinic" | null
  lastSeenAddress: string | null
  viewCount: number
  images: Array<{ url: string }>
  owner: {
    id: string
    name: string
    image: string | null
    role: "user" | "clinic" | "shelter" | "admin"
    memberSince: string
    activeListings: number
  }
  contact: { showPhone: boolean; phoneMasked: string | null }
  microchipNumber: string | null
}

/**
 * Yayındaki ilanın detayı (oturumsuz, herkese açık veri): 1 dakika önbellekte. Yayında değilse ya da yoksa null.
 * Telefon numarası burada yoktur (yalnızca maskeli hâli); tam numara giriş yapmış kullanıcıya ayrı uçtan gelir.
 */
export async function getListing(listingNo: number, locale: string): Promise<ListingDetailData | null> {
  "use cache"
  cacheTag("listings", `listing:${listingNo}`)
  try {
    const res = await fetch(`${API_URL}/api/v1/listings/${listingNo}?locale=${locale}`)
    if (res.status === 404) {
      cacheLife("minutes")
      return null
    }
    if (!res.ok) throw new Error(`listing: ${res.status}`)
    cacheLife({ stale: 30, revalidate: 60, expire: 300 })
    return (await res.json()) as ListingDetailData
  } catch {
    cacheLife("seconds")
    return null
  }
}

/** Benzer ilanlar (aynı tür ve il, rastgele 4); 5 dakika önbellekte. */
export async function getSimilarListings(listingNo: number, locale: string): Promise<ListingCardData[]> {
  "use cache"
  cacheTag("listings")
  try {
    const res = await fetch(`${API_URL}/api/v1/listings/${listingNo}/similar?locale=${locale}`)
    if (!res.ok) throw new Error(`similar: ${res.status}`)
    cacheLife("minutes")
    return (await res.json()) as ListingCardData[]
  } catch {
    cacheLife("seconds")
    return []
  }
}
