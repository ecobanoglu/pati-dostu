type SearchParams = Record<string, string | string[] | undefined>

/** Durum ↔ adresteki Türkçe karşılığı (bekleyen varsayılan, yazılmaz). */
const STATUS_PARAM = { approved: "onaylanan", rejected: "reddedilen" } as const

/** Kurum başvuruları sayfasının adres durumu: `durum`, `basvuru` (seçili kimlik), `sayfa`. */
export type ApplicationsState = {
  status: "pending" | "approved" | "rejected"
  selected: string | null
  page: number
}

/** Tek değerli sorgu parametresi. */
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

/** Adresten durum (bilinmeyen değerler yok sayılır). */
export function parseApplicationsQuery(sp: SearchParams): ApplicationsState {
  const durum = one(sp.durum)
  const id = one(sp.basvuru)
  const page = Number(one(sp.sayfa))
  return {
    status: durum === STATUS_PARAM.approved ? "approved" : durum === STATUS_PARAM.rejected ? "rejected" : "pending",
    selected: id && /^[0-9a-f-]{36}$/i.test(id) ? id : null,
    page: Number.isInteger(page) && page > 1 && page <= 500 ? page : 1,
  }
}

/** Durumdan sayfa adresi (varsayılanlar yazılmaz). */
export function applicationsHref(state: ApplicationsState) {
  const query: Record<string, string> = {}
  if (state.status !== "pending") query.durum = STATUS_PARAM[state.status]
  if (state.selected) query.basvuru = state.selected
  if (state.page > 1) query.sayfa = String(state.page)
  return { pathname: "/admin/organization-applications" as const, query }
}
