"use client"

import { ArrowLeft, ArrowRight, LayoutGrid, List, SearchX, SlidersHorizontal, X } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { useState, useSyncExternalStore } from "react"

import { Select } from "@/components/form/input"
import { ListingCard } from "@/components/listing/listing-card"
import { buttonVariants } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Link, useRouter } from "@/i18n/navigation"
import { apiFetch } from "@/lib/api-browser"
import { activeFilterCount, emptyFilters, filtersHref, type ListingFilters, toApiQuery } from "@/lib/listing-filters"
import type { ListingCardData, ListingPage } from "@/lib/listings"
import { cn } from "@/lib/utils"

import { FilterPanel } from "./filter-panel"

type Named = { id: string; name: string; slug: string }

/** Etkin filtre etiketi: görünen ad ve kaldırınca gidilecek filtreler (sunucuda hesaplanır). */
export type FilterChip = { key: string; label: string; without: ListingFilters }

const VIEW_KEY = "pati-dostu:listing-view"

type View = "grid" | "list"

/** Görünüm tercihi değişikliklerini dinlemeye gerek yok (yalnızca bu bileşen yazar). */
const subscribeNoop = () => () => {}

/** Bu tarayıcıda hatırlanan görünüm (yalnızca kolaylık; depolama yoksa ızgara). */
function readStoredView(): View {
  try {
    return localStorage.getItem(VIEW_KEY) === "list" ? "list" : "grid"
  } catch {
    return "grid"
  }
}

/**
 * Sonuç alanı: araç çubuğu (mobil filtre paneli, etkin filtre etiketleri, sıralama, ızgara/liste), kartlar,
 * masaüstünde sayfa numaraları, mobilde "Daha fazla ilan yükle" (sonraki sayfalar tarayıcıda eklenir).
 */
export function ListingResults({
  filters,
  page,
  pageSize,
  chips,
  species,
  cities,
  districts,
}: {
  filters: ListingFilters
  page: ListingPage
  pageSize: number
  chips: FilterChip[]
  species: Named[]
  cities: Named[]
  districts: Named[]
}) {
  const t = useTranslations("ListingsPage")
  const tc = useTranslations("Common")
  const locale = useLocale()
  const storedView = useSyncExternalStore(subscribeNoop, readStoredView, () => "grid" as const)
  const [chosenView, setChosenView] = useState<View | null>(null)
  const view = chosenView ?? storedView
  const [sheetOpen, setSheetOpen] = useState(false)
  const [extra, setExtra] = useState<{ key: string; items: ListingCardData[]; page: number }>({
    key: "",
    items: [],
    page: page.page,
  })
  const [loadingMore, setLoadingMore] = useState(false)

  /** Görünümü değiştirir ve bu tarayıcıda hatırlar. */
  function changeView(next: View) {
    setChosenView(next)
    try {
      localStorage.setItem(VIEW_KEY, next)
    } catch {
      // Depolama kapalı (gizli pencere vb.): tercih yalnızca bu sayfada geçerli.
    }
  }

  // Filtre/sayfa değişince mobilde eklenen sonraki sayfalar sıfırlanır.
  const resultKey = JSON.stringify(filters)
  const appended = extra.key === resultKey ? extra : { key: resultKey, items: [], page: page.page }
  const items = [...page.items, ...appended.items]
  const totalPages = Math.max(1, Math.ceil(page.total / pageSize))
  const hasMore = appended.page < totalPages

  /** Mobil: sonraki sayfayı API'den alıp listeye ekler. */
  async function loadMore() {
    setLoadingMore(true)
    const nextPage = appended.page + 1
    const { data } = await apiFetch<ListingPage>(
      `/listings?${toApiQuery({ ...filters, page: nextPage }, locale, pageSize)}`
    )
    setLoadingMore(false)
    if (data) setExtra({ key: resultKey, items: [...appended.items, ...data.items], page: nextPage })
  }

  const count = activeFilterCount(filters)

  return (
    <div className="grid content-start gap-5">
      {/* Araç çubuğu */}
      <div className="grid gap-3 lg:flex lg:items-start lg:justify-between">
        <div className="grid grid-cols-2 gap-3 lg:hidden">
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger className={cn(buttonVariants({ size: "default" }), "w-full")}>
              <SlidersHorizontal aria-hidden="true" />
              {t("openFilters")}
              {count > 0 && <span className="rounded-full bg-background px-2 text-xs text-primary">{count}</span>}
            </SheetTrigger>
            <SheetContent
              side="bottom"
              closeLabel={tc("close")}
              className="max-h-[90dvh] gap-0 overflow-y-auto rounded-sheet px-4 pt-3 pb-0"
            >
              <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-border" aria-hidden="true" />
              <SheetTitle className="text-h3 font-extrabold text-heading">{t("filters")}</SheetTitle>
              <FilterPanel
                variant="sheet"
                filters={filters}
                species={species}
                cities={cities}
                initialDistricts={districts}
                onApplied={() => setSheetOpen(false)}
              />
            </SheetContent>
          </Sheet>
          <SortSelect filters={filters} />
        </div>

        {chips.length > 0 && (
          <ul
            aria-label={t("activeFilters")}
            className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-wrap lg:px-0"
          >
            {chips.map((chip) => (
              <li key={chip.key} className="shrink-0">
                <Link
                  href={filtersHref({ ...chip.without, page: 1 })}
                  aria-label={t("removeFilter", { label: chip.label })}
                  className="inline-flex min-h-10 items-center gap-2 rounded-full bg-smoke px-3.5 text-sm font-extrabold text-primary hover:bg-smoke/70"
                >
                  {chip.label}
                  <X aria-hidden="true" className="size-4" />
                </Link>
              </li>
            ))}
          </ul>
        )}

        <div className="hidden shrink-0 items-center gap-3 lg:ml-auto lg:flex">
          <SortSelect filters={filters} withLabel />
          <div
            role="group"
            aria-label={t("viewLabel")}
            className="flex overflow-hidden rounded-lg border border-border"
          >
            {(["grid", "list"] as const).map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={view === v}
                aria-label={v === "grid" ? t("viewGrid") : t("viewList")}
                onClick={() => changeView(v)}
                className={cn(
                  "flex size-11 items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring",
                  view === v ? "bg-smoke text-primary" : "bg-background text-body hover:text-heading"
                )}
              >
                {v === "grid" ? (
                  <LayoutGrid aria-hidden="true" className="size-5" />
                ) : (
                  <List aria-hidden="true" className="size-5" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="grid justify-items-center gap-3 rounded-card border border-dashed border-border bg-background px-6 py-14 text-center">
          <SearchX aria-hidden="true" className="size-10 text-body" />
          <h2 className="text-h4 text-heading">{t("emptyTitle")}</h2>
          <p className="text-body">{t("emptyText")}</p>
          {count > 0 && (
            <Link href={filtersHref(emptyFilters)} className={buttonVariants({ variant: "outline-primary" })}>
              {t("emptyClear")}
            </Link>
          )}
        </div>
      ) : (
        <ul className={cn("grid gap-3 sm:gap-5", view === "grid" ? "grid-cols-2 xl:grid-cols-3" : "grid-cols-1")}>
          {items.map((listing, i) => (
            <li key={listing.id}>
              <ListingCard listing={listing} layout={view} priority={i < 3} />
            </li>
          ))}
        </ul>
      )}

      {/* Mobil: daha fazla yükle */}
      {hasMore && (
        <button
          type="button"
          onClick={loadMore}
          disabled={loadingMore}
          className={cn(buttonVariants({ variant: "outline-primary", size: "lg" }), "w-full lg:hidden")}
        >
          {loadingMore ? t("loading") : t("loadMore")}
        </button>
      )}

      {/* Masaüstü: sayfa numaraları */}
      {totalPages > 1 && <Pagination filters={filters} current={page.page} total={totalPages} />}

      <p className="sr-only" aria-live="polite">
        {loadingMore ? t("loading") : ""}
      </p>
    </div>
  )
}

/** Sıralama seçimi: değişince adres güncellenir (sayfa 1). */
function SortSelect({ filters, withLabel }: { filters: ListingFilters; withLabel?: boolean }) {
  const t = useTranslations("ListingsPage")
  const router = useRouter()
  return (
    <label className="flex items-center gap-2">
      <span className={cn("text-sm font-extrabold text-heading", !withLabel && "sr-only")}>{t("sortLabel")}</span>
      <Select
        value={filters.sort}
        onChange={(e) =>
          router.push(filtersHref({ ...filters, sort: e.target.value as ListingFilters["sort"], page: 1 }))
        }
        className="w-full lg:w-36"
      >
        <option value="newest">{t("sortNewest")}</option>
        <option value="oldest">{t("sortOldest")}</option>
      </Select>
    </label>
  )
}

/** Sayfa numaraları (masaüstü): önceki/sonraki ve en fazla 7 numara (uçlar + bulunulan sayfa çevresi). */
function Pagination({ filters, current, total }: { filters: ListingFilters; current: number; total: number }) {
  const t = useTranslations("ListingsPage")
  const pages = [...new Set([1, current - 1, current, current + 1, total])]
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b)
  const cell = "flex size-11 items-center justify-center rounded-lg border border-border font-extrabold"
  return (
    <nav aria-label={t("pagination")} className="hidden justify-center lg:flex">
      <ul className="flex items-center gap-2">
        <li>
          {current > 1 ? (
            <Link
              href={filtersHref({ ...filters, page: current - 1 })}
              aria-label={t("previous")}
              className={cn(cell, "hover:border-primary")}
            >
              <ArrowLeft aria-hidden="true" className="size-4" />
            </Link>
          ) : (
            <span aria-hidden="true" className={cn(cell, "opacity-40")}>
              <ArrowLeft className="size-4" />
            </span>
          )}
        </li>
        {pages.map((p, i) => (
          <li key={p} className="flex items-center gap-2">
            {i > 0 && p - (pages[i - 1] ?? p) > 1 && <span aria-hidden="true">…</span>}
            <Link
              href={filtersHref({ ...filters, page: p })}
              aria-label={t("pageLabel", { page: p })}
              aria-current={p === current ? "page" : undefined}
              className={cn(
                cell,
                p === current
                  ? "border-primary bg-primary text-primary-foreground"
                  : "text-heading hover:border-primary"
              )}
            >
              {p}
            </Link>
          </li>
        ))}
        <li>
          {current < total ? (
            <Link
              href={filtersHref({ ...filters, page: current + 1 })}
              aria-label={t("next")}
              className={cn(cell, "hover:border-primary")}
            >
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          ) : (
            <span aria-hidden="true" className={cn(cell, "opacity-40")}>
              <ArrowRight className="size-4" />
            </span>
          )}
        </li>
      </ul>
    </nav>
  )
}
