import { FocusLayout } from "@/components/layout/focus-layout"

/** İlan detayı düzeni: masaüstünde site menüsü; mobilde sayfanın kendi üst çubuğu ve "Mesaj gönder" çubuğu. */
export default function DetailLayout({ children }: LayoutProps<"/[locale]">) {
  return <FocusLayout>{children}</FocusLayout>
}
