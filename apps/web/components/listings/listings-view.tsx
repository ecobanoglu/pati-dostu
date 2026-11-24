import type { Metadata } from "next"
import { getLocale, getTranslations } from "next-intl/server"
import { notFound } from "next/navigation"

import { Link } from "@/i18n/navigation"
import type { Locale } from "@/i18n/routing"
import { getBreeds, getCities, getDistricts, getSpecies } from "@/lib/dictionary"
import { LIST_FILTERS, type ListingFilters, parseFilters, toApiQuery } from "@/lib/listing-filters"
import { getListings } from "@/lib/listings"

import { FilterPanel } from "./filter-panel"
import { type FilterChip, ListingResults } from "./listing-results"

/** Sayfa başına ilan (3 ve 2 sütuna tam bölünür). */
const PAGE_SIZE = 18

type PathParams = { species?: string; city?: string }
type SearchParams = Record<string, string | string[] | undefined>

/** Çok seçimli filtrelerin Listing çeviri grupları (etiket adları için). */
const LABEL_GROUP: Record<(typeof LIST_FILTERS)[number], string> = {
  type: "type",
  ageGroup: "ageGroup",
  gender: "gender",
  size: "size",
  source: "source",
  features: "feature",
}

/**
 * Filtreleri ve sözlük adlarını çözer. Yol parçasındaki tür/şehir geçersizse 404 (sahte kategori sayfası olmasın);
 * sorgudaki geçersiz değerler yok sayılır.
 */
async function resolve(path: PathParams, search: SearchParams) {
  const locale = (await getLocale()) as Locale
  const filters = parseFilters(path, search)
  const [species, cities] = await Promise.all([getSpecies(locale), getCities()])

  const speciesItem = species.find((s) => s.slug === filters.species) ?? null
  const cityItem = cities.find((c) => c.slug === filters.city) ?? null
  if ((path.species && !speciesItem) || (path.city && !cityItem)) notFound()
  if (!speciesItem) filters.species = null
  if (!cityItem) filters.city = null

  const [districts, breeds] = await Promise.all([
    cityItem ? getDistricts(cityItem.id) : Promise.resolve([]),
    speciesItem ? getBreeds(speciesItem.id, locale) : Promise.resolve([]),
  ])
  if (filters.district && !districts.some((d) => d.slug === filters.district)) filters.district = null
  if (filters.breed && !breeds.some((b) => b.slug === filters.breed)) filters.breed = null

  return { locale, filters, species, cities, districts, breeds, speciesItem, cityItem }
}

/** Sayfa başlığı: "Kedi ilanları" / "Tüm ilanlar"; şehir varsa sekme başlığında "İzmir – Kedi ilanları". */
export async function listingsMetadata(path: PathParams): Promise<Metadata> {
  const locale = (await getLocale()) as Locale
  const t = await getTranslations("ListingsPage")
  const [species, cities] = await Promise.all([getSpecies(locale), getCities()])
  const s = species.find((x) => x.slug === path.species)
  const c = cities.find((x) => x.slug === path.city)
  const title = s ? t("titleSpecies", { species: s.name }) : t("titleAll")
  return { title: c ? t("metaTitleCity", { city: c.name, title }) : title, description: t("metaDescription") }
}

/**
 * İlan listeleme sayfası (tasarım: 02-ilan-listeleme, 17-mobil-ilan-listeleme, 18-mobil-filtre-paneli).
 * İlk sayfa sunucuda üretilir; filtre/sıralama/sayfa değişimi adresi değiştirir ve sayfa yeniden üretilir.
 * Adres parametrelerini okuduğu için sayfada <Suspense> içinde render edilir.
 */
export async function ListingsView({
  params,
  searchParams,
}: {
  params: Promise<PathParams>
  searchParams: Promise<SearchParams>
}) {
  const [path, search] = await Promise.all([params, searchParams])
  const { locale, filters, species, cities, districts, breeds, speciesItem, cityItem } = await resolve(path, search)
  const [t, tl, page] = await Promise.all([
    getTranslations("ListingsPage"),
    getTranslations("Listing"),
    getListings(toApiQuery(filters, locale, PAGE_SIZE)),
  ])

  // Etkin filtre etiketleri: her biri kaldırılınca gidilecek filtrelerle.
  const chips: FilterChip[] = []
  const without = (changes: Partial<ListingFilters>): ListingFilters => ({ ...filters, ...changes, page: 1 })
  if (speciesItem)
    chips.push({ key: "species", label: speciesItem.name, without: without({ species: null, breed: null }) })
  if (filters.breed) {
    chips.push({
      key: "breed",
      label: breeds.find((b) => b.slug === filters.breed)?.name ?? filters.breed,
      without: without({ breed: null }),
    })
  }
  if (cityItem) chips.push({ key: "city", label: cityItem.name, without: without({ city: null, district: null }) })
  if (filters.district) {
    chips.push({
      key: "district",
      label: districts.find((d) => d.slug === filters.district)?.name ?? filters.district,
      without: without({ district: null }),
    })
  }
  for (const key of LIST_FILTERS) {
    for (const value of filters[key] as string[]) {
      chips.push({
        key: `${key}:${value}`,
        label: tl(`${LABEL_GROUP[key]}.${value}` as never),
        without: without({ [key]: (filters[key] as string[]).filter((v) => v !== value) } as Partial<ListingFilters>),
      })
    }
  }
  if (filters.q) chips.push({ key: "q", label: t("searchChip", { q: filters.q }), without: without({ q: null }) })

  const title = speciesItem ? t("titleSpecies", { species: speciesItem.name }) : t("titleAll")
  const named = (items: Array<{ id: string; name: string; slug: string }>) =>
    items.map(({ id, name, slug }) => ({ id, name, slug }))

  return (
    <>
      <div className="bg-smoke">
        <div className="mx-auto max-w-site px-4 py-5 lg:px-6 lg:py-8">
          <nav aria-label="breadcrumb" className="text-sm">
            <ol className="flex flex-wrap items-center gap-2">
              <li>
                <Link href="/" className="font-bold text-primary">
                  {t("breadcrumbHome")}
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                {speciesItem ? (
                  <Link href="/listings" className="font-bold text-primary">
                    {t("breadcrumbListings")}
                  </Link>
                ) : (
                  <span aria-current="page" className="text-heading">
                    {t("breadcrumbListings")}
                  </span>
                )}
              </li>
              {speciesItem && (
                <>
                  <li aria-hidden="true">/</li>
                  <li aria-current="page" className="text-heading">
                    {speciesItem.name}
                  </li>
                </>
              )}
            </ol>
          </nav>
          <h1 className="mt-2 text-h1 text-heading">{title}</h1>
          <p className="mt-1 text-body max-lg:hidden">
            {t("summary", {
              count: page.total,
              sort: filters.sort === "oldest" ? t("sortSummaryOldest") : t("sortSummaryNewest"),
            })}
          </p>
        </div>
      </div>

      <div className="mx-auto grid max-w-site gap-6 px-4 py-5 lg:grid-cols-[300px_minmax(0,1fr)] lg:px-6 lg:py-8">
        <div className="hidden lg:block">
          {/* key: adres değişince taslak filtreler yeni adresten başlasın */}
          <FilterPanel
            key={JSON.stringify(filters)}
            variant="sidebar"
            filters={filters}
            species={named(species)}
            cities={named(cities)}
            initialDistricts={named(districts)}
          />
        </div>
        <ListingResults
          filters={filters}
          page={page}
          pageSize={PAGE_SIZE}
          chips={chips}
          species={named(species)}
          cities={named(cities)}
          districts={named(districts)}
        />
      </div>
    </>
  )
}
