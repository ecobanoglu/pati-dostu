import { Suspense } from "react"

import { Logo } from "@/components/brand/logo"

import { HeaderActions, HeaderActionsFallback } from "./header-actions"
import { MainNav } from "./main-nav"

/**
 * Sitenin üst menüsü (tasarım: 01-sayfalar/01-anasayfa, 16-mobil-anasayfa, 02-hesabim/07-ust-menu-giris-yapilmis).
 * Logo ve menü statik olarak önceden üretilir; oturuma bağlı sağ taraf Suspense ile akışla gelir.
 * lg (1024 px) altında menü bağlantıları hamburger panele taşınır.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/85">
      <div className="mx-auto flex h-16 max-w-site items-center justify-between gap-4 px-4 lg:h-[72px] lg:px-6">
        <Logo />
        <MainNav className="hidden lg:block" />
        <Suspense fallback={<HeaderActionsFallback />}>
          <HeaderActions />
        </Suspense>
      </div>
    </header>
  )
}
