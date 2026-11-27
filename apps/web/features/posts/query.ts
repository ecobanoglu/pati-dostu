import type { NewsRegion } from "@pati-dostu/validators"

type SearchParams = Record<string, string | string[] | undefined>

/** Blog / haber listesinin adresteki durumu: `kategori` (haberde `tur`), `bolge` (yalnız haber), `sayfa`. */
export type PostsState = { category: string | null; region: NewsRegion | null; page: number }

/** Adresteki Türkçe bölge değeri ↔ API değeri. */
const REGION_PARAM: Record<NewsRegion, string> = { tr: "turkiye", world: "dunya" }

/** Tek değerli sorgu parametresi (dizi gelirse ilki). */
function one(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v
}

/** Adres sorgusunu duruma çevirir; geçersiz değerler yok sayılır. */
export function parsePostsQuery(type: "blog" | "news", sp: SearchParams): PostsState {
  const category = one(type === "blog" ? sp.kategori : sp.tur)?.trim() || null
  const regionParam = one(sp.bolge)
  const region =
    type === "news"
      ? ((Object.keys(REGION_PARAM) as NewsRegion[]).find((r) => REGION_PARAM[r] === regionParam) ?? null)
      : null
  const page = Number.parseInt(one(sp.sayfa) ?? "1", 10)
  return {
    category: category && /^[a-z0-9-]{1,60}$/.test(category) ? category : null,
    region,
    page: Number.isFinite(page) && page >= 1 && page <= 500 ? page : 1,
  }
}

/** Durumdan liste adresi (varsayılan değerler adrese yazılmaz). */
export function postsHref(type: "blog" | "news", s: PostsState) {
  const query: Record<string, string> = {}
  if (s.category) query[type === "blog" ? "kategori" : "tur"] = s.category
  if (type === "news" && s.region) query.bolge = REGION_PARAM[s.region]
  if (s.page > 1) query.sayfa = String(s.page)
  return { pathname: type === "blog" ? ("/blog" as const) : ("/news" as const), query }
}

/** Durumdan GET /posts sorgusu. */
export function toPostsApiQuery(type: "blog" | "news", s: PostsState, locale: string): string {
  const q = new URLSearchParams({ type, page: String(s.page), locale })
  if (s.category) q.set("category", s.category)
  if (s.region) q.set("region", s.region)
  return q.toString()
}
