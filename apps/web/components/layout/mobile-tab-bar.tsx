"use client"

import { House, LayoutGrid, MessageCircle, Plus, User } from "lucide-react"
import { useTranslations } from "next-intl"
import { Suspense } from "react"

import { Link, usePathname } from "@/i18n/navigation"
import { cn } from "@/lib/utils"

import { isActivePath } from "./nav-items"

const tabs = [
  { href: "/", key: "home", icon: House },
  { href: "/listings", key: "listings", icon: LayoutGrid },
  { href: "/post-listing", key: "postListing", icon: Plus },
  { href: "/account/messages", key: "messages", icon: MessageCircle },
  { href: "/account", key: "profile", icon: User },
] as const

/**
 * Mobil alt menü (768 px altı): Anasayfa, İlanlar, İlan Ver (ortada yükseltilmiş turuncu buton), Mesajlar, Profil.
 * Ekranın altına sabitlenir; içerik alttan bu yükseklik kadar boşlukla biter (layout'ta pb).
 * Mesajlar/Profil giriş ister; misafir giriş sayfasına yönlendirilir (proxy, 7c).
 */
export function MobileTabBar() {
  // Adresi değişken içeren sayfalarda aktif sekme Suspense içinde hesaplanır (bkz. MainNav).
  return (
    <Suspense fallback={<TabBar pathname={null} />}>
      <ActiveTabBar />
    </Suspense>
  )
}

/** Bulunulan adresi okuyup alt menüyü işaretli çizer. */
function ActiveTabBar() {
  return <TabBar pathname={usePathname()} />
}

/** Alt menünün kendisi; pathname null ise hiçbir sekme işaretlenmez. */
function TabBar({ pathname }: { pathname: string | null }) {
  const t = useTranslations("Nav")

  return (
    <nav
      aria-label={t("tabBarLabel")}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="grid h-16 grid-cols-5">
        {tabs.map(({ href, key, icon: Icon }) => {
          // Profil sekmesi, alt sekmesi olan Mesajlar açıkken aktif görünmesin.
          const active =
            pathname !== null &&
            (href === "/account"
              ? isActivePath(pathname, href) && !isActivePath(pathname, "/account/messages")
              : isActivePath(pathname, href))
          const isCta = href === "/post-listing"
          return (
            <li key={href} className="flex">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-0.5 text-xs font-bold",
                  active ? "text-primary" : "text-heading"
                )}
              >
                {isCta ? (
                  <span className="-mt-7 mb-0.5 flex size-14 items-center justify-center rounded-full border-4 border-background bg-secondary text-secondary-foreground shadow-pop">
                    <Icon aria-hidden="true" className="size-7" />
                  </span>
                ) : (
                  <Icon aria-hidden="true" className="size-6" />
                )}
                {t(key)}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
