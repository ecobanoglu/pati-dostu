import { SiteFooter } from "@/components/layout/site-footer"
import { SiteHeader } from "@/components/layout/site-header"
import { MobileTabBar } from "@/components/layout/mobile-tab-bar"

/**
 * Sitenin genel sayfa düzeni: üst menü, içerik, footer ve mobil alt menü.
 * Kimlik sayfaları (giriş, kayıt, şifre) sade bir düzen kullanır: (auth) grubu.
 * Mobilde içerik, sabit alt menünün altında kalmasın diye alttan boşlukla biter.
 */
export default function SiteLayout({ children }: LayoutProps<"/[locale]">) {
  return (
    <div className="flex min-h-dvh flex-col pb-16 md:pb-0">
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
        {children}
      </main>
      <SiteFooter />
      <MobileTabBar />
    </div>
  )
}
