import type { AdminListingsQuery } from "@pati-dostu/validators"

type SearchParams = Record<string, string | string[] | undefined>
type Status = NonNullable<AdminListingsQuery["status"]>
type ListingType = NonNullable<AdminListingsQuery["type"]>

/** Admin › İlanlar süzgeçleri (adresteki Türkçe sorgu ↔ API). */
export type AdminListingsState = {
  status: Status | null
  type: ListingType | null
  q: string
  sort: AdminListingsQuery["sort"]
  page: number
}

const STATUS_PARAM: Record<Status, string> = {
  pending: "onayda",
  active: "yayinda",
  changes_requested: "duzeltme",
  rejected: "reddedildi",
  adopted: "sahiplendirildi",
  closed: "kapatildi",
}
/** İlan listesindeki (`/ilanlar?tip=`) ile aynı karşılıklar. */
const TYPE_PARAM: Record<ListingType, string> = {
  adoption: "sahiplendirme",
  foster: "gecici-yuva",
  lost: "kayip",
  found: "bulunan",
}
const SORT_PARAM: Record<AdminListingsState["sort"], string> = { new: "yeni", old: "eski", views: "okunma" }

/** Sözlükte değerin anahtarını bulur. */
const keyOf = <K extends string>(map: Record<K, string>, value: string | undefined): K | null =>
  (Object.entries(map) as Array<[K, string]>).find(([, v]) => v === value)?.[0] ?? null
/** Tek değerli sorgu parametresi. */
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

/** Adresten durum: `durum`, `tur`, `ara`, `sirala`, `sayfa` (bilinmeyen değerler yok sayılır). */
export function parseAdminListingsQuery(sp: SearchParams): AdminListingsState {
  const page = Number(one(sp.sayfa))
  return {
    status: keyOf(STATUS_PARAM, one(sp.durum)),
    type: keyOf(TYPE_PARAM, one(sp.tur)),
    q: (one(sp.ara) ?? "").trim().slice(0, 100),
    sort: keyOf(SORT_PARAM, one(sp.sirala)) ?? "new",
    page: Number.isInteger(page) && page > 1 && page <= 500 ? page : 1,
  }
}

/** Durumdan sayfa adresi (varsayılanlar yazılmaz). */
export function adminListingsHref(state: AdminListingsState) {
  const query: Record<string, string> = {}
  if (state.status) query.durum = STATUS_PARAM[state.status]
  if (state.type) query.tur = TYPE_PARAM[state.type]
  if (state.q) query.ara = state.q
  if (state.sort !== "new") query.sirala = SORT_PARAM[state.sort]
  if (state.page > 1) query.sayfa = String(state.page)
  return { pathname: "/admin/listings" as const, query }
}

/** API sorgu dizesi (GET /admin/listings). */
export function toAdminListingsApiQuery(state: AdminListingsState, locale: string): string {
  const p = new URLSearchParams({ sort: state.sort, page: String(state.page), locale })
  if (state.status) p.set("status", state.status)
  if (state.type) p.set("type", state.type)
  if (state.q) p.set("q", state.q)
  return p.toString()
}
