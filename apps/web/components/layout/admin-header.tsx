import { ArrowLeft } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { Suspense } from "react"

import { Logo } from "@/components/brand/logo"
import { Badge } from "@/components/ui/badge"
import { Link } from "@/i18n/navigation"
import { getCurrentUser } from "@/lib/session"

import { UserMenu } from "./user-menu"

/** Oturumdaki admin'in profil menüsü (cookie okuduğu için Suspense içinde). */
async function AdminUser() {
  const user = await getCurrentUser()
  return user ? <UserMenu user={user} /> : null
}

/**
 * Admin sayfalarının üst çubuğu (4. aşama: yalnız blog/haber yönetimi). Logo + "Admin" rozeti, bölüm bağlantısı,
 * "Siteye dön" ve profil menüsü. 5. aşamada tasarımdaki koyu sol menülü admin paneline dönüşecek (07-admin/*).
 */
export async function AdminHeader() {
  const t = await getTranslations("Admin")
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background">
      <div className="mx-auto flex min-h-16 max-w-site flex-wrap items-center gap-x-6 gap-y-1 px-4 py-2 lg:px-6">
        <div className="flex items-center gap-2">
          <Logo />
          <Badge variant="notice" size="sm">
            {t("badge")}
          </Badge>
        </div>
        <nav aria-label={t("navLabel")} className="order-last w-full sm:order-none sm:w-auto">
          <Link
            href="/admin/posts"
            className="inline-flex min-h-tap items-center rounded-lg px-2 font-extrabold text-primary hover:underline"
          >
            {t("posts")}
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/"
            className="inline-flex min-h-tap items-center gap-1.5 rounded-lg px-2 text-[15px] font-bold text-heading hover:text-primary"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            {t("backToSite")}
          </Link>
          <Suspense fallback={<div aria-hidden="true" className="h-tap w-28" />}>
            <AdminUser />
          </Suspense>
        </div>
      </div>
    </header>
  )
}
