type SearchParams = Record<string, string | string[] | undefined>

/**
 * Admin › Topluluk adres durumu: sekme (`sekme` = cevaplar | silinenler; varsayılan konular), silinenlerde içerik türü
 * (`tur=cevap`), arama (`ara`), kategori (`kategori` slug), sıralama (`sirala` = eski | cevap; yalnız konular), sayfa.
 */
export type CommunityState = {
  tab: "topics" | "replies" | "deleted"
  /** Silinenler sekmesinde: konular mı cevaplar mı. */
  kind: "topics" | "replies"
  q: string
  category: string | null
  sort: "new" | "old" | "replies"
  page: number
}

/** Tek değerli sorgu parametresi. */
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

/** Adresten durum (bilinmeyen değerler yok sayılır). */
export function parseCommunityQuery(sp: SearchParams): CommunityState {
  const sekme = one(sp.sekme)
  const sirala = one(sp.sirala)
  const category = one(sp.kategori)
  const page = Number(one(sp.sayfa))
  return {
    tab: sekme === "cevaplar" ? "replies" : sekme === "silinenler" ? "deleted" : "topics",
    kind: one(sp.tur) === "cevap" ? "replies" : "topics",
    q: (one(sp.ara) ?? "").trim().slice(0, 100),
    category: category && /^[a-z0-9-]{1,60}$/.test(category) ? category : null,
    sort: sirala === "eski" ? "old" : sirala === "cevap" ? "replies" : "new",
    page: Number.isInteger(page) && page > 1 && page <= 500 ? page : 1,
  }
}

/** Durumdan sayfa adresi (varsayılanlar yazılmaz). */
export function communityHref(state: CommunityState) {
  const query: Record<string, string> = {}
  if (state.tab === "replies") query.sekme = "cevaplar"
  if (state.tab === "deleted") {
    query.sekme = "silinenler"
    if (state.kind === "replies") query.tur = "cevap"
  }
  if (state.q) query.ara = state.q
  if (state.category) query.kategori = state.category
  if (state.tab === "topics" && state.sort !== "new") query.sirala = state.sort === "old" ? "eski" : "cevap"
  if (state.page > 1) query.sayfa = String(state.page)
  return { pathname: "/admin/community" as const, query }
}

/** API adresi: hangi uç (konular / cevaplar) ve sorgu. */
export function communityApiPath(state: CommunityState, locale: string): string {
  const topics = state.tab === "topics" || (state.tab === "deleted" && state.kind === "topics")
  const params = new URLSearchParams({ page: String(state.page), locale })
  if (state.tab === "deleted") params.set("status", "deleted")
  if (state.q) params.set("q", state.q)
  if (state.category) params.set("category", state.category)
  if (state.tab === "topics") params.set("sort", state.sort)
  return `/admin/forum/${topics ? "topics" : "replies"}?${params.toString()}`
}
