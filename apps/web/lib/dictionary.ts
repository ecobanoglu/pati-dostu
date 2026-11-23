import "server-only"

import { cacheLife, cacheTag } from "next/cache"

import type { Locale } from "@/i18n/routing"

import { API_URL } from "./api"

export type City = { id: string; name: string; slug: string; plateCode: number }
export type District = { id: string; name: string; slug: string }
export type Species = { id: string; name: string; slug: string; icon: string | null }
export type Breed = {
  id: string
  name: string
  slug: string
  size: "small" | "medium" | "large" | null
  isMixed: boolean
}

/**
 * Sözlük verisini API'den okur ve önbelleğe alır ("use cache" fonksiyonlarının içinden çağrılır).
 * Başarılıysa bir gün saklanır; API'ye ulaşılamazsa (ör. derleme sırasında API kapalı) boş liste döner ve önbellek
 * kısa tutulur, böylece boş liste bir gün boyunca takılı kalmaz. Admin sözlüğü değiştirince `dictionary` etiketiyle
 * (revalidateTag) temizlenebilir.
 */
async function fetchDictionary<T>(path: string, tag: string): Promise<T[]> {
  cacheTag("dictionary", tag)
  try {
    const res = await fetch(`${API_URL}/api/v1${path}`)
    if (!res.ok) throw new Error(`${path}: ${res.status}`)
    cacheLife("days")
    return (await res.json()) as T[]
  } catch {
    cacheLife("seconds")
    return []
  }
}

/** İl listesi, Türkçe alfabetik (GET /cities). */
export async function getCities(): Promise<City[]> {
  "use cache"
  return fetchDictionary<City>("/cities", "cities")
}

/** Bir ilin ilçeleri (GET /cities/{id}/districts). */
export async function getDistricts(cityId: string): Promise<District[]> {
  "use cache"
  return fetchDictionary<District>(`/cities/${encodeURIComponent(cityId)}/districts`, `districts:${cityId}`)
}

/** Hayvan türleri, verilen dilde (GET /species?locale=). */
export async function getSpecies(locale: Locale): Promise<Species[]> {
  "use cache"
  return fetchDictionary<Species>(`/species?locale=${locale}`, "species")
}

/** Bir türün ırkları, verilen dilde; "Melez / Bilinmiyor" ilk sırada (GET /species/{id}/breeds?locale=). */
export async function getBreeds(speciesId: string, locale: Locale): Promise<Breed[]> {
  "use cache"
  return fetchDictionary<Breed>(
    `/species/${encodeURIComponent(speciesId)}/breeds?locale=${locale}`,
    `breeds:${speciesId}`
  )
}
