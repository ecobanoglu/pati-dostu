import { getLocale } from "next-intl/server"

import { getPathname, redirect } from "@/i18n/navigation"
import type { Locale } from "@/i18n/routing"
import type { MyListingData } from "@/lib/listings"
import { apiServer } from "@/lib/server-api"
import { getCurrentUser } from "@/lib/session"

import { MyListingsList } from "./my-listings-list"

/**
 * İlanlarım verisi: kullanıcının tüm ilanları (GET /me/listings, oturumla ve önbelleksiz). Oturum yoksa girişe
 * yönlendirir. cookies() okuduğu için <Suspense> içinde render edilir.
 */
export async function MyListings() {
  const locale = (await getLocale()) as Locale
  const user = await getCurrentUser()
  if (!user) {
    return redirect({
      href: { pathname: "/sign-in", query: { next: getPathname({ href: "/account/listings", locale }) } },
      locale,
    })
  }
  const items = (await apiServer<MyListingData[]>(`/me/listings?locale=${locale}`)) ?? []
  return <MyListingsList items={items} />
}

/** Yüklenirken: sekme şeridi ve satır iskeletleri. */
export function MyListingsFallback() {
  return (
    <div aria-hidden="true" className="rounded-card border border-border bg-background">
      <div className="h-13 border-b border-border" />
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="flex gap-5 border-b border-border p-5 last:border-0">
          <div className="h-22 w-28 animate-pulse rounded-xl bg-smoke-2 motion-reduce:animate-none" />
          <div className="grid flex-1 content-start gap-2">
            <div className="h-5 w-40 rounded bg-smoke-2" />
            <div className="h-6 w-2/3 rounded bg-smoke-2" />
          </div>
        </div>
      ))}
    </div>
  )
}
