import { getLocale, getTranslations } from "next-intl/server"

import { getPathname, Link, redirect } from "@/i18n/navigation"
import type { Locale } from "@/i18n/routing"
import { getSpecies } from "@/lib/dictionary"
import { getForumCategories } from "@/lib/forum"
import { getCurrentUser } from "@/lib/session"

import { AskForm } from "./ask-form"

/**
 * "Soru sor" sayfasının sunucu tarafı (tasarım 04-pencereler/01, 09): mor şerit (yol izi, başlık, açıklama) ve form.
 * Oturum yoksa girişe yönlendirir (proxy de korur). `?kategori=` ile gelinirse o kategori seçili başlar. Oturum ve
 * adres okuduğu için <Suspense> içinde render edilir.
 */
export async function AskView({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const locale = (await getLocale()) as Locale
  const user = await getCurrentUser()
  if (!user) {
    return redirect({
      href: { pathname: "/sign-in", query: { next: getPathname({ href: "/community/ask", locale }) } },
      locale,
    })
  }
  const search = await searchParams
  const initial = typeof search.kategori === "string" ? search.kategori : null
  const [t, tc, categories, species] = await Promise.all([
    getTranslations("AskTopic"),
    getTranslations("Community"),
    getForumCategories(locale),
    getSpecies(locale),
  ])

  return (
    <>
      <div className="bg-smoke">
        <div className="mx-auto max-w-site px-4 py-5 lg:px-6 lg:py-8">
          <nav aria-label="breadcrumb" className="text-sm max-lg:hidden">
            <ol className="flex flex-wrap items-center gap-2">
              <li>
                <Link href="/" className="font-bold text-primary">
                  {tc("breadcrumbHome")}
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link href="/community" className="font-bold text-primary">
                  {tc("title")}
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="text-heading">
                {t("crumb")}
              </li>
            </ol>
          </nav>
          <h1 className="text-h2 font-extrabold text-heading lg:mt-2 lg:text-h1">{t("title")}</h1>
          <p className="mt-1 text-body max-lg:hidden">{t("subtitle")}</p>
        </div>
      </div>
      <div className="lg:bg-canvas">
        <div className="mx-auto max-w-site px-4 py-5 lg:px-6 lg:py-8">
          <AskForm
            categories={categories.map(({ id, slug, name }) => ({ id, slug, name }))}
            species={species.map(({ id, slug, name }) => ({ id, slug, name }))}
            initialCategory={initial}
            emailVerified={user.emailVerified}
          />
        </div>
      </div>
    </>
  )
}

/** Yüklenirken: şerit ve form iskeleti. */
export function AskFallback() {
  return (
    <div aria-hidden="true">
      <div className="h-40 bg-smoke" />
      <div className="mx-auto grid max-w-site gap-6 px-4 py-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:px-6">
        <div className="h-[640px] animate-pulse rounded-card bg-smoke-2 motion-reduce:animate-none" />
        <div className="h-64 rounded-card bg-smoke-2 max-lg:hidden" />
      </div>
    </div>
  )
}
