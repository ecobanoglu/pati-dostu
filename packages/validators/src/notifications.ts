import { z } from "zod"

/**
 * Bildirim konuları: kullanıcı her konu için site içi ve e-posta kanalını ayrı ayrı açıp kapatır (Profil ve ayarlar ›
 * Bildirim tercihleri). Yalnızca çalışan özelliklerin konuları burada; sorularıma cevap
 * (topluluk) ve kayıtlı arama (v1.2) özellikleri gelince eklenir. Mobil bildirim kanalı v2'de.
 */
export const notificationTopics = ["listing_review", "favorite_update", "new_message"] as const
export type NotificationTopic = (typeof notificationTopics)[number]

/** Bildirim türleri ve ait oldukları konu. */
export const notificationTypes = {
  /** İlanınız onaylandı (yayına girdi). */
  listing_approved: "listing_review",
  /** İlanınız reddedildi (gerekçeyle). */
  listing_rejected: "listing_review",
  /** İlanınız için düzeltme istendi (not + bölümler). */
  listing_changes_requested: "listing_review",
  /** Favorinizdeki ilan sahiplendirildi / kavuştu ya da yayından kaldırıldı. */
  favorite_closed: "favorite_update",
  /**
   * Yeni mesaj — konuşma başına bir kez: konuşmada okunmamış mesaj yokken gelen ilk mesajda gider; alıcı okuyana
   * kadar aynı konuşmadan yeni bildirim gitmez (karar).
   */
  new_message: "new_message",
} as const satisfies Record<string, NotificationTopic>
export type NotificationType = keyof typeof notificationTypes
export const notificationTypeList = Object.keys(notificationTypes) as NotificationType[]

const channels = z.object({ inApp: z.boolean(), email: z.boolean() })
export type NotificationChannels = z.infer<typeof channels>

/** Varsayılan tercihler: ilan sonucu ve yeni mesaj her iki kanalda; favori güncellemesi yalnızca site içinde. */
export const defaultNotificationPrefs: Record<NotificationTopic, NotificationChannels> = {
  listing_review: { inApp: true, email: true },
  favorite_update: { inApp: true, email: false },
  new_message: { inApp: true, email: true },
}

/** Kullanıcı tercihleri (PATCH /me › notificationPrefs): tüm konular gönderilir. */
export const notificationPrefsSchema = z.object(
  Object.fromEntries(notificationTopics.map((t) => [t, channels])) as Record<NotificationTopic, typeof channels>
)
export type NotificationPrefs = z.infer<typeof notificationPrefsSchema>

/** Veritabanındaki (eksik olabilen) tercihleri varsayılanlarla tamamlar. */
export function resolveNotificationPrefs(stored: unknown): NotificationPrefs {
  const value = (stored ?? {}) as Partial<Record<NotificationTopic, Partial<NotificationChannels>>>
  return Object.fromEntries(
    notificationTopics.map((t) => [t, { ...defaultNotificationPrefs[t], ...value[t] }])
  ) as NotificationPrefs
}

/** GET /me/notifications sorgusu: sayfa boyutu ve önceki sayfanın son öğesinden devam (cursor). */
export const notificationsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().max(100).optional(),
})
export type NotificationsQuery = z.infer<typeof notificationsQuerySchema>

/** POST /me/notifications/read gövdesi: belirli bildirimler; `ids` yoksa tümü okundu sayılır. */
export const markNotificationsReadSchema = z.object({ ids: z.array(z.uuid()).max(100).optional() })
export type MarkNotificationsReadInput = z.infer<typeof markNotificationsReadSchema>
