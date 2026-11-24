"use client"

import { ArrowRight, ChevronDown, Search } from "lucide-react"
import { useTranslations } from "next-intl"
import { type ReactNode, useId, useState } from "react"

import { ToggleChips } from "@/components/form/choices"
import { Input, Select } from "@/components/form/input"
import { Button } from "@/components/ui/button"
import { Link, useRouter } from "@/i18n/navigation"
import { emptyFilters, filtersHref, type ListFilter, type ListingFilters } from "@/lib/listing-filters"
import { useDictionary } from "@/lib/use-dictionary"
import { cn } from "@/lib/utils"

type Named = { id: string; name: string; slug: string }

/** Çok seçimli filtrelerin seçenekleri (API değerleri) ve Listing çeviri anahtarları. */
const OPTIONS = {
  type: { values: ["adoption", "foster", "lost", "found"], labels: "type" },
  ageGroup: { values: ["puppy", "young", "adult", "senior"], labels: "ageGroup" },
  gender: { values: ["male", "female"], labels: "gender" },
  size: { values: ["small", "medium", "large"], labels: "size" },
  source: { values: ["foster_home", "street", "shelter", "clinic"], labels: "source" },
  features: { values: ["vaccinated", "neutered", "microchipped", "childFriendly"], labels: "feature" },
} as const satisfies Record<ListFilter, { values: readonly string[]; labels: string }>

/** Bölüm başlıkları (ListingsPage anahtarları). */
const TITLES = {
  type: "type",
  ageGroup: "age",
  gender: "gender",
  size: "size",
  source: "source",
  features: "features",
} as const satisfies Record<ListFilter, string>

/**
 * İlan filtreleri (tasarım: 02-ilan-listeleme sol panel, 18-mobil-filtre-paneli). Seçimler önce taslakta tutulur;
 * "Filtreleri uygula" / "Sonuçları göster" ile adrese yazılır (sayfa 1'e döner).
 * variant="sidebar": onay kutuları, kategoriler bağlantı; variant="sheet": hap butonlar, kategori de taslakta.
 */
export function FilterPanel({
  filters,
  species,
  cities,
  initialDistricts,
  variant,
  onApplied,
}: {
  filters: ListingFilters
  species: Named[]
  cities: Named[]
  /** Seçili şehrin ilçeleri (sunucudan); şehir değişirse tarayıcıda yüklenir. */
  initialDistricts: Named[]
  variant: "sidebar" | "sheet"
  /** Uygulanınca (mobilde paneli kapatmak için). */
  onApplied?: () => void
}) {
  const t = useTranslations("ListingsPage")
  const router = useRouter()
  const [draft, setDraft] = useState(filters)
  const sheet = variant === "sheet"

  const cityId = cities.find((c) => c.slug === draft.city)?.id
  const speciesId = species.find((s) => s.slug === draft.species)?.id
  const fetched = useDictionary<Named>(cityId && draft.city !== filters.city ? `/cities/${cityId}/districts` : null)
  const districts = draft.city === filters.city ? initialDistricts : fetched.items
  const { items: breeds } = useDictionary<Named>(speciesId ? `/species/${speciesId}/breeds` : null)

  /** Taslakta bir alanı değiştirir. */
  const set = <K extends keyof ListingFilters>(key: K, value: ListingFilters[K]) =>
    setDraft((d) => ({ ...d, [key]: value }))

  /** Çok seçimli filtrede bir değeri ekler/çıkarır. */
  const toggle = (key: ListFilter, value: string) =>
    setDraft((d) => {
      const current = d[key] as string[]
      return { ...d, [key]: current.includes(value) ? current.filter((v) => v !== value) : [...current, value] }
    })

  /** Taslağı adrese yazar (sayfa 1). */
  function apply() {
    router.push(filtersHref({ ...draft, page: 1 }))
    onApplied?.()
  }

  /** Tüm filtreleri temizler. */
  function clear() {
    setDraft(emptyFilters)
    router.push(filtersHref(emptyFilters))
    onApplied?.()
  }

  return (
    <div className={cn("flex flex-col", !sheet && "rounded-card border border-border bg-background p-5")}>
      {/* Kategoriler (hayvan türü) */}
      <Disclosure title={t("categories")} count={draft.species ? 1 : 0} defaultOpen>
        {sheet ? (
          <ToggleChips
            legend={<span className="sr-only">{t("categories")}</span>}
            options={[
              { value: "", label: t("allCategories") },
              ...species.map((s) => ({ value: s.slug, label: s.name })),
            ]}
            value={new Set([draft.species ?? ""])}
            onToggle={(slug) => setDraft((d) => ({ ...d, species: slug || null, breed: null }))}
          />
        ) : (
          <ul className="grid gap-0.5">
            {[{ slug: null as string | null, name: t("allCategories") }, ...species].map((s) => {
              const active = filters.species === s.slug
              return (
                <li key={s.slug ?? "all"}>
                  <Link
                    href={filtersHref({ ...filters, species: s.slug, breed: null, page: 1 })}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex min-h-10 items-center justify-between rounded-lg px-3 font-bold",
                      active ? "bg-smoke text-primary" : "text-heading hover:bg-smoke/60"
                    )}
                  >
                    {s.name}
                    {active && <ArrowRight aria-hidden="true" className="size-4" />}
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </Disclosure>

      <div className="mt-2 flex items-center justify-between border-t border-border pt-4">
        {/* Mobil panelde başlık panelin kendi başlığında; burada yalnızca ekran okuyucu için */}
        <h2 className={cn("text-h5 text-heading", sheet && "sr-only")}>{t("filters")}</h2>
        <button
          type="button"
          onClick={clear}
          className="ml-auto min-h-tap px-1 text-sm font-extrabold text-primary hover:underline"
        >
          {t("clear")}
        </button>
      </div>

      <label className="mt-2 grid gap-1.5">
        <span className="text-sm font-extrabold text-heading">{t("search")}</span>
        <span className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-body"
          />
          <Input
            type="search"
            value={draft.q ?? ""}
            onChange={(e) => set("q", e.target.value || null)}
            onKeyDown={(e) => e.key === "Enter" && apply()}
            placeholder={t("searchPlaceholder")}
            className="pl-10"
            maxLength={100}
          />
        </span>
      </label>

      <MultiSection filter="type" draft={draft} toggle={toggle} sheet={sheet} defaultOpen />

      <Disclosure title={t("location")} count={(draft.city ? 1 : 0) + (draft.district ? 1 : 0)} defaultOpen>
        <div className="grid gap-3">
          <label className="grid gap-1.5">
            <span className="text-sm font-extrabold text-heading">{t("city")}</span>
            <Select
              value={draft.city ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, city: e.target.value || null, district: null }))}
            >
              <option value="">{t("allCities")}</option>
              {cities.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </Select>
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm font-extrabold text-heading">{t("district")}</span>
            <Select
              value={draft.district ?? ""}
              disabled={!draft.city}
              onChange={(e) => set("district", e.target.value || null)}
            >
              <option value="">{t("allDistricts")}</option>
              {districts.map((d) => (
                <option key={d.slug} value={d.slug}>
                  {d.name}
                </option>
              ))}
            </Select>
          </label>
        </div>
      </Disclosure>

      <Disclosure title={t("breed")} count={draft.breed ? 1 : 0}>
        {speciesId ? (
          <Select
            value={draft.breed ?? ""}
            aria-label={t("breed")}
            onChange={(e) => set("breed", e.target.value || null)}
          >
            <option value="">{t("allBreeds")}</option>
            {breeds.map((b) => (
              <option key={b.slug} value={b.slug}>
                {b.name}
              </option>
            ))}
          </Select>
        ) : (
          <p className="text-sm text-body">{t("breedNeedsSpecies")}</p>
        )}
      </Disclosure>

      {(["ageGroup", "gender", "size", "source", "features"] as const).map((filter) => (
        <MultiSection key={filter} filter={filter} draft={draft} toggle={toggle} sheet={sheet} />
      ))}

      {/* Masaüstünde panelin altında; mobilde panelin altına sabit */}
      <div className={cn(sheet ? "sticky bottom-0 -mx-4 mt-4 border-t border-border bg-background p-4" : "mt-5")}>
        <Button type="button" size="lg" className="w-full" onClick={apply}>
          {sheet ? t("showResults") : t("apply")}
        </Button>
      </div>
    </div>
  )
}

/** Çok seçimli bir filtrenin bölümü: masaüstünde onay kutuları, mobilde haplar. */
function MultiSection({
  filter,
  draft,
  toggle,
  sheet,
  defaultOpen,
}: {
  filter: ListFilter
  draft: ListingFilters
  toggle: (key: ListFilter, value: string) => void
  sheet: boolean
  defaultOpen?: boolean
}) {
  const t = useTranslations("ListingsPage")
  const tl = useTranslations("Listing")
  const { values, labels } = OPTIONS[filter]
  const selected = draft[filter] as string[]
  const label = (v: string) => tl(`${labels}.${v}` as never)
  return (
    <Disclosure title={t(TITLES[filter])} count={selected.length} defaultOpen={defaultOpen || selected.length > 0}>
      {sheet ? (
        <ToggleChips
          legend={<span className="sr-only">{t(TITLES[filter])}</span>}
          options={values.map((v) => ({ value: v, label: label(v) }))}
          value={new Set(selected)}
          onToggle={(v) => toggle(filter, v)}
        />
      ) : (
        <fieldset className="grid gap-0.5">
          <legend className="sr-only">{t(TITLES[filter])}</legend>
          {values.map((v) => (
            <label key={v} className="flex min-h-10 cursor-pointer items-center gap-3 text-[15px] text-heading">
              <input
                type="checkbox"
                checked={selected.includes(v)}
                onChange={() => toggle(filter, v)}
                className="size-5 cursor-pointer accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              />
              {label(v)}
            </label>
          ))}
        </fieldset>
      )}
    </Disclosure>
  )
}

/** Açılır-kapanır bölüm: başlık butonu (aria-expanded), seçili sayısı rozeti. */
function Disclosure({
  title,
  count,
  defaultOpen = false,
  children,
}: {
  title: string
  count: number
  defaultOpen?: boolean
  children: ReactNode
}) {
  const t = useTranslations("ListingsPage")
  const [open, setOpen] = useState(defaultOpen)
  const id = useId()
  return (
    <section className="border-b border-border py-3 last-of-type:border-b-0">
      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((o) => !o)}
          className="flex min-h-tap w-full items-center gap-2 text-left text-base font-extrabold text-heading"
        >
          {title}
          {count > 0 && (
            <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
              {count}
              <span className="sr-only"> ({t("selectedCount", { count })})</span>
            </span>
          )}
          <ChevronDown aria-hidden="true" className={cn("ml-auto size-5 transition-transform", open && "rotate-180")} />
        </button>
      </h3>
      <div id={id} hidden={!open} className="pt-2 pb-1">
        {children}
      </div>
    </section>
  )
}
