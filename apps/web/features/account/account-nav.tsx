"use client"

import { LogOut } from "lucide-react"
import { useTranslations } from "next-intl"

import { accountNav } from "@/components/layout/account-links"
import { useSignOut } from "@/components/layout/use-sign-out"
import { Link, usePathname } from "@/i18n/navigation"
import { cn } from "@/lib/utils"

/**
 * Hesabım sol menüsünün bağlantıları ve "Çıkış yap" (tasarım 02-hesabim/01). Bulunulan sayfa vurgulanır ve
 * aria-current ile bildirilir; alt sayfalarda (ör. /hesabim/ilanlarim/…/duzenle) üst bağlantı aktif sayılır.
 * usePathname okuduğu için düzende <Suspense> içinde render edilir.
 */
export function AccountNav() {
  const t = useTranslations("UserMenu")
  const ta = useTranslations("Account")
  const pathname = usePathname()
  const { signOut, pending, error } = useSignOut()

  /** Bağlantı bu sayfayı mı gösteriyor? Panel özeti yalnızca tam eşleşmede aktif. */
  const isActive = (href: string) => (href === "/account" ? pathname === href : pathname.startsWith(href))

  const row =
    "flex min-h-tap items-center gap-3 rounded-xl px-3 text-[15px] font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [&_svg]:size-[18px] [&_svg]:shrink-0"

  return (
    <nav aria-label={ta("navLabel")}>
      <ul className="grid gap-1">
        {accountNav.map(({ href, key, icon: Icon }) => {
          const active = isActive(href)
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(row, active ? "bg-smoke text-primary" : "text-heading hover:bg-smoke-2")}
              >
                <Icon aria-hidden="true" />
                {t(key)}
              </Link>
            </li>
          )
        })}
      </ul>
      <div className="mt-3 border-t border-border pt-3">
        <button
          type="button"
          onClick={signOut}
          disabled={pending}
          className={cn(row, "w-full text-destructive hover:bg-danger-soft disabled:opacity-60")}
        >
          <LogOut aria-hidden="true" />
          {t("signOut")}
        </button>
        {error && (
          <p role="alert" className="px-3 pt-1 text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
    </nav>
  )
}
