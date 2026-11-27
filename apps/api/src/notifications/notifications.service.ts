import { Injectable, Logger } from "@nestjs/common"
import { type Database, notification, user } from "@pati-dostu/db"
import {
  type NotificationType,
  notificationTypes,
  type NotificationsQuery,
  resolveNotificationPrefs,
} from "@pati-dostu/validators"
import { and, count, desc, eq, inArray, isNull, lt, or, sql } from "drizzle-orm"

import { env } from "../config/env.js"
import { InjectDb } from "../database/database.module.js"
import { MailService } from "../mail/mail.service.js"
import { type MailLocale, type NotificationMailData, notificationMail } from "../mail/templates.js"

/** Bildirimin taşıdığı veri (metin değil): web ve e-posta metni bu veriden kullanıcının dilinde üretilir. */
export type NotificationPayload =
  | { type: "listing_approved"; listingId: string; listingNo: number; slug: string | null; title: string }
  | { type: "listing_rejected"; listingId: string; listingNo: number; title: string; reason: string }
  | { type: "listing_changes_requested"; listingId: string; listingNo: number; title: string; note: string }
  | {
      type: "favorite_closed"
      listingNo: number
      title: string
      /** adopted: sahiplendirildi; reunited: kayıp/bulunan ilanında kavuştu; closed: yayından kaldırıldı. */
      outcome: "adopted" | "reunited" | "closed"
    }
  | {
      type: "new_message"
      conversationId: string
      senderName: string
      /** Konuşmanın ilanının başlığı. */
      title: string
      /** Mesajın ilk 140 karakteri. */
      preview: string
    }
  | {
      type: "listing_comment"
      listingNo: number
      slug: string | null
      title: string
      authorName: string
      /** Yorumun ilk 140 karakteri. */
      preview: string
    }
  | {
      type: "forum_reply"
      topicSlug: string
      /** Konu adresi /topluluk/{kategori}/{konu}. */
      categorySlug: string
      title: string
      authorName: string
      preview: string
      /** true: soru sahibine ("Sorunuza yeni cevap"); false: takip edene ("Takip ettiğiniz konuya…"). */
      own: boolean
    }
  | { type: "forum_best_answer"; topicSlug: string; categorySlug: string; title: string }
  | {
      type: "report_created"
      reportId: string
      targetType: "listing" | "comment" | "user" | "topic" | "reply"
      reason: string
      /** İlan ve yorum şikâyetinde ilgili ilan. */
      listingNo: number | null
      slug: string | null
      /** İlan başlığı ya da (kullanıcı şikâyetinde) kullanıcının adı. */
      title: string
    }

/** Web adresleri (e-postadaki butonlar için; Türkçe öneksiz, İngilizce /en önekli — web › i18n/routing). */
const WEB_PATHS = {
  myListings: { tr: "/hesabim/ilanlarim", en: "/en/account/listings" },
  favorites: { tr: "/hesabim/favoriler", en: "/en/account/favorites" },
  listing: { tr: "/ilan", en: "/en/listing" },
  messages: { tr: "/hesabim/mesajlar", en: "/en/account/messages" },
  notifications: { tr: "/hesabim/bildirimler", en: "/en/account/notifications" },
  community: { tr: "/topluluk", en: "/en/community" },
} as const

/**
 * Bildirimler: üretme (site içi kayıt + e-posta, kullanıcının konu/kanal tercihine göre), listeleme ve okundu
 * işaretleme. Bildirim metni saklanmaz; tür + veri saklanır, metin istemcide/e-postada kullanıcının diline göre
 * üretilir. E-posta gönderilemezse asıl işlem (ör. admin onayı) başarısız sayılmaz, yalnızca günlüğe yazılır.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name)

  constructor(
    @InjectDb() private readonly db: Database,
    private readonly mail: MailService
  ) {}

  /**
   * Bir ya da daha çok kullanıcıya bildirim gönderir. Silinmiş hesaplar atlanır; e-posta yalnızca adresi doğrulanmış
   * kullanıcıya gider.
   */
  async notify(userIds: string | string[], payload: NotificationPayload): Promise<void> {
    const ids = [...new Set(Array.isArray(userIds) ? userIds : [userIds])]
    if (ids.length === 0) return
    const topic = notificationTypes[payload.type]
    const recipients = await this.db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        locale: user.locale,
        prefs: user.notificationPrefs,
      })
      .from(user)
      .where(and(inArray(user.id, ids), isNull(user.deletedAt)))

    const { type, ...data } = payload
    const inApp = recipients.filter((r) => resolveNotificationPrefs(r.prefs)[topic].inApp)
    if (inApp.length > 0) {
      await this.db.insert(notification).values(inApp.map((r) => ({ userId: r.id, type, payload: data })))
    }

    for (const r of recipients) {
      if (!r.emailVerified || !resolveNotificationPrefs(r.prefs)[topic].email) continue
      const locale: MailLocale = r.locale === "en" ? "en" : "tr"
      try {
        await this.mail.send(notificationMail(locale, r.email, r.name, this.mailData(payload, locale)))
      } catch (error) {
        this.logger.warn(`Bildirim e-postası gönderilemedi (${type} → ${r.id}): ${String(error)}`)
      }
    }
  }

  /**
   * Kullanıcının bildirimleri, en yeni önce (cursor: önceki sayfanın son öğesi "zaman|id"). Okunmamış sayısı da
   * döner (üst menüdeki zil ve "Okunmamış" sekmesi için).
   */
  async list(userId: string, q: NotificationsQuery) {
    const after = this.parseCursor(q.cursor)
    const rows = await this.db
      .select({
        id: notification.id,
        type: notification.type,
        payload: notification.payload,
        readAt: notification.readAt,
        createdAt: notification.createdAt,
      })
      .from(notification)
      .where(
        and(
          eq(notification.userId, userId),
          after
            ? or(
                lt(notification.createdAt, after.at),
                and(eq(notification.createdAt, after.at), lt(notification.id, after.id))
              )
            : undefined
        )
      )
      .orderBy(desc(notification.createdAt), desc(notification.id))
      .limit(q.limit + 1)
    const page = rows.slice(0, q.limit)
    const last = page.at(-1)
    return {
      items: page
        .filter((r) => r.type in notificationTypes)
        .map((r) => ({
          id: r.id,
          type: r.type as NotificationType,
          payload: r.payload,
          readAt: r.readAt?.toISOString() ?? null,
          createdAt: r.createdAt.toISOString(),
        })),
      unreadCount: await this.unreadCount(userId),
      nextCursor: rows.length > q.limit && last ? `${last.createdAt.toISOString()}|${last.id}` : null,
    }
  }

  /** Okunmamış bildirim sayısı (zil rozeti; sık sorgulanır, yalnızca sayı döner). */
  async unreadCount(userId: string): Promise<number> {
    const [row] = await this.db
      .select({ value: count() })
      .from(notification)
      .where(and(eq(notification.userId, userId), isNull(notification.readAt)))
    return row?.value ?? 0
  }

  /** Bildirimleri okundu işaretler: `ids` verilirse yalnız onları, verilmezse kullanıcının tümünü. */
  async markRead(userId: string, ids?: string[]): Promise<void> {
    await this.db
      .update(notification)
      .set({ readAt: sql`now()` })
      .where(
        and(
          eq(notification.userId, userId),
          isNull(notification.readAt),
          ids ? inArray(notification.id, ids) : undefined
        )
      )
  }

  /** "zaman|id" biçimindeki cursor'ı çözer; bozuksa yok sayar. */
  private parseCursor(cursor?: string): { at: Date; id: string } | null {
    const [at, id] = cursor?.split("|") ?? []
    const date = at ? new Date(at) : null
    return date && !Number.isNaN(date.getTime()) && id ? { at: date, id } : null
  }

  /** E-postadaki metin ve buton adresi için veri. */
  private mailData(payload: NotificationPayload, locale: MailLocale): NotificationMailData {
    const web = env.WEB_URL
    switch (payload.type) {
      case "listing_approved":
        return {
          type: payload.type,
          title: payload.title,
          url: `${web}${WEB_PATHS.listing[locale]}/${payload.slug ? `${payload.slug}-` : ""}${payload.listingNo}`,
        }
      case "listing_rejected":
        return {
          type: payload.type,
          title: payload.title,
          reason: payload.reason,
          url: `${web}${WEB_PATHS.myListings[locale]}`,
        }
      case "listing_changes_requested":
        return {
          type: payload.type,
          title: payload.title,
          note: payload.note,
          url: `${web}${WEB_PATHS.myListings[locale]}`,
        }
      case "favorite_closed":
        return {
          type: payload.type,
          title: payload.title,
          outcome: payload.outcome,
          url: `${web}${WEB_PATHS.favorites[locale]}`,
        }
      case "new_message":
        return {
          type: payload.type,
          title: payload.title,
          senderName: payload.senderName,
          preview: payload.preview,
          url: `${web}${WEB_PATHS.messages[locale]}?c=${payload.conversationId}`,
        }
      case "listing_comment":
        return {
          type: payload.type,
          title: payload.title,
          senderName: payload.authorName,
          preview: payload.preview,
          url: `${web}${WEB_PATHS.listing[locale]}/${payload.slug ? `${payload.slug}-` : ""}${payload.listingNo}#comments`,
        }
      case "forum_reply":
        return {
          type: payload.type,
          title: payload.title,
          senderName: payload.authorName,
          preview: payload.preview,
          own: payload.own,
          url: `${web}${WEB_PATHS.community[locale]}/${payload.categorySlug}/${payload.topicSlug}`,
        }
      case "forum_best_answer":
        return {
          type: payload.type,
          title: payload.title,
          url: `${web}${WEB_PATHS.community[locale]}/${payload.categorySlug}/${payload.topicSlug}`,
        }
      case "report_created":
        // E-posta varsayılan kapalı (karar); açılırsa bildirimler sayfasına yönlendirir (admin paneli 5. aşamada).
        return {
          type: payload.type,
          title: payload.title,
          url: `${web}${WEB_PATHS.notifications[locale]}`,
        }
    }
  }
}
