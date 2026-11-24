"use client"

import { ArrowRight, LogOut } from "lucide-react"
import { useTranslations } from "next-intl"

import { accountNav } from "@/components/layout/account-links"
import { useSignOut } from "@/components/layout/use-sign-out"
import { Link } from "@/i18n/navigation"

/**
 * Mobilde Hesabım sayfalarının altındaki menü listesi (tasarım 28-mobil-hesabim-ilanlarim): masaüstündeki sol menünün
 * karşılığı. `current` verilen sayfa listede gösterilmez. Masaüstünde gizli.
 */
export function AccountMobileMenu({ current }: { current: (typeof accountNav)[number]["href"] }) {
  const t = useTranslations("UserMenu")
  const ta = useTranslations("Account")
  const { signOut, pending, error } = useSignOut()
  const row =
    "flex min-h-14 w-full items-center gap-3.5 text-left text-base font-extrabold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [&>svg]:size-5 [&>svg]:shrink-0"

  return (
    <nav aria-label={ta("navLabel")} className="mt-8 lg:hidden">
      <ul className="divide-y divide-border border-y border-border">
        {accountNav
          .filter((item) => item.href !== current)
          .map(({ href, key, icon: Icon }) => (
            <li key={href}>
              <Link href={href} className={`${row} text-heading`}>
                <Icon aria-hidden="true" />
                <span className="flex-1">{t(key)}</span>
                <ArrowRight aria-hidden="true" className="text-body" />
              </Link>
            </li>
          ))}
        <li>
          <button
            type="button"
            onClick={signOut}
            disabled={pending}
            className={`${row} text-destructive disabled:opacity-60`}
          >
            <LogOut aria-hidden="true" />
            {t("signOut")}
          </button>
        </li>
      </ul>
      {error && (
        <p role="alert" className="pt-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </nav>
  )
}
