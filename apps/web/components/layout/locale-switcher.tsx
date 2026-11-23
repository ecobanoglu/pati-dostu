"use client"

import { Languages } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { useParams } from "next/navigation"
import { useTransition } from "react"

import { usePathname, useRouter } from "@/i18n/navigation"
import { type Locale, routing } from "@/i18n/routing"

/**
 * Dil seçici (footer). Yalnızca birden fazla dil açıksa görünür (NEXT_PUBLIC_LOCALES).
 * Aynı sayfanın diğer dildeki adresine gider: /ilanlar → /en/listings; seçim NEXT_LOCALE cookie'sinde hatırlanır.
 */
export function LocaleSwitcher() {
  const t = useTranslations("LocaleSwitcher")
  const tFooter = useTranslations("Footer")
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const params = useParams()
  const [pending, startTransition] = useTransition()

  if (routing.locales.length < 2) return null

  /** Seçilen dile geçer; dinamik segmentler (ör. [slug]) korunur. */
  function change(next: Locale) {
    startTransition(() => {
      // usePathname iç yolu verir; dinamik yollarda parametreleri de iletmek gerekir.
      router.replace({ pathname, params } as never, { locale: next })
    })
  }

  return (
    <label className="inline-flex items-center gap-2 text-sm text-white/80">
      <Languages aria-hidden="true" className="size-4" />
      <span className="sr-only">{tFooter("language")}</span>
      <select
        value={locale}
        disabled={pending}
        onChange={(e) => change(e.target.value as Locale)}
        className="min-h-tap rounded-lg border border-white/30 bg-transparent px-3 text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        {routing.locales.map((l) => (
          <option key={l} value={l} className="text-heading">
            {t(l)}
          </option>
        ))}
      </select>
    </label>
  )
}
