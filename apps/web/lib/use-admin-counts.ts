"use client"

import { useEffect, useSyncExternalStore } from "react"

import { apiFetch } from "./api-browser"

/** Admin kenar çubuğu rozetleri (GET /admin/counts). */
export type AdminCounts = { pendingListings: number; pendingApplications: number; openReports: number }

const EMPTY: AdminCounts = { pendingListings: 0, pendingApplications: 0, openReports: 0 }
/** Yoklama aralığı: dakikada bir (sekme görünürken). */
const POLL_MS = 60_000

let counts = EMPTY
let users = 0
let timer: ReturnType<typeof setInterval> | null = null
const listeners = new Set<() => void>()

/** Sayıları API'den okur, dinleyenlere haber verir. */
export async function refreshAdminCounts(): Promise<void> {
  const { data } = await apiFetch<AdminCounts>("/admin/counts")
  if (!data) return
  counts = data
  listeners.forEach((l) => l())
}

/** Sekme görünür olunca hemen yeniler. */
function onVisible() {
  if (document.visibilityState === "visible") void refreshAdminCounts()
}

/** Abonelik: ilk kullanan yoklamayı başlatır, son ayrılan durdurur. */
function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/**
 * Bekleyen iş sayıları (onay bekleyen ilan, kurum başvurusu, açık şikâyet). Aynı sayfadaki tüm rozetler tek isteği
 * paylaşır; sekme görünürken dakikada bir yenilenir. Admin bir işlem yapınca `refreshAdminCounts()` çağrılır.
 */
export function useAdminCounts(): AdminCounts {
  useEffect(() => {
    users += 1
    if (users === 1) {
      void refreshAdminCounts()
      timer = setInterval(() => document.visibilityState === "visible" && void refreshAdminCounts(), POLL_MS)
      document.addEventListener("visibilitychange", onVisible)
    }
    return () => {
      users -= 1
      if (users === 0) {
        if (timer) clearInterval(timer)
        timer = null
        document.removeEventListener("visibilitychange", onVisible)
      }
    }
  }, [])
  return useSyncExternalStore(
    subscribe,
    () => counts,
    () => EMPTY
  )
}
