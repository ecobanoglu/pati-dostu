import type { Metadata, Viewport } from "next"
import { Nunito } from "next/font/google"

import "./globals.css"

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin", "latin-ext"],
  display: "swap",
})

export const metadata: Metadata = {
  metadataBase: new URL("https://pati-dostu.com"),
  title: {
    default: "Pati Dostu",
    template: "%s · Pati Dostu",
  },
  description:
    "Sahiplendirme, geçici yuva, kayıp ve bulunan hayvan ilanları; topluluk, veteriner ve barınak dizini. Tamamen sosyal sorumluluk amaçlı.",
}

export const viewport: Viewport = {
  themeColor: "#6839cc",
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr" className={nunito.variable}>
      <body>{children}</body>
    </html>
  )
}
