import type { listingFeatures } from "@pati-dostu/validators"

/*
 * İlan listesi filtrelerinin adres (URL) karşılığı. Tür ve şehir yol parçasıdır (/ilanlar/kedi/izmir, SEO dostu),
 * diğerleri Türkçe sorgu parametresidir: ?tip=sahiplendirme,kayip&yas=yavru&ozellik=asili&ara=tekir&sirala=eski&sayfa=2
 * Değerler URL'de Türkçe, API'de İngilizce (enum) — çeviri burada yapılır.
 */

type Feature = (typeof listingFeatures)[number]

/** Sorgu parametresi değerleri: Türkçe (URL) ↔ API enum. */
const VALUE_MAPS = {
  type: { sahiplendirme: "adoption", "gecici-yuva": "foster", kayip: "lost", bulunan: "found" },
  ageGroup: { yavru: "puppy", genc: "young", yetiskin: "adult", yasli: "senior" },
  gender: { erkek: "male", disi: "female" },
  size: { kucuk: "small", orta: "medium", buyuk: "large" },
  source: { "gecici-ev": "foster_home", sokak: "street", barinak: "shelter", klinik: "clinic" },
  features: { asili: "vaccinated", kisir: "neutered", mikrocipli: "microchipped", "cocuk-dostu": "childFriendly" },
} as const

/** Filtre adı → sorgu parametresi adı. */
const PARAM = {
  type: "tip",
  ageGroup: "yas",
  gender: "cinsiyet",
  size: "boyut",
  source: "kimden",
  features: "ozellik",
  breed: "irk",
  district: "ilce",
  q: "ara",
  sort: "sirala",
  page: "sayfa",
} as const

export type ListFilter = keyof typeof VALUE_MAPS
type ApiValue<K extends ListFilter> = (typeof VALUE_MAPS)[K][keyof (typeof VALUE_MAPS)[K]]

/** Listenin tüm filtreleri (API değerleriyle). */
export type ListingFilters = {
  species: string | null
  city: string | null
  district: string | null
  breed: string | null
  type: ApiValue<"type">[]
  ageGroup: ApiValue<"ageGroup">[]
  gender: ApiValue<"gender">[]
  size: ApiValue<"size">[]
  source: ApiValue<"source">[]
  features: Feature[]
  q: string | null
  sort: "newest" | "oldest"
  page: number
}

export const emptyFilters: ListingFilters = {
  species: null,
  city: null,
  district: null,
  breed: null,
  type: [],
  ageGroup: [],
  gender: [],
  size: [],
  source: [],
  features: [],
  q: null,
  sort: "newest",
  page: 1,
}

export const LIST_FILTERS = Object.keys(VALUE_MAPS) as ListFilter[]

type SearchParams = Record<string, string | string[] | undefined>

/** Tek değerli parametre (dizi gelirse ilki). */
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || null

/** Slug olarak geçerli mi (küçük harf, rakam, tire)? Geçersiz değerler yok sayılır. */
const slug = (v: string | null) => (v && /^[a-z0-9-]{1,80}$/.test(v) ? v : null)

/** URL'deki Türkçe değer listesini API değerlerine çevirir; bilinmeyenleri atar. */
function parseList<K extends ListFilter>(key: K, raw: string | null): ApiValue<K>[] {
  if (!raw) return []
  const map = VALUE_MAPS[key] as unknown as Record<string, ApiValue<K>>
  return [
    ...new Set(
      raw
        .split(",")
        .map((v) => map[v.trim()])
        .filter((v): v is ApiValue<K> => Boolean(v))
    ),
  ]
}

/**
 * Yol parçaları (tür, şehir) ve sorgu parametrelerinden filtreleri okur. Tür/şehir yol yerine sorguda da gelebilir
 * (?tur=kedi&sehir=izmir: anasayfa arama formu; ya da yalnız şehir seçilince).
 */
export function parseFilters(path: { species?: string; city?: string }, search: SearchParams): ListingFilters {
  const page = Number(first(search[PARAM.page]))
  return {
    species: slug(path.species ?? first(search.tur)),
    city: slug(path.city ?? first(search.sehir)),
    district: slug(first(search[PARAM.district])),
    breed: slug(first(search[PARAM.breed])),
    type: parseList("type", first(search[PARAM.type])),
    ageGroup: parseList("ageGroup", first(search[PARAM.ageGroup])),
    gender: parseList("gender", first(search[PARAM.gender])),
    size: parseList("size", first(search[PARAM.size])),
    source: parseList("source", first(search[PARAM.source])),
    features: parseList("features", first(search[PARAM.features])) as Feature[],
    q: first(search[PARAM.q])?.slice(0, 100) ?? null,
    sort: first(search[PARAM.sort]) === "eski" ? "oldest" : "newest",
    page: Number.isInteger(page) && page >= 1 && page <= 1000 ? page : 1,
  }
}

/** API değerini URL'deki Türkçe karşılığına çevirir. */
function toUrlValue<K extends ListFilter>(key: K, value: ApiValue<K>): string {
  const entry = Object.entries(VALUE_MAPS[key]).find(([, v]) => v === value)
  return entry ? entry[0] : String(value)
}

/** Filtrelerin sorgu parametreleri (tür ve şehir hariç; onlar yol parçası). Boş/varsayılanlar yazılmaz. */
export function toSearchParams(f: ListingFilters): Record<string, string> {
  const out: Record<string, string> = {}
  for (const key of LIST_FILTERS) {
    const values = f[key] as ApiValue<typeof key>[]
    if (values.length) out[PARAM[key]] = values.map((v) => toUrlValue(key, v)).join(",")
  }
  if (f.district) out[PARAM.district] = f.district
  if (f.breed) out[PARAM.breed] = f.breed
  if (f.q) out[PARAM.q] = f.q
  if (f.sort === "oldest") out[PARAM.sort] = "eski"
  if (f.page > 1) out[PARAM.page] = String(f.page)
  return out
}

/** Filtrelerin dile duyarlı bağlantı hedefi (@/i18n/navigation Link/router için). İlçe şehir olmadan anlamsızdır. */
export function filtersHref(f: ListingFilters) {
  const query = toSearchParams(f)
  if (f.species && f.city) {
    return { pathname: "/listings/[species]/[city]" as const, params: { species: f.species, city: f.city }, query }
  }
  if (f.species) return { pathname: "/listings/[species]" as const, params: { species: f.species }, query }
  // Şehir var ama tür yoksa şehir sorgu parametresine düşer (yol yapısı /tür/şehir).
  return { pathname: "/listings" as const, query: f.city ? { ...query, sehir: f.city } : query }
}

/** API isteği (GET /listings) için sorgu dizesi. */
export function toApiQuery(f: ListingFilters, locale: string, pageSize: number): string {
  const params = new URLSearchParams({ locale, pageSize: String(pageSize), page: String(f.page), sort: f.sort })
  if (f.species) params.set("species", f.species)
  if (f.city) params.set("city", f.city)
  if (f.district) params.set("district", f.district)
  if (f.breed) params.set("breed", f.breed)
  if (f.q) params.set("q", f.q)
  for (const key of LIST_FILTERS) {
    const values = f[key] as string[]
    if (values.length) params.set(key, values.join(","))
  }
  return params.toString()
}

/** Kaç filtre seçili (mobil "Filtreler (4)" rozeti; tür dahil, sıralama ve sayfa hariç). */
export function activeFilterCount(f: ListingFilters): number {
  return (
    LIST_FILTERS.reduce((n, key) => n + (f[key] as unknown[]).length, 0) +
    [f.species, f.city, f.district, f.breed, f.q].filter(Boolean).length
  )
}
