import { getTranslations } from "next-intl/server"
import { type ReactNode, Suspense } from "react"

import { Link } from "@/i18n/navigation"
import { getCurrentUser } from "@/lib/session"

import { NotificationBell } from "../notification-bell"
import { UserMenu } from "../user-menu"
import { AdminMobileMenu } from "./admin-mobile-menu"
import { AdminSearch } from "./admin-search"

/** Yol izindeki bağlantı verilebilen admin sayfaları. */
type CrumbHref = "/admin/posts" | "/admin/users"

/** Oturumdaki admin'in profil menüsü (cookie okuduğu için Suspense içinde). */
async function AdminUser() {
  const user = await getCurrentUser()
  return user ? <UserMenu user={user} /> : null
}

/**
 * Admin sayfasının üst çubuğu (tasarım 07-admin/*): masaüstünde beyaz çubukta "Admin / …" yol izi ve sayfa başlığı
 * (h1), sağda genel arama (ilan no / kullanıcı / e-posta), zil ve profil menüsü; mobilde koyu çubukta hamburger menü, başlık ve isteğe bağlı sağ öğe (`mobileEnd`,
 * ör. ilan onayında "1 / 12"). Her admin sayfası en üstte bunu çizer.
 */
export async function AdminTopBar({
  title,
  crumbs = [],
  mobileEnd,
}: {
  title: string
  /** "Admin"den sonraki yol izi; son öğe sayfanın kendisi (bağlantısız). */
  crumbs?: Array<{ label: string; href?: CrumbHref | { pathname: CrumbHref; query?: Record<string, string> } }>
  mobileEnd?: ReactNode
}) {
  const t = await getTranslations("Admin")
  return (
    <>
      {/* Mobil: koyu çubuk */}
      <div className="sticky top-0 z-30 flex h-16 items-center gap-3 bg-sidebar px-4 text-white lg:hidden">
        <AdminMobileMenu />
        <h1 className="min-w-0 flex-1 truncate text-lg font-extrabold text-white">{title}</h1>
        {mobileEnd}
      </div>
      {/* Masaüstü: beyaz çubuk */}
      <div className="sticky top-0 z-30 flex min-h-20 items-center justify-between gap-6 border-b border-border bg-background px-7 py-3 max-lg:hidden">
        <div className="grid min-w-0 gap-0.5">
          <nav aria-label={t("breadcrumb")} className="text-sm">
            <ol className="flex flex-wrap items-center gap-2">
              <li className="font-bold text-primary">{t("badge")}</li>
              {crumbs.map((c, i) => (
                <li key={`${c.label}-${i}`} className="flex items-center gap-2">
                  <span aria-hidden="true" className="text-body">
                    /
                  </span>
                  {c.href ? (
                    <Link href={c.href} className="font-bold text-primary hover:underline">
                      {c.label}
                    </Link>
                  ) : (
                    <span aria-current="page" className="font-bold text-heading">
                      {c.label}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
          <h1 className="truncate text-h3 font-extrabold text-heading">{title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <AdminSearch />
          <NotificationBell />
          <Suspense fallback={<div aria-hidden="true" className="h-tap w-28" />}>
            <AdminUser />
          </Suspense>
        </div>
      </div>
    </>
  )
}
