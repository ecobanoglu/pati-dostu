import type { AdminPostSort, EditablePostStatus, PostType } from "@pati-dostu/validators"

type SearchParams = Record<string, string | string[] | undefined>

/** Admin yazı listesinin süzgeçleri (adresteki Türkçe sorgu ↔ API sorgusu). */
export type AdminPostsState = {
  type: PostType | null
  status: EditablePostStatus | null
  category: string | null
  q: string
  sort: AdminPostSort
  page: number
}

const TYPE_PARAM: Record<PostType, string> = { blog: "blog", news: "haber" }
const STATUS_PARAM: Record<EditablePostStatus, string> = { published: "yayinda", scheduled: "planli", draft: "taslak" }
const SORT_PARAM: Record<AdminPostSort, string> = { new: "yeni", old: "eski", views: "okunma" }

/** Sözlükte değerin anahtarını bulur (adresteki Türkçe karşılıktan). */
const keyOf = <K extends string>(map: Record<K, string>, value: string | undefined): K | null =>
  (Object.entries(map) as Array<[K, string]>).find(([, v]) => v === value)?.[0] ?? null

/** Tek değerli sorgu parametresi. */
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

/** Adresten süzgeç durumu: `tur`, `durum`, `kategori` (kimlik), `ara`, `sirala`, `sayfa`. Bilinmeyenler yok sayılır. */
export function parseAdminPostsQuery(sp: SearchParams): AdminPostsState {
  const category = one(sp.kategori)
  const page = Number(one(sp.sayfa))
  return {
    type: keyOf(TYPE_PARAM, one(sp.tur)),
    status: keyOf(STATUS_PARAM, one(sp.durum)),
    category: category && /^[0-9a-f-]{36}$/i.test(category) ? category : null,
    q: (one(sp.ara) ?? "").trim().slice(0, 100),
    sort: keyOf(SORT_PARAM, one(sp.sirala)) ?? "new",
    page: Number.isInteger(page) && page > 1 && page <= 500 ? page : 1,
  }
}

/** Süzgeç durumundan liste adresi (varsayılan değerler adrese yazılmaz). */
export function adminPostsHref(state: AdminPostsState) {
  const query: Record<string, string> = {}
  if (state.type) query.tur = TYPE_PARAM[state.type]
  if (state.status) query.durum = STATUS_PARAM[state.status]
  if (state.category) query.kategori = state.category
  if (state.q) query.ara = state.q
  if (state.sort !== "new") query.sirala = SORT_PARAM[state.sort]
  if (state.page > 1) query.sayfa = String(state.page)
  return { pathname: "/admin/posts" as const, query }
}

/** API sorgu dizesi (GET /admin/posts). */
export function toAdminPostsApiQuery(state: AdminPostsState, locale: string): string {
  const p = new URLSearchParams({ sort: state.sort, page: String(state.page), locale })
  if (state.type) p.set("type", state.type)
  if (state.status) p.set("status", state.status)
  if (state.category) p.set("category", state.category)
  if (state.q) p.set("q", state.q)
  return p.toString()
}
