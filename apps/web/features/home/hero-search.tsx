"use client"

import { Search } from "lucide-react"
import { useTranslations } from "next-intl"
import { useId } from "react"

import { Field } from "@/components/form/field"
import { Select } from "@/components/form/input"
import { Button } from "@/components/ui/button"
import { getPathname, useRouter } from "@/i18n/navigation"
import type { Locale } from "@/i18n/routing"
import type { City, Species } from "@/lib/dictionary"
import { filtersHref, parseFilters, toUrlValue } from "@/lib/listing-filters"

/** Anasayfa arama formundaki yaş ve cinsiyet seçenekleri (API değerleri; formda URL karşılıkları gönderilir). */
const AGES = ["puppy", "young", "adult", "senior"] as const
const GENDERS = ["female", "male"] as const

/**
 * Masaüstü hero arama formu (tasarım 01): Şehir, Tür, Cinsiyet, Yaş + Ara → ilan listesi.
 * Tür/şehir adres yoluna yazılır (/ilanlar/kedi/izmir), diğerleri sorguya (?cinsiyet=disi&yas=yavru).
 * JavaScript yüklenmeden de çalışır: form GET ile /ilanlar?sehir=&tur=&cinsiyet=&yas= gönderir (ilan listesi bunları
 * okur). Seçenek değerleri bu yüzden adresteki Türkçe karşılıklardır.
 */
export function HeroSearch({ cities, species, locale }: { cities: City[]; species: Species[]; locale: Locale }) {
  const t = useTranslations("HomePage")
  const tl = useTranslations("Listing")
  const router = useRouter()
  const id = useId()

  /** Seçimleri ilan listesinin adres yapısına çevirip oraya gider. */
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const search = Object.fromEntries([...data.entries()].filter(([, v]) => v !== "").map(([k, v]) => [k, String(v)]))
    router.push(filtersHref(parseFilters({}, search)))
  }

  return (
    <form
      role="search"
      aria-label={t("searchTitle")}
      action={getPathname({ href: "/listings", locale })}
      method="get"
      onSubmit={submit}
      className="grid gap-x-3 gap-y-4 rounded-card border border-border bg-background p-5 shadow-sm sm:grid-cols-3"
    >
      <Field id={`${id}-city`} label={t("city")}>
        {(field) => (
          <Select {...field} name="sehir" defaultValue="">
            <option value="">{t("allCities")}</option>
            {cities.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field id={`${id}-species`} label={t("species")}>
        {(field) => (
          <Select {...field} name="tur" defaultValue="">
            <option value="">{t("allSpecies")}</option>
            {species.map((s) => (
              <option key={s.id} value={s.slug}>
                {s.name}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field id={`${id}-gender`} label={t("gender")}>
        {(field) => (
          <Select {...field} name="cinsiyet" defaultValue="">
            <option value="">{t("allGenders")}</option>
            {GENDERS.map((g) => (
              <option key={g} value={toUrlValue("gender", g)}>
                {tl(`gender.${g}`)}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field id={`${id}-age`} label={t("age")} className="sm:col-span-2">
        {(field) => (
          <Select {...field} name="yas" defaultValue="">
            <option value="">{t("allAges")}</option>
            {AGES.map((a) => (
              <option key={a} value={toUrlValue("ageGroup", a)}>
                {tl(`ageGroup.${a}`)}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Button type="submit" className="self-end">
        <Search aria-hidden="true" />
        {t("search")}
      </Button>
    </form>
  )
}
