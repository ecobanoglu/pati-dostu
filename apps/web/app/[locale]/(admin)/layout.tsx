import type { Metadata } from "next"

import { AdminHeader } from "@/components/layout/admin-header"

/** Admin sayfaları arama motorlarına kapalı. */
export const metadata: Metadata = { robots: { index: false, follow: false } }

/**
 * Admin sayfalarının düzeni: sade üst çubuk + gri zemin (karar: admin paneli 5. aşamada; şimdilik yalnız blog/haber).
 * Sitenin üst menüsü, footer'ı ve mobil alt menüsü yoktur. Yetki her sayfada `requireAdmin()` ile, asıl kontrol API'de.
 */
export default function AdminLayout({ children }: LayoutProps<"/[locale]">) {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <AdminHeader />
      <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
        {children}
      </main>
    </div>
  )
}
