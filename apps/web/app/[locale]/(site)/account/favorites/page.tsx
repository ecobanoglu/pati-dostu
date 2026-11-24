import type { Metadata } from "next"
import { getLocale, getTranslations } from "next-intl/server"
import { Suspense } from "react"

import { AccountPageHeader } from "@/features/account/account-page-header"
import { FavoritesList } from "@/features/favorites/favorites-list"
import { getPathname, redirect } from "@/i18n/navigation"
import type { Locale } from "@/i18n/routing"
import type { ListingCardData } from "@/lib/listings"
import { apiServer } from "@/lib/server-api"
import { getCurrentUser } from "@/lib/session"

/** Sekme başlığı; kişisel sayfa dizinlenmez. */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Favorites")
  return { title: t("metaTitle"), robots: { index: false } }
}

/**
 * Favoriler sayfasının sunucu tarafı: oturum yoksa girişe yönlendirir (proxy cookie'ye bakar; geçersiz oturum burada
 * yakalanır), favorileri oturumla ve önbelleksiz okur. cookies() okuduğu için <Suspense> içinde render edilir.
 */
async function Favorites() {
  const locale = (await getLocale()) as Locale
  const user = await getCurrentUser()
  if (!user) {
    return redirect({
      href: { pathname: "/sign-in", query: { next: getPathname({ href: "/account/favorites", locale }) } },
      locale,
    })
  }
  const items = (await apiServer<ListingCardData[]>(`/me/favorites?locale=${locale}`)) ?? []
  return <FavoritesList initial={items} />
}

/** Yüklenirken: sekme ve kart iskeletleri. */
function FavoritesFallback() {
  return (
    <div aria-hidden="true">
      <div className="h-11 w-72 rounded-full bg-smoke-2" />
      <div className="mt-5 grid gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="aspect-[4/3] animate-pulse rounded-card bg-smoke-2" />
        ))}
      </div>
    </div>
  )
}

/**
 * Hesabım › Favoriler — /hesabim/favoriler (tasarım 02-hesabim-favoriler, 09-mobil-favoriler).
 * Zemin, kap ve sol menü Hesabım düzeninden (account/layout.tsx).
 */
export default async function FavoritesPage() {
  const t = await getTranslations("Favorites")
  return (
    <>
      <AccountPageHeader title={t("title")} crumb={t("title")} back="/account" />
      <Suspense fallback={<FavoritesFallback />}>
        <Favorites />
      </Suspense>
    </>
  )
}
