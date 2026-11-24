import { FocusLayout } from "@/components/layout/focus-layout"

/** Form sayfalarının düzeni (İlan ver, ilan düzenle): masaüstünde gri zemin; mobilde formun kendi çubukları. */
export default function EditorLayout({ children }: LayoutProps<"/[locale]">) {
  return <FocusLayout canvas>{children}</FocusLayout>
}
