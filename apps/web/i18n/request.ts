import { hasLocale } from "next-intl"
import { getRequestConfig } from "next-intl/server"
import { notFound } from "next/navigation"
import * as rootParams from "next/root-params"

import { routing } from "./routing"

/**
 * Her istek için dili ve mesajları belirler. Dil, URL'deki [locale] kök parametresinden okunur
 * (next/root-params): Cache Components ile uyumludur, sayfalarda setRequestLocale gerekmez.
 * Route Handler ve Server Action'larda root-params çalışmaz; orada dil açıkça verilir (locale parametresi).
 */
export default getRequestConfig(async ({ locale: explicitLocale }) => {
  const locale = explicitLocale ?? (await rootParams.locale())
  if (!hasLocale(routing.locales, locale)) notFound()

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
    timeZone: "Europe/Istanbul",
  }
})
