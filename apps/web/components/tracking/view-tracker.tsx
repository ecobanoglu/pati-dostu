"use client"

import { useEffect } from "react"

import { apiFetch } from "@/lib/api-browser"

/**
 * Görüntülenme sayacı: sayfa açılınca `path`'e POST atar (oturum başına bir kez — sessionStorage `key`). Detay GET'i
 * yan etkisiz kalsın diye sayım ayrı istekle yapılır; sahibin/yazarın kendi bakışını API saymaz. Ekranda bir şey
 * göstermez. Kullanılan yerler: ilan detayı (/listings/{no}/views), topluluk konusu (/forum/topics/{id}/views),
 * blog yazısı / haber (/posts/{id}/views).
 */
export function ViewTracker({ storageKey, path }: { storageKey: string; path: string }) {
  useEffect(() => {
    const key = `pd:viewed:${storageKey}`
    try {
      if (sessionStorage.getItem(key)) return
      sessionStorage.setItem(key, "1")
    } catch {
      // Depolama kapalı (gizli pencere vb.): yine de say.
    }
    void apiFetch(path, { method: "POST" })
  }, [storageKey, path])
  return null
}
