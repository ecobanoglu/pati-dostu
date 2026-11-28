type SearchParams = Record<string, string | string[] | undefined>

/** Kuyruk süzgeçleri (API) ↔ adresteki Türkçe karşılıkları. */
const FILTER_PARAM = { flagged: "isaretli", organization: "kurum", resubmitted: "duzenlenmis" } as const
export type ReviewFilter = "all" | keyof typeof FILTER_PARAM
export type ReviewSort = "oldest" | "newest"

/** İlan onayı sayfasının adres durumu: seçili ilan (`ilan` = ilan no), `suzgec`, `sirala`. */
export type ReviewState = { listingNo: number | null; filter: ReviewFilter; sort: ReviewSort }

/** Tek değerli sorgu parametresi. */
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

/** Adresten durum (bilinmeyen değerler yok sayılır). */
export function parseReviewQuery(sp: SearchParams): ReviewState {
  const no = Number(one(sp.ilan))
  const f = one(sp.suzgec)
  const filter = (Object.entries(FILTER_PARAM).find(([, v]) => v === f)?.[0] as ReviewFilter | undefined) ?? "all"
  return {
    listingNo: Number.isInteger(no) && no > 0 ? no : null,
    filter,
    sort: one(sp.sirala) === "yeni" ? "newest" : "oldest",
  }
}

/** Durumdan sayfa adresi (varsayılanlar yazılmaz). */
export function reviewHref(state: ReviewState) {
  const query: Record<string, string> = {}
  if (state.filter !== "all") query.suzgec = FILTER_PARAM[state.filter]
  if (state.sort === "newest") query.sirala = "yeni"
  if (state.listingNo) query.ilan = String(state.listingNo)
  return { pathname: "/admin/listing-review" as const, query }
}
