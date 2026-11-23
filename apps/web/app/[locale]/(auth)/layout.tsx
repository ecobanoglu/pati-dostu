import { ArrowLeft, ChevronLeft } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { cacheLife } from "next/cache"

import { Logo } from "@/components/brand/logo"
import { Link } from "@/i18n/navigation"

/** Telif yılı (Cache Components'te new Date() önbellekli fonksiyonda olmalı). */
async function currentYear() {
  "use cache"
  cacheLife("days")
  return new Date().getFullYear()
}

/**
 * Kimlik sayfalarının sade düzeni (tasarım: 09-giris-yap, 26-mobil-giris…): tam menü yok.
 * Masaüstü: logo + "Anasayfaya dön", açık mor zemin, altta yasal bağlantılar. Mobil: yalnızca geri oku, beyaz zemin.
 */
export default async function AuthLayout({ children }: LayoutProps<"/[locale]">) {
  const [t, tFooter, year] = await Promise.all([getTranslations("Auth"), getTranslations("Footer"), currentYear()])
  const legalLink = "text-primary underline underline-offset-2 hover:text-purple-2"

  return (
    <div className="flex min-h-dvh flex-col bg-background lg:bg-smoke">
      <header className="lg:border-b lg:border-border lg:bg-background">
        <div className="mx-auto flex h-16 max-w-site items-center justify-between px-4 lg:h-[72px] lg:px-6">
          <Link
            href="/"
            aria-label={t("backToHome")}
            className="-ml-2 inline-flex size-tap items-center justify-center rounded-lg text-heading lg:hidden"
          >
            <ChevronLeft aria-hidden="true" className="size-6" />
          </Link>
          <Logo className="hidden lg:inline-flex" />
          <Link
            href="/"
            className="hidden min-h-tap items-center gap-2 rounded-lg px-2 font-extrabold text-primary hover:text-purple-2 lg:inline-flex"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            {t("backToHome")}
          </Link>
        </div>
      </header>

      <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
        {children}
      </main>

      <footer className="hidden px-4 py-8 text-center text-[13px] text-body lg:block">
        © {year} Pati Dostu ·{" "}
        <Link href={{ pathname: "/legal/[slug]", params: { slug: "kvkk" } }} className={legalLink}>
          {tFooter("kvkk")}
        </Link>{" "}
        ·{" "}
        <Link href={{ pathname: "/legal/[slug]", params: { slug: "gizlilik" } }} className={legalLink}>
          {tFooter("privacy")}
        </Link>{" "}
        ·{" "}
        <Link href={{ pathname: "/legal/[slug]", params: { slug: "kullanim-sartlari" } }} className={legalLink}>
          {tFooter("terms")}
        </Link>
      </footer>
    </div>
  )
}
