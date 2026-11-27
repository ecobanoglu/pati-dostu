"use client"

import { useEffect, useSyncExternalStore } from "react"

import { apiFetch } from "./api-browser"

/** Okunmamış sayısı deposu: bileşenlerin kullandığı kanca ve sayıyı elle yenileme/düzeltme fonksiyonları. */
export type UnreadStore = {
  /** Sayıyı okur; ilk kullanan bileşen yoklamayı başlatır, son ayrılan durdurur. */
  useCount: () => number
  /** Sayıyı hemen API'den yeniden okur (ör. bir konuşma okundu işaretlenince). */
  refresh: () => Promise<void>
  /** Sayıyı yerelde düzeltir (ör. "Tümünü okundu işaretle" sonrası 0). */
  set: (next: number) => void
}

/** Oluşturulan depolar: giriş/çıkışta hepsi birlikte sıfırlanır. */
const stores: Array<{ reset: () => void }> = []

/**
 * Giriş ya da çıkıştan sonra çağrılır: tüm sayıları sıfırlar ve (misafirken durdurulmuş) yoklamayı yeniden başlatır.
 */
export function resetUnreadCounts() {
  stores.forEach((s) => s.reset())
}

/**
 * Bir "okunmamış sayısı" ucunu (`{ count }` döndüren GET) yoklayan küçük depo. Karar: gerçek zamanlı yerine polling —
 * sekme görünürken `pollMs` aralıkla ve sekmeye dönünce sorgular; arka plandaki sekme sorgulamaz. Aynı sayfadaki
 * birden çok rozet (üst menü, alt menü, Hesabım menüsü) tek istek kullanır. Oturum yoksa (401) sayı 0 kalır ve
 * yoklama durur (misafir için boşuna istek atılmasın); `resetUnreadCounts()` yeniden başlatır.
 */
export function createUnreadStore(path: string, pollMs: number): UnreadStore {
  let count = 0
  let timer: ReturnType<typeof setInterval> | null = null
  let users = 0
  let guest = false
  const listeners = new Set<() => void>()

  /** Sayıyı günceller ve dinleyenlere haber verir. */
  const set = (next: number) => {
    const value = Math.max(0, next)
    if (value === count) return
    count = value
    listeners.forEach((l) => l())
  }

  /** API'den okur. */
  const refresh = async () => {
    const { data, error } = await apiFetch<{ count: number }>(path)
    guest = error?.status === 401
    set(data?.count ?? 0)
  }

  /** Sekme görünürse ve oturum varsa sorgular. */
  const tick = () => {
    if (!guest && document.visibilityState === "visible") void refresh()
  }

  stores.push({
    reset: () => {
      guest = false
      set(0)
      if (users > 0) tick()
    },
  })

  /** Bileşenin kullandığı kanca; yoklamayı paylaşımlı başlatıp durdurur. */
  const useCount = () => {
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
        timer = setInterval(tick, pollMs)
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

  return { useCount, refresh, set }
}
