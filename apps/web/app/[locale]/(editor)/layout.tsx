import { SiteFooter } from "@/components/layout/site-footer"
import { SiteHeader } from "@/components/layout/site-header"

/**
 * Form/düzenleyici sayfalarının düzeni (İlan ver, ilan düzenle). Masaüstünde sitenin üst menüsü ve footer'ı;
 * mobilde ikisi de gizli, sayfa kendi başlık çubuğunu ("× İlan ver 2/6") ve alttaki eylem çubuğunu gösterir
 * (tasarım: 21-mobil-ilan-ver-adim-1). Mobil alt menü (tab bar) bu sayfalarda yoktur.
 */
export default function EditorLayout({ children }: LayoutProps<"/[locale]">) {
  return (
    <div className="flex min-h-dvh flex-col bg-background lg:bg-canvas">
      <SiteHeader className="hidden lg:block" />
      <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
        {children}
      </main>
      <div className="hidden lg:block">
        <SiteFooter />
      </div>
    </div>
  )
}
