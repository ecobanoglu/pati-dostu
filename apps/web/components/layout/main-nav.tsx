"use client"

import { useTranslations } from "next-intl"

import { Link, usePathname } from "@/i18n/navigation"
import { cn } from "@/lib/utils"

import { isActivePath, mainNav } from "./nav-items"

/** Masaüstü üst menü bağlantıları; bulunulan sayfa mor ve aria-current="page" ile işaretlenir. */
export function MainNav({ className }: { className?: string }) {
  const t = useTranslations("Nav")
  const pathname = usePathname()

  return (
    <nav aria-label={t("label")} className={className}>
      <ul className="flex items-center gap-1">
        {mainNav.map((item) => {
          const active = isActivePath(pathname, item.href)
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-tap items-center rounded-lg px-3 text-[15px] font-bold transition-colors",
                  active ? "text-primary" : "text-heading hover:text-primary"
                )}
              >
                {t(item.key)}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
