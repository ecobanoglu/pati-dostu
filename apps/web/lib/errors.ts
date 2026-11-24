"use client"

import { useTranslations } from "next-intl"
import { useCallback } from "react"

/** API hata yanıtındaki koda özgü ek bilgi (ör. CONTENT_BLOCKED → { reason, field }). */
export type ErrorDetails = Record<string, unknown> | undefined

/**
 * Hata kodunu (API, Better Auth veya form şeması) aktif dildeki metne çevirir: messages › Errors.<kod>.
 * İçerik filtresinde neden de kullanılır: CONTENT_BLOCKED + { reason: "phone" } → Errors.CONTENT_BLOCKED_PHONE.
 * Bilinmeyen kodlarda genel "Bir hata oluştu" metni döner; API'nin `message` alanı arayüzde gösterilmez.
 */
export function useErrorMessage() {
  const t = useTranslations("Errors")
  return useCallback(
    (code: string | undefined | null, details?: ErrorDetails): string => {
      if (code === "CONTENT_BLOCKED" && typeof details?.reason === "string") {
        const specific = `CONTENT_BLOCKED_${details.reason.toUpperCase()}`
        if (t.has(specific as never)) return t(specific as never)
      }
      if (code && t.has(code as never)) return t(code as never)
      return t("UNKNOWN")
    },
    [t]
  )
}

/**
 * Better Auth istemcisinin döndürdüğü hatadan kodu çıkarır. Ağ hatasında (API kapalı, bağlantı yok)
 * status 0 gelir → NETWORK_ERROR; 429 → TOO_MANY_REQUESTS.
 */
export function authErrorCode(error: { code?: string; status?: number } | null | undefined): string {
  if (!error) return "UNKNOWN"
  if (error.status === 429) return "TOO_MANY_REQUESTS"
  if (error.code) return error.code
  if (!error.status) return "NETWORK_ERROR"
  return "UNKNOWN"
}

/**
 * Giriş sonrası dönülecek adres güvenli mi? Yalnızca site içi yollar kabul edilir
 * (açık yönlendirme açığını önlemek için "//başka-site" ve "/\\" biçimleri reddedilir).
 */
export function safeNextPath(value: string | null | undefined): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return null
  return value
}
