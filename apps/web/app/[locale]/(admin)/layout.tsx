import type { Metadata } from "next"

import { AdminSidebar } from "@/components/layout/admin/admin-sidebar"

/** Admin sayfaları arama motorlarına kapalı. */
export const metadata: Metadata = { robots: { index: false, follow: false } }

/**
 * Admin paneli düzeni (tasarım 07-admin/*): masaüstünde solda sabit koyu kenar çubuğu, sağda sayfa (her sayfa en
 * üstte `AdminTopBar` çizer); mobilde kenar çubuğu yok, üst çubuktaki hamburger açar. Sitenin üst menüsü, footer'ı ve
 * mobil alt menüsü yoktur. Yetki her sayfada `requireAdmin()` ile, asıl kontrol API'de.
 */
export default function AdminLayout({ children }: LayoutProps<"/[locale]">) {
  return (
    <div className="min-h-dvh bg-canvas lg:grid lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="sticky top-0 h-dvh max-lg:hidden">
        <AdminSidebar />
      </aside>
      <main id="main-content" tabIndex={-1} className="min-w-0 focus:outline-none">
        {children}
      </main>
    </div>
  )
}
