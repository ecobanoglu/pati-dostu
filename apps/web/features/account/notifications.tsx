import { getLocale } from "next-intl/server"

import { getPathname, redirect } from "@/i18n/navigation"
import type { Locale } from "@/i18n/routing"
import { apiServer } from "@/lib/server-api"
import { getCurrentUser } from "@/lib/session"

import { NotificationsList, type NotificationPage } from "./notifications-list"

/**
 * Bildirimler verisi: ilk sayfa (GET /me/notifications, oturumla ve önbelleksiz). Oturum yoksa girişe yönlendirir.
 * "Şu an" sunucuda bir kez alınıp istemciye verilir ki göreli zamanlar ("2 saat önce") hidrasyonda aynı çıksın.
 * cookies() okuduğu için <Suspense> içinde render edilir.
 */
export async function Notifications() {
  const locale = (await getLocale()) as Locale
  const user = await getCurrentUser()
  if (!user) {
    return redirect({
      href: { pathname: "/sign-in", query: { next: getPathname({ href: "/account/notifications", locale }) } },
      locale,
    })
  }
  const page = await apiServer<NotificationPage>("/me/notifications")
  return (
    <NotificationsList
      initial={page ?? { items: [], unreadCount: 0, nextCursor: null }}
      now={new Date().toISOString()}
    />
  )
}

/** Yüklenirken: sekme şeridi ve satır iskeletleri. */
export function NotificationsFallback() {
  return (
    <div aria-hidden="true" className="rounded-card border border-border bg-background">
      <div className="h-13 border-b border-border" />
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="flex gap-4 border-b border-border p-4 last:border-0 lg:px-5">
          <div className="size-11 animate-pulse rounded-full bg-smoke-2 motion-reduce:animate-none" />
          <div className="grid flex-1 content-start gap-2">
            <div className="h-5 w-48 rounded bg-smoke-2" />
            <div className="h-4 w-2/3 rounded bg-smoke-2" />
          </div>
        </div>
      ))}
    </div>
  )
}
