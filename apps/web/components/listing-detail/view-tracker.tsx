"use client"

import { useEffect } from "react"

import { apiFetch } from "@/lib/api-browser"

/**
 * Görüntülenme sayacı: sayfa açılınca POST /listings/{no}/views (oturum başına bir kez — sessionStorage).
 * Detay GET'i önbellekli ve yan etkisiz kalsın diye sayım ayrı istekle yapılır. Ekranda bir şey göstermez.
 */
export function ViewTracker({ listingNo }: { listingNo: number }) {
  useEffect(() => {
    const key = `pd:viewed:${listingNo}`
    try {
      if (sessionStorage.getItem(key)) return
      sessionStorage.setItem(key, "1")
    } catch {
      // Depolama kapalı (gizli pencere vb.): yine de say.
    }
    void apiFetch(`/listings/${listingNo}/views`, { method: "POST" })
  }, [listingNo])
  return null
}
