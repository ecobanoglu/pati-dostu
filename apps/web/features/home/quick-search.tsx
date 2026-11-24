"use client"

import { Search, SlidersHorizontal } from "lucide-react"
import { useTranslations } from "next-intl"
import { useId } from "react"

import { buttonVariants } from "@/components/ui/button"
import { getPathname, Link, useRouter } from "@/i18n/navigation"
import type { Locale } from "@/i18n/routing"
import type { City, Species } from "@/lib/dictionary"
import { emptyFilters, filtersHref } from "@/lib/listing-filters"
import { cn } from "@/lib/utils"

/**
 * Kelimeyi slug biçimine getirir: "İzmir" → "izmir", "Köpek" → "kopek", "Şanlıurfa" → "sanliurfa".
 * NFD ç/ğ/ö/ş/ü'yü harf + işarete ayırır, işaretler atılır; noktasız ı ayrıca i yapılır.
 */
function toSlug(word: string): string {
  return word
    .toLocaleLowerCase("tr")
    .replace(/ı/g, "i")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9-]/g, "")
}

/**
 * Yazılan aramayı ilan filtrelerine çevirir: şehir ve tür adıyla eşleşen kelimeler filtre olur
 * ("izmir kedi tekir" → /ilanlar/kedi/izmir?ara=tekir), kalanlar başlık + açıklamada metin araması.
 * (API'nin metin araması yalnız başlık ve açıklamaya bakar; şehir/tür bu yüzden ayrıca eşleştirilir.)
 */
export function queryToFilters(text: string, cities: City[], species: Species[]) {
  let city: string | null = null
  let kind: string | null = null
  const rest: string[] = []
  for (const word of text.trim().split(/\s+/).filter(Boolean)) {
    const slug = toSlug(word)
    const c: City | undefined = city ? undefined : cities.find((x) => x.slug === slug)
    const s: Species | undefined = kind ? undefined : species.find((x) => x.slug === slug)
    if (c) city = c.slug
    else if (s) kind = s.slug
    else rest.push(word)
  }
  return { ...emptyFilters, city, species: kind, q: rest.join(" ") || null }
}

/**
 * Mobil hero (tasarım 16): tek arama kutusu, "Detaylı filtreler" butonu ve hızlı bağlantı çipleri
 * (türler, Kayıp, Bulunan). JavaScript'siz de çalışır: GET /ilanlar?ara=…
 */
export function QuickSearch({ cities, species, locale }: { cities: City[]; species: Species[]; locale: Locale }) {
  const t = useTranslations("HomePage")
  const tl = useTranslations("Listing")
  const router = useRouter()
  const id = useId()

  /** Aramayı filtrelere çevirip ilan listesine gider. */
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const text = String(new FormData(event.currentTarget).get("ara") ?? "")
    router.push(filtersHref(queryToFilters(text, cities, species)))
  }

  const chip =
    "flex min-h-tap shrink-0 items-center rounded-full border border-border bg-background px-4 text-[15px] font-extrabold text-heading hover:bg-smoke-2"

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <form
        role="search"
        aria-label={t("searchTitle")}
        action={getPathname({ href: "/listings", locale })}
        method="get"
        onSubmit={submit}
        className="flex gap-2.5"
      >
        <div className="relative flex-1">
          <label htmlFor={id} className="sr-only">
            {t("quickSearch")}
          </label>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-body"
          />
          <input
            id={id}
            name="ara"
            type="search"
            enterKeyHint="search"
            placeholder={t("quickSearch")}
            className="h-13 w-full rounded-xl border border-input bg-background pr-4 pl-12 text-base text-heading placeholder:text-body focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          />
        </div>
        <Link
          href="/listings"
          aria-label={t("filters")}
          className={cn(buttonVariants({ size: "icon" }), "size-13 rounded-xl")}
        >
          <SlidersHorizontal aria-hidden="true" className="size-6" />
        </Link>
      </form>
      <nav aria-label={t("quickLinks")}>
        <ul className="-mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
          {species.map((s) => (
            <li key={s.id}>
              <Link href={{ pathname: "/listings/[species]", params: { species: s.slug } }} className={chip}>
                {s.name}
              </Link>
            </li>
          ))}
          {(["lost", "found"] as const).map((type) => (
            <li key={type}>
              <Link href={filtersHref({ ...emptyFilters, type: [type] })} className={chip}>
                {tl(`type.${type}`)}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
