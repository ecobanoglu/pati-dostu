import type { TopicSort } from "@pati-dostu/validators"

/** Adresteki sıralama değerleri (Türkçe; ilan listesindeki gibi) ↔ API değerleri. */
const SORT_URL: Record<TopicSort, string> = { new: "yeni", popular: "populer", unanswered: "cevapsiz" }

/** Topluluk listesinin adres durumu: kategori (yol parçası), arama, sıralama, sayfa. */
export type CommunityQuery = { category: string | null; q: string | null; sort: TopicSort; page: number }

type SearchParams = Record<string, string | string[] | undefined>

/** İlk değeri okur (aynı anahtar birden çok kez verilmişse). */
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

/** Adresten liste durumunu okur; geçersiz değerler varsayılana döner (sıralama "yeni", sayfa 1). */
export function parseCommunityQuery(category: string | null, search: SearchParams): CommunityQuery {
  const q = one(search.ara)?.trim().slice(0, 100) || null
  const sortUrl = one(search.sirala)
  const sort = (Object.entries(SORT_URL).find(([, url]) => url === sortUrl)?.[0] as TopicSort | undefined) ?? "new"
  const page = Math.min(500, Math.max(1, Number.parseInt(one(search.sayfa) ?? "1", 10) || 1))
  return { category, q, sort, page }
}

/** Liste durumunun bağlantısı (kategori yol parçasında, diğerleri Türkçe sorguda; varsayılanlar yazılmaz). */
export function communityHref(state: CommunityQuery) {
  const query: Record<string, string> = {}
  if (state.q) query.ara = state.q
  if (state.sort !== "new") query.sirala = SORT_URL[state.sort]
  if (state.page > 1) query.sayfa = String(state.page)
  return state.category
    ? { pathname: "/community/[category]" as const, params: { category: state.category }, query }
    : { pathname: "/community" as const, query }
}

/** API sorgusu (GET /forum/topics). */
export function toTopicsApiQuery(state: CommunityQuery, locale: string, page = state.page): string {
  const p = new URLSearchParams({ sort: state.sort, page: String(page), locale })
  if (state.category) p.set("category", state.category)
  if (state.q) p.set("q", state.q)
  return p.toString()
}

/**
 * Toplulukta gösterilen ad: bireysel üyede ad + soyadının baş harfi ("Elif K." — tasarım), kurum hesabında tam ad
 * (klinik ve barınak adı kısaltılmaz).
 */
export function displayName(name: string, role: string, locale: string): string {
  if (role === "clinic" || role === "shelter") return name
  const parts = name.trim().split(/\s+/)
  if (parts.length < 2) return name
  return `${parts.slice(0, -1).join(" ")} ${parts.at(-1)!.charAt(0).toLocaleUpperCase(locale)}.`
}
