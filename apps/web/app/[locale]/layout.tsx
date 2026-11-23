import type { Metadata, Viewport } from "next"
import { hasLocale, NextIntlClientProvider } from "next-intl"
import { getLocale, getTranslations } from "next-intl/server"
import { Nunito } from "next/font/google"
import { notFound } from "next/navigation"

import { routing } from "@/i18n/routing"

import "../globals.css"

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin", "latin-ext"],
  display: "swap",
})

/** Açık diller için sayfaları derleme sırasında üretir (/ ve /en). */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

/** Site başlığı ve açıklaması, sayfanın diline göre. */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Metadata")
  return {
    metadataBase: new URL("https://pati-dostu.com"),
    title: { default: t("title"), template: t("titleTemplate") },
    description: t("description"),
  }
}

export const viewport: Viewport = {
  themeColor: "#6839cc",
}

/** Tüm sayfaların kök düzeni: dil etiketi, Nunito fontu, global stiller ve istemci bileşenleri için çeviriler. */
export default async function LocaleLayout({ children }: LayoutProps<"/[locale]">) {
  const locale = await getLocale()
  if (!hasLocale(routing.locales, locale)) notFound()
  const t = await getTranslations("Common")

  return (
    <html lang={locale} className={nunito.variable}>
      <body>
        {/* Klavye kullanıcıları için menüyü atlayıp içeriğe geçiş (Tab ile ilk odaklanan öğe). */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-3 focus:font-bold focus:text-primary-foreground"
        >
          {t("skipToContent")}
        </a>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  )
}
