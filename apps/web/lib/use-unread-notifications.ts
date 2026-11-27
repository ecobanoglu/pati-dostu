"use client"

import { createUnreadStore } from "./unread-store"

/** Zil rozeti: okunmamış bildirim sayısı, dakikada bir (sekme görünürken) yenilenir. */
const store = createUnreadStore("/me/notifications/unread-count", 60_000)

/** Okunmamış bildirim sayısı (üst menüdeki zil). */
export const useUnreadNotifications = store.useCount
/** Sayıyı hemen API'den yeniden okur. */
export const refreshUnreadNotifications = store.refresh
/** Bildirimler sayfası okundu işaretleyince rozeti hemen düşürmek için. */
export const setUnreadNotifications = store.set
