"use client"

import { useLocale } from "next-intl"
import { useCallback } from "react"

import { getPathname } from "@/i18n/navigation"
import type { AppPathname } from "@/i18n/routing"

/**
 * Sitenin bir sayfasının aktif dildeki tam adresini üretir: "/verify-email" → "https://pati-dostu.com/e-posta-dogrula".
 * Better Auth e-postadaki bağlantıdan sonra kullanıcıyı bu adrese yönlendirir (callbackURL/redirectTo tam adres ister).
 */
export function useAbsoluteUrl() {
  const locale = useLocale()
  return useCallback(
    (href: Exclude<AppPathname, `${string}[${string}`>, query?: Record<string, string>) => {
      const path = getPathname({ href, locale })
      const search = query ? `?${new URLSearchParams(query).toString()}` : ""
      return `${window.location.origin}${path}${search}`
    },
    [locale]
  )
}
