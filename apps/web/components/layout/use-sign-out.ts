"use client"

import { useTranslations } from "next-intl"
import { useState, useTransition } from "react"

import { useRouter } from "@/i18n/navigation"
import { authClient } from "@/lib/auth-client"
import { resetUnreadCounts } from "@/lib/unread-store"
import { resetFavorites } from "@/lib/use-favorites"

/**
 * Çıkış işlemi: API'de oturumu kapatır, anasayfaya döner ve sunucu bileşenlerini (üst menü) yeniler.
 * Hata olursa çevrilmiş mesajı `error` ile döndürür.
 */
export function useSignOut() {
  const t = useTranslations("UserMenu")
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  /** Çıkışı başlatır; menüden veya butondan çağrılır. */
  function signOut() {
    setError(null)
    startTransition(async () => {
      const { error: apiError } = await authClient.signOut()
      if (apiError) {
        setError(t("signOutFailed"))
        return
      }
      resetFavorites()
      resetUnreadCounts()
      router.replace("/")
      router.refresh()
    })
  }

  return { signOut, pending, error }
}
