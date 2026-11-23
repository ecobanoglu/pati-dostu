import "server-only"

import { cacheLife, cacheTag } from "next/cache"

import { API_URL } from "./api"

export type City = { id: string; name: string; slug: string; plateCode: number }

/**
 * İl listesi (GET /api/v1/cities). Nadiren değiştiği için bir gün önbelleklenir.
 * API'ye ulaşılamazsa (ör. derleme sırasında API kapalıysa) boş liste döner ve önbellek kısa tutulur;
 * böylece boş liste bir gün boyunca takılı kalmaz.
 */
export async function getCities(): Promise<City[]> {
  "use cache"
  cacheTag("cities")
  try {
    const res = await fetch(`${API_URL}/api/v1/cities`)
    if (!res.ok) throw new Error(`cities: ${res.status}`)
    cacheLife("days")
    return (await res.json()) as City[]
  } catch {
    cacheLife("seconds")
    return []
  }
}
