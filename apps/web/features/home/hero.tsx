import { getLocale, getTranslations } from "next-intl/server"

import { PdMark } from "@/components/brand/logo"
import type { Locale } from "@/i18n/routing"
import { getCities, getSpecies } from "@/lib/dictionary"

import { HeroSearch } from "./hero-search"
import { QuickSearch } from "./quick-search"

/**
 * Anasayfa hero'su (tasarım 01, 16): rozet, başlık, açıklama ve arama. Masaüstünde 4 alanlı arama formu ve sağda
 * görsel alanı; mobilde tek arama kutusu + hızlı bağlantı çipleri. Şehir ve tür listeleri önbellekli sözlükten.
 * Görsel alanı şimdilik marka işaretiyle süslenmiş bir yer tutucu (gerçek fotoğraf gelince değişecek).
 */
export async function Hero() {
  const locale = (await getLocale()) as Locale
  const [t, cities, species] = await Promise.all([getTranslations("HomePage"), getCities(), getSpecies(locale)])

  return (
    <section aria-labelledby="hero-title" className="bg-smoke">
      <div className="mx-auto grid max-w-site grid-cols-[minmax(0,1fr)] items-center gap-10 px-4 pt-6 pb-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:px-6 lg:py-16">
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4 lg:gap-6">
          <p className="justify-self-start rounded-full bg-background px-3.5 py-1.5 text-sm font-extrabold text-primary">
            {t("badge")}
          </p>
          <h1 id="hero-title" className="text-[2.5rem] leading-[1.1] font-extrabold text-heading lg:text-[3.75rem]">
            {t.rich("title", { accent: (chunks) => <span className="text-primary">{chunks}</span> })}
          </h1>
          <p className="max-w-xl text-body lg:text-lg">
            <span className="lg:hidden">{t("introShort")}</span>
            <span className="max-lg:hidden">{t("intro")}</span>
          </p>
          <div className="mt-2 max-lg:hidden">
            <HeroSearch cities={cities} species={species} locale={locale} />
          </div>
          <div className="lg:hidden">
            <QuickSearch cities={cities} species={species} locale={locale} />
          </div>
        </div>

        <div
          aria-hidden="true"
          className="relative hidden aspect-[8/7] items-center justify-center overflow-hidden rounded-dialog bg-background/60 lg:flex"
        >
          <PdMark className="size-56 opacity-90" />
          <PdMark className="absolute -right-6 -bottom-8 size-40 rotate-12 opacity-15" />
          <PdMark className="absolute top-8 left-8 size-20 -rotate-12 opacity-20" />
        </div>
      </div>
    </section>
  )
}
