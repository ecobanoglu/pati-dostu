"use client"

import { useEffect, useSyncExternalStore } from "react"

import { apiFetch } from "./api-browser"

/** Zil rozeti bu aralıkla yenilenir (karar: gerçek zamanlı yerine polling). Sekme arka plandayken sorgulanmaz. */
const POLL_MS = 60_000

let count = 0
let timer: ReturnType<typeof setInterval> | null = null
let users = 0
const listeners = new Set<() => void>()

/** Sayıyı günceller ve dinleyenlere haber verir. */
function set(next: number) {
  if (next === count) return
  count = next
  listeners.forEach((l) => l())
}

/** Okunmamış sayısını API'den okur (GET /me/notifications/unread-count). Oturum yoksa 0. */
export async function refreshUnreadNotifications(): Promise<void> {
  const { data } = await apiFetch<{ count: number }>("/me/notifications/unread-count")
  set(data?.count ?? 0)
}

/** Bildirimler sayfası okundu işaretleyince rozeti hemen düşürmek için. */
export function setUnreadNotifications(next: number) {
  set(Math.max(0, next))
}

/** Sekme görünürse sorgular (arka plandaki sekme API'yi boşuna meşgul etmesin). */
function tick() {
  if (document.visibilityState === "visible") void refreshUnreadNotifications()
}

/**
 * Okunmamış bildirim sayısı. İlk kullanan bileşen yoklamayı başlatır (hemen + dakikada bir + sekmeye dönünce),
 * son kullanan ayrılınca durdurur; aynı sayfadaki birden çok zil tek istek kullanır.
 */
export function useUnreadNotifications(): number {
  const value = useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => count,
    () => 0
  )
  useEffect(() => {
    users++
    if (users === 1) {
      tick()
      timer = setInterval(tick, POLL_MS)
      document.addEventListener("visibilitychange", tick)
    }
    return () => {
      users--
      if (users === 0) {
        if (timer) clearInterval(timer)
        timer = null
        document.removeEventListener("visibilitychange", tick)
      }
    }
  }, [])
  return value
}
