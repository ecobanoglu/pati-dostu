import type { AdminUserStatus, UserRole } from "@pati-dostu/validators"

type SearchParams = Record<string, string | string[] | undefined>

/** Admin › Kullanıcılar adres durumu: `ara`, `rol`, `durum`, `sayfa`, `kullanici` (seçili kullanıcının kimliği). */
export type UsersState = {
  q: string
  role: UserRole | null
  status: AdminUserStatus | null
  page: number
  selected: string | null
}

const ROLE_PARAM: Record<UserRole, string> = { user: "uye", clinic: "klinik", shelter: "barinak", admin: "admin" }
const STATUS_PARAM: Record<AdminUserStatus, string> = { active: "etkin", banned: "askida", deleted: "silinmis" }

/** Sözlükte değerin anahtarını bulur. */
const keyOf = <K extends string>(map: Record<K, string>, value: string | undefined): K | null =>
  (Object.entries(map) as Array<[K, string]>).find(([, v]) => v === value)?.[0] ?? null
/** Tek değerli sorgu parametresi. */
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

/** Adresten durum (bilinmeyen değerler yok sayılır). */
export function parseUsersQuery(sp: SearchParams): UsersState {
  const page = Number(one(sp.sayfa))
  const selected = one(sp.kullanici)
  return {
    q: (one(sp.ara) ?? "").trim().slice(0, 100),
    role: keyOf(ROLE_PARAM, one(sp.rol)),
    status: keyOf(STATUS_PARAM, one(sp.durum)),
    page: Number.isInteger(page) && page > 1 && page <= 1000 ? page : 1,
    selected: selected && /^[A-Za-z0-9_-]{1,100}$/.test(selected) ? selected : null,
  }
}

/** Durumdan sayfa adresi (varsayılanlar yazılmaz). */
export function usersHref(state: UsersState) {
  const query: Record<string, string> = {}
  if (state.q) query.ara = state.q
  if (state.role) query.rol = ROLE_PARAM[state.role]
  if (state.status) query.durum = STATUS_PARAM[state.status]
  if (state.page > 1) query.sayfa = String(state.page)
  if (state.selected) query.kullanici = state.selected
  return { pathname: "/admin/users" as const, query }
}

/** API sorgu dizesi (GET /admin/users ve CSV). */
export function toUsersApiQuery(state: UsersState, withPage = true): string {
  const p = new URLSearchParams()
  if (withPage) p.set("page", String(state.page))
  if (state.q) p.set("q", state.q)
  if (state.role) p.set("role", state.role)
  if (state.status) p.set("status", state.status)
  return p.toString()
}
