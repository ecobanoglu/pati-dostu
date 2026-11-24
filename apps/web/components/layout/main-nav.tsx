"use client"

import { useTranslations } from "next-intl"
import { Suspense } from "react"

import { Link, usePathname } from "@/i18n/navigation"
import { cn } from "@/lib/utils"

import { isActivePath, mainNav } from "./nav-items"

/**
 * Masaüstü üst menü bağlantıları; bulunulan sayfa mor ve aria-current="page" ile işaretlenir.
 * Adresi değişken içeren sayfalarda (/ilan/[slug]…) adres derleme anında bilinmediği için aktif işaret Suspense
 * içinde hesaplanır; o ana kadar işaretsiz menü görünür (aynı yerleşim, kayma olmaz).
 */
export function MainNav({ className }: { className?: string }) {
  return (
    <Suspense fallback={<MainNavLinks pathname={null} className={className} />}>
      <ActiveMainNav className={className} />
    </Suspense>
  )
}

/** Bulunulan adresi okuyup menüyü işaretli çizer. */
function ActiveMainNav({ className }: { className?: string }) {
  return <MainNavLinks pathname={usePathname()} className={className} />
}

/** Menünün kendisi; pathname null ise hiçbir bağlantı işaretlenmez. */
function MainNavLinks({ pathname, className }: { pathname: string | null; className?: string }) {
  const t = useTranslations("Nav")
  return (
    <nav aria-label={t("label")} className={className}>
      <ul className="flex items-center gap-1">
        {mainNav.map((item) => {
          const active = pathname !== null && isActivePath(pathname, item.href)
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
