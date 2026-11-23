import { getTranslations } from "next-intl/server"
import { cacheLife } from "next/cache"

import { Logo } from "@/components/brand/logo"
import { Link } from "@/i18n/navigation"
import { site } from "@/lib/site"

import { LocaleSwitcher } from "./locale-switcher"

const linkClass = "inline-flex min-h-8 items-center text-[15px] text-white/85 hover:text-white hover:underline"

/** Telif yılı. Cache Components'te new Date() önbellekli bir fonksiyonda olmalı; günde bir yenilenir. */
async function currentYear() {
  "use cache"
  cacheLife("days")
  return new Date().getFullYear()
}

/**
 * Site alt bilgisi (tasarım: 01-anasayfa ve 16-mobil-anasayfa). Koyu zemin; logo, açıklama, iletişim,
 * sosyal medya, Platform / Hesap / Kurumsal bağlantıları ve dil seçici. Mobilde Hesap sütunu ve sosyal
 * medya butonları gizlenir (hesap bağlantıları mobilde menüde ve alt menüde var).
 */
export async function SiteFooter() {
  const [t, year] = await Promise.all([getTranslations("Footer"), currentYear()])

  return (
    <footer className="bg-heading text-white">
      <div className="mx-auto max-w-site px-4 pt-12 pb-8 lg:px-6 lg:pt-16">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr] lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
          <div className="max-w-sm">
            <Logo tone="dark" />
            <p className="mt-4 text-[15px] leading-relaxed text-white/85">{t("description")}</p>
            <a
              href={`mailto:${site.email}`}
              className="mt-4 inline-flex min-h-8 items-center font-bold text-white underline underline-offset-4"
            >
              {site.email}
            </a>
            <p className="mt-2 text-sm text-white/80">
              {t("followUs")} <span className="font-bold text-white">{site.socialHandle}</span>
            </p>
            <ul aria-label={t("socialLabel")} className="mt-4 hidden flex-wrap gap-2 md:flex">
              {site.social.map((s) => (
                <li key={s.name}>
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-9 items-center rounded-full border border-white/30 px-3 text-sm font-bold text-white hover:border-white"
                  >
                    {s.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid grid-cols-2 gap-8 md:contents">
            <FooterColumn title={t("platform")}>
              <li>
                <Link href="/listings" className={linkClass}>
                  {t("listings")}
                </Link>
              </li>
              <li>
                <Link href="/veterinarians" className={linkClass}>
                  {t("veterinarians")}
                </Link>
              </li>
              <li>
                <Link href="/shelters" className={linkClass}>
                  {t("shelters")}
                </Link>
              </li>
              <li>
                <Link href="/community" className={linkClass}>
                  {t("community")}
                </Link>
              </li>
              <li>
                <Link href="/blog" className={linkClass}>
                  {t("blog")}
                </Link>
              </li>
              <li>
                <Link href="/news" className={linkClass}>
                  {t("news")}
                </Link>
              </li>
            </FooterColumn>

            <FooterColumn title={t("account")} className="hidden lg:block">
              <li>
                <Link href="/sign-up" className={linkClass}>
                  {t("signUp")}
                </Link>
              </li>
              <li>
                <Link href="/sign-in" className={linkClass}>
                  {t("signIn")}
                </Link>
              </li>
              <li>
                <Link href="/account" className={linkClass}>
                  {t("dashboard")}
                </Link>
              </li>
              <li>
                <Link
                  href={{ pathname: "/account/organization-application", query: { tur: "klinik" } }}
                  className={linkClass}
                >
                  {t("clinicApplication")}
                </Link>
              </li>
              <li>
                <Link
                  href={{ pathname: "/account/organization-application", query: { tur: "barinak" } }}
                  className={linkClass}
                >
                  {t("shelterApplication")}
                </Link>
              </li>
            </FooterColumn>

            <FooterColumn title={t("corporate")}>
              <li>
                <Link href="/about" className={linkClass}>
                  {t("about")}
                </Link>
              </li>
              <li>
                <Link href="/social-responsibility" className={linkClass}>
                  {t("socialResponsibility")}
                </Link>
              </li>
              <li>
                <Link href="/contact" className={linkClass}>
                  {t("contact")}
                </Link>
              </li>
              <li>
                <Link href={{ pathname: "/legal/[slug]", params: { slug: "kvkk" } }} className={linkClass}>
                  {t("kvkk")}
                </Link>
              </li>
              <li>
                <Link href={{ pathname: "/legal/[slug]", params: { slug: "gizlilik" } }} className={linkClass}>
                  {t("privacy")}
                </Link>
              </li>
              <li>
                <Link href={{ pathname: "/legal/[slug]", params: { slug: "kullanim-sartlari" } }} className={linkClass}>
                  {t("terms")}
                </Link>
              </li>
              <li>
                <Link href="/faq" className={linkClass}>
                  {t("faq")}
                </Link>
              </li>
            </FooterColumn>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-white/20 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-white/80">{t("copyright", { year })}</p>
          <LocaleSwitcher />
        </div>
      </div>
    </footer>
  )
}

/** Başlıklı bağlantı sütunu; başlık ekran okuyucuda listeyi adlandırır. */
function FooterColumn({
  title,
  className,
  children,
}: {
  title: string
  className?: string
  children: React.ReactNode
}) {
  const id = `footer-${title.toLocaleLowerCase("tr-TR").replace(/\W+/g, "-")}`
  return (
    <div className={className}>
      <h2 id={id} className="text-base font-extrabold text-white">
        {title}
      </h2>
      <ul aria-labelledby={id} className="mt-3 space-y-1">
        {children}
      </ul>
    </div>
  )
}
