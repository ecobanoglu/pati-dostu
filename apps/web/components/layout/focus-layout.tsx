import { SiteFooter } from "@/components/layout/site-footer"
import { SiteHeader } from "@/components/layout/site-header"
import { cn } from "@/lib/utils"

/**
 * Tek bir işe odaklanan sayfaların düzeni (ilan ver/düzenle, ilan detayı). Masaüstünde sitenin üst menüsü ve
 * footer'ı; mobilde ikisi de gizli — sayfa kendi başlık çubuğunu ve alttaki eylem çubuğunu gösterir
 * (tasarım: 21-mobil-ilan-ver-adim-1, 19-mobil-ilan-detay). Mobil alt menü (tab bar) bu sayfalarda yoktur.
 */
export function FocusLayout({ children, canvas = false }: { children: React.ReactNode; canvas?: boolean }) {
  return (
    <div className={cn("flex min-h-dvh flex-col bg-background", canvas && "lg:bg-canvas")}>
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
