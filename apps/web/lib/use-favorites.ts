"use client"

import { useEffect, useSyncExternalStore } from "react"

import { apiFetch } from "./api-browser"

type State = { status: "idle" | "loading" | "guest" | "ready"; nos: ReadonlySet<number>; loadedAt: number }

/** Favori numaraları bu süreden eskiyse sayfa değişiminde yeniden okunur (başka sekmede yapılan değişiklikler için). */
const STALE_MS = 60_000

let state: State = { status: "idle", nos: new Set(), loadedAt: 0 }
const listeners = new Set<() => void>()

/** Depoyu günceller ve dinleyen bileşenlere haber verir. */
function setState(next: Partial<State>) {
  state = { ...state, ...next }
  listeners.forEach((listener) => listener())
}

/** useSyncExternalStore aboneliği. */
function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Sunucuda (SSR) kalpler boş ve "yükleniyor" çizilir; tarayıcıda gerçek durum gelir. */
const serverSnapshot: State = { status: "idle", nos: new Set(), loadedAt: 0 }

/**
 * Favorideki ilan numaralarını API'den okur (GET /me/favorites/ids). Oturum yoksa (401) misafir sayılır.
 * Aynı anda birden çok kalp bunu ister; istek tek seferde yapılır.
 */
async function load() {
  if (state.status === "loading") return
  if (state.status !== "idle" && Date.now() - state.loadedAt < STALE_MS) return
  setState({ status: "loading" })
  const { data, error } = await apiFetch<{ listingNos: number[] }>("/me/favorites/ids")
  if (data) setState({ status: "ready", nos: new Set(data.listingNos), loadedAt: Date.now() })
  else setState({ status: error.status === 401 ? "guest" : "idle", nos: new Set(), loadedAt: Date.now() })
}

/**
 * İlanı favoriye ekler/çıkarır. Arayüz hemen güncellenir (iyimser), istek başarısız olursa geri alınır.
 * Sonuç: "ok", "guest" (oturum yok — giriş gerekir) ya da "failed" (geri alındı).
 */
export async function toggleFavorite(listingNo: number, on: boolean): Promise<"ok" | "guest" | "failed"> {
  const previous = state.nos
  const next = new Set(previous)
  if (on) next.add(listingNo)
  else next.delete(listingNo)
  setState({ nos: next })
  const { error } = await apiFetch(`/listings/${listingNo}/favorite`, { method: on ? "PUT" : "DELETE" })
  if (!error) return "ok"
  const guest = error.status === 401
  setState({ nos: previous, status: guest ? "guest" : state.status })
  return guest ? "guest" : "failed"
}

/** Oturum değişince (giriş/çıkış) favori bilgisini sıfırlar; bir sonraki kalp yeniden okur. */
export function resetFavorites() {
  setState({ status: "idle", nos: new Set(), loadedAt: 0 })
}

/** Bir ilanın favori durumu ve kullanıcının misafir olup olmadığı. İlk kullanımda numaraları yükler. */
export function useFavorite(listingNo: number) {
  const snapshot = useSyncExternalStore(
    subscribe,
    () => state,
    () => serverSnapshot
  )
  useEffect(() => {
    void load()
  }, [])
  return {
    favorite: snapshot.nos.has(listingNo),
    guest: snapshot.status === "guest",
    ready: snapshot.status === "ready" || snapshot.status === "guest",
  }
}
