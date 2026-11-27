"use client"

import { createUnreadStore } from "./unread-store"

/**
 * Mesaj rozeti: tüm konuşmalardaki okunmamış mesaj sayısı (GET /conversations/unread-count). 30 sn'de bir (sekme
 * görünürken) yenilenir; Mesajlar sayfası okuyunca hemen günceller.
 */
const store = createUnreadStore("/conversations/unread-count", 30_000)

/** Okunmamış mesaj sayısı (üst menü, mobil alt menü, Hesabım menüsü). */
export const useUnreadMessages = store.useCount
/** Sayıyı hemen API'den yeniden okur (konuşma okundu işaretlenince). */
export const refreshUnreadMessages = store.refresh
