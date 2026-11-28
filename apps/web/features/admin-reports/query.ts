import type { ReportTarget } from "@pati-dostu/validators"

type SearchParams = Record<string, string | string[] | undefined>

/** Hedef türleri ↔ adresteki Türkçe karşılıkları. */
const TARGET_PARAM: Record<ReportTarget, string> = {
  listing: "ilan",
  comment: "yorum",
  user: "kullanici",
  topic: "konu",
  reply: "cevap",
}

/** Şikayetler sayfasının adres durumu: `durum` (açık / sonuçlanan), `hedef`, `dosya` (tür.kimlik), `sayfa`. */
export type ReportsState = {
  status: "open" | "closed"
  target: ReportTarget | null
  selected: { type: ReportTarget; id: string } | null
  page: number
}

/** Tek değerli sorgu parametresi. */
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

/** Adresten durum (bilinmeyen değerler yok sayılır). */
export function parseReportsQuery(sp: SearchParams): ReportsState {
  const target = (Object.entries(TARGET_PARAM) as Array<[ReportTarget, string]>).find(
    ([, v]) => v === one(sp.hedef)
  )?.[0]
  const file = one(sp.dosya)?.match(/^(listing|comment|user|topic|reply)\.([A-Za-z0-9-]{1,100})$/)
  const page = Number(one(sp.sayfa))
  return {
    status: one(sp.durum) === "sonuclanan" ? "closed" : "open",
    target: target ?? null,
    selected: file ? { type: file[1] as ReportTarget, id: file[2]! } : null,
    page: Number.isInteger(page) && page > 1 && page <= 500 ? page : 1,
  }
}

/** Durumdan sayfa adresi (varsayılanlar yazılmaz). */
export function reportsHref(state: ReportsState) {
  const query: Record<string, string> = {}
  if (state.status === "closed") query.durum = "sonuclanan"
  if (state.target) query.hedef = TARGET_PARAM[state.target]
  if (state.selected) query.dosya = `${state.selected.type}.${state.selected.id}`
  if (state.page > 1) query.sayfa = String(state.page)
  return { pathname: "/admin/reports" as const, query }
}
