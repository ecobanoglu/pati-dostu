"use client"

import {
  Award,
  Check,
  FilePen,
  Flag,
  Heart,
  MessageCircle,
  MessageSquareText,
  MessagesSquare,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react"
import { useFormatter, useTranslations } from "next-intl"
import { useEffect, useState } from "react"

import { Link } from "@/i18n/navigation"
import { apiFetch } from "@/lib/api-browser"
import { setUnreadNotifications } from "@/lib/use-unread-notifications"
import { cn } from "@/lib/utils"

export type NotificationItem = {
  id: string
  type:
    | "listing_approved"
    | "listing_rejected"
    | "listing_changes_requested"
    | "favorite_closed"
    | "new_message"
    | "listing_comment"
    | "forum_reply"
    | "forum_best_answer"
    | "report_created"
  payload: Record<string, unknown>
  readAt: string | null
  createdAt: string
}

export type NotificationPage = { items: NotificationItem[]; unreadCount: number; nextCursor: string | null }

type Tab = "all" | "unread"
type Group = "today" | "yesterday" | "thisWeek" | "older"

const TIME_ZONE = "Europe/Istanbul"
const dayKey = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})

/** Tarihin İstanbul saatine göre takvim günü (gün farkı hesabı için UTC gece yarısı olarak). */
function istanbulDay(date: Date): number {
  return Date.parse(`${dayKey.format(date)}T00:00:00Z`)
}

/** Bildirimin hangi başlık altında duracağı: Bugün / Dün / Bu hafta (son 7 gün) / Daha eski — İstanbul takvimine göre. */
function groupOf(createdAt: string, now: Date): Group {
  const days = Math.round((istanbulDay(now) - istanbulDay(new Date(createdAt))) / 86_400_000)
  if (days <= 0) return "today"
  if (days === 1) return "yesterday"
  if (days < 7) return "thisWeek"
  return "older"
}

/** Türe göre ikon ve renk (renk tek başına anlam taşımaz; başlık türü zaten söyler). */
const tones: Record<NotificationItem["type"], { icon: LucideIcon; className: string }> = {
  listing_approved: { icon: Check, className: "text-success-text" },
  listing_rejected: { icon: TriangleAlert, className: "text-danger" },
  listing_changes_requested: { icon: FilePen, className: "text-notice-text" },
  favorite_closed: { icon: Heart, className: "text-success-text" },
  new_message: { icon: MessageCircle, className: "text-primary" },
  listing_comment: { icon: MessageSquareText, className: "text-primary" },
  forum_reply: { icon: MessagesSquare, className: "text-primary" },
  forum_best_answer: { icon: Award, className: "text-success-text" },
  report_created: { icon: Flag, className: "text-danger" },
}

/** Payload'daki metin alanını güvenle okur (API `Record<string, unknown>` döndürür). */
function str(payload: Record<string, unknown>, key: string): string {
  const v = payload[key]
  return typeof v === "string" ? v : typeof v === "number" ? String(v) : ""
}

/**
 * Çeviri anahtarı: favori bildiriminde sonuca göre (sahiplendirildi / kavuştu / kaldırıldı), topluluk cevabında
 * soru sahibine mi takip edene mi gittiğine göre ayrı metin.
 */
function messageKey(n: NotificationItem): string {
  if (n.type === "forum_reply") return n.payload.own === false ? "forum_reply_follow" : "forum_reply_own"
  if (n.type !== "favorite_closed") return n.type
  const outcome = str(n.payload, "outcome")
  return `favorite_closed_${outcome === "adopted" || outcome === "reunited" ? outcome : "closed"}`
}

/**
 * Bildirime tıklayınca gidilecek yer: onaylanan ilanın detayı, reddedilen/düzeltme istenen için İlanlarım, favori
 * bildiriminde Favoriler (ilan artık yayında olmadığından detayına gidilmez), yeni mesajda o konuşma, ilan yorumunda
 * ilanın yorumlar bölümü.
 */
function targetOf(n: NotificationItem) {
  if (n.type === "listing_approved" || n.type === "listing_comment") {
    const slug = str(n.payload, "slug")
    const no = str(n.payload, "listingNo")
    if (slug && no) {
      return {
        pathname: "/listing/[slug]" as const,
        params: { slug: `${slug}-${no}` },
        ...(n.type === "listing_comment" ? { hash: "comments" } : {}),
      }
    }
  }
  // Yeni şikâyet (admin): ilan/yorum ise ilgili ilan; kullanıcı şikâyetinin sayfası yok (admin paneli 5. aşamada).
  if (n.type === "report_created") {
    const slug = str(n.payload, "slug")
    const no = str(n.payload, "listingNo")
    if (slug && no) {
      return {
        pathname: "/listing/[slug]" as const,
        params: { slug: `${slug}-${no}` },
        ...(str(n.payload, "targetType") === "comment" ? { hash: "comments" } : {}),
      }
    }
    return "/account/notifications" as const
  }
  if (n.type === "forum_reply" || n.type === "forum_best_answer") {
    const slug = str(n.payload, "topicSlug")
    const category = str(n.payload, "categorySlug")
    if (slug && category) return { pathname: "/community/[category]/[slug]" as const, params: { category, slug } }
    return "/community" as const
  }
  if (n.type === "favorite_closed") return "/account/favorites" as const
  if (n.type === "new_message") {
    const c = str(n.payload, "conversationId")
    return c ? { pathname: "/account/messages" as const, query: { c } } : ("/account/messages" as const)
  }
  return "/account/listings" as const
}

/**
 * Bildirim listesi (tasarım 02-hesabim/05, 12): Tümü / Okunmamış sekmeleri, "Tümünü okundu işaretle", gün
 * gruplarına ayrılmış satırlar, okunmamışta nokta + açık mor zemin (ekran okuyucuya "Okunmadı"), cursor ile "Daha
 * fazla göster". Satıra basınca bildirim okundu sayılır ve ilgili sayfaya gidilir. Zildeki sayı da güncellenir.
 */
export function NotificationsList({ initial, now }: { initial: NotificationPage; now: string }) {
  const t = useTranslations("Notifications")
  const tr = useTranslations("Reports")
  const format = useFormatter()
  const [items, setItems] = useState(initial.items)
  const [unread, setUnread] = useState(initial.unreadCount)
  const [cursor, setCursor] = useState(initial.nextCursor)
  const [tab, setTab] = useState<Tab>("all")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const nowDate = new Date(now)

  // Sayfa açıldığında zildeki sayıyı buradaki kesin değerle eşitle.
  useEffect(() => setUnreadNotifications(initial.unreadCount), [initial.unreadCount])

  /** Verilen bildirimleri (yoksa tümünü) okundu işaretler; arayüzü hemen günceller, istek arka planda gider. */
  function markRead(ids?: string[]) {
    const stamp = new Date().toISOString()
    const targets = new Set(ids ?? items.filter((n) => !n.readAt).map((n) => n.id))
    const changed = items.filter((n) => !n.readAt && targets.has(n.id)).length
    if (ids && changed === 0) return
    const next = ids ? Math.max(0, unread - changed) : 0
    setItems((list) => list.map((n) => (!n.readAt && (!ids || targets.has(n.id)) ? { ...n, readAt: stamp } : n)))
    setUnread(next)
    setUnreadNotifications(next)
    void apiFetch("/me/notifications/read", {
      method: "POST",
      body: JSON.stringify(ids ? { ids } : {}),
      keepalive: true,
    })
  }

  /** Sonraki sayfayı (cursor) getirir ve listenin sonuna ekler. */
  async function loadMore() {
    if (!cursor) return
    setLoading(true)
    setError(false)
    const { data } = await apiFetch<NotificationPage>(`/me/notifications?cursor=${encodeURIComponent(cursor)}`)
    setLoading(false)
    if (!data) return setError(true)
    setItems((list) => [...list, ...data.items.filter((n) => !list.some((x) => x.id === n.id))])
    setCursor(data.nextCursor)
  }

  const shown = tab === "all" ? items : items.filter((n) => !n.readAt)
  const groups = (["today", "yesterday", "thisWeek", "older"] as const)
    .map((g) => ({ key: g, items: shown.filter((n) => groupOf(n.createdAt, nowDate) === g) }))
    .filter((g) => g.items.length > 0)

  return (
    <>
      <div className="overflow-hidden rounded-card border border-border bg-background">
        <div className="flex flex-wrap items-center justify-between gap-x-4 border-b border-border px-2 lg:px-3">
          <div role="group" aria-label={t("tabsLabel")} className="flex gap-1">
            {(["all", "unread"] as const).map((key) => (
              <button
                key={key}
                type="button"
                aria-pressed={tab === key}
                onClick={() => setTab(key)}
                className={cn(
                  "-mb-px flex min-h-13 items-center gap-1.5 border-b-[3px] px-3 text-[15px] font-extrabold whitespace-nowrap",
                  "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
                  tab === key ? "border-primary text-primary" : "border-transparent text-heading hover:text-primary"
                )}
              >
                {key === "all" ? t("tabAll") : t("tabUnread")}
                {key === "unread" && unread > 0 && <span>{format.number(unread)}</span>}
              </button>
            ))}
          </div>
          {unread > 0 && (
            <button
              type="button"
              onClick={() => markRead()}
              className="min-h-tap px-3 text-sm font-extrabold text-primary underline underline-offset-4 hover:text-primary/80 focus-visible:outline-2 focus-visible:outline-ring"
            >
              {t("markAll")}
            </button>
          )}
        </div>

        {groups.length === 0 ? (
          <p className="p-6 text-body">{tab === "unread" && items.length > 0 ? t("emptyUnread") : t("empty")}</p>
        ) : (
          groups.map((group) => (
            <section key={group.key} aria-labelledby={`notif-${group.key}`}>
              <h2
                id={`notif-${group.key}`}
                className="border-b border-border bg-smoke-2/60 px-4 py-2 text-sm font-extrabold text-body lg:px-5"
              >
                {t(group.key)}
              </h2>
              <ul className="divide-y divide-border border-b border-border">
                {group.items.map((n) => (
                  <Row
                    key={n.id}
                    item={n}
                    title={t(`item.${messageKey(n)}.title` as never)}
                    body={t(`item.${messageKey(n)}.body` as "item.listing_rejected.body", {
                      title: str(n.payload, "title"),
                      reason:
                        n.type === "report_created"
                          ? tr(`reasons.${str(n.payload, "reason")}` as "reasons.other")
                          : str(n.payload, "reason"),
                      target:
                        n.type === "report_created"
                          ? tr(`targets.${str(n.payload, "targetType")}` as "targets.user")
                          : "",
                      note: str(n.payload, "note"),
                      sender: str(n.payload, "senderName") || str(n.payload, "authorName"),
                      preview: str(n.payload, "preview"),
                    })}
                    time={
                      group.key === "yesterday" ? t("yesterday") : format.relativeTime(new Date(n.createdAt), nowDate)
                    }
                    unreadLabel={t("unread")}
                    onOpen={() => markRead([n.id])}
                  />
                ))}
              </ul>
            </section>
          ))
        )}

        {cursor && (
          <div className="flex flex-col items-center gap-2 p-4">
            <button
              type="button"
              onClick={loadMore}
              disabled={loading}
              aria-busy={loading}
              className="min-h-tap rounded-full border border-border px-5 text-sm font-extrabold text-heading hover:bg-smoke-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60"
            >
              {t("loadMore")}
            </button>
            <p role="status" className="text-sm font-bold text-danger empty:hidden">
              {error ? t("loadFailed") : ""}
            </p>
          </div>
        )}
      </div>

      <Link
        href="/account/settings"
        className="mt-5 inline-flex min-h-tap items-center text-sm font-extrabold text-primary underline underline-offset-4 hover:text-primary/80 focus-visible:outline-2 focus-visible:outline-ring"
      >
        {t("prefsLink")}
      </Link>
    </>
  )
}

/** Tek bildirim satırı: ikon, başlık, metin, zaman; okunmamışsa açık mor zemin + nokta. Tamamı bağlantıdır. */
function Row({
  item,
  title,
  body,
  time,
  unreadLabel,
  onOpen,
}: {
  item: NotificationItem
  title: string
  body: string
  time: string
  unreadLabel: string
  onOpen: () => void
}) {
  const { icon: Icon, className } = tones[item.type]
  const isUnread = !item.readAt
  return (
    <li>
      <Link
        href={targetOf(item)}
        onClick={onOpen}
        className={cn(
          "flex gap-4 px-4 py-4 hover:bg-smoke/70 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring lg:px-5",
          isUnread && "bg-smoke/50"
        )}
      >
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-background">
          <Icon aria-hidden="true" className={cn("size-5", className)} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-extrabold text-heading">
            {title}
            {isUnread && <span className="sr-only"> — {unreadLabel}</span>}
          </span>
          <span className="block text-sm break-words text-body">{body}</span>
          <span className="mt-0.5 block text-xs font-bold text-primary">{time}</span>
        </span>
        {isUnread && <span aria-hidden="true" className="mt-2 size-2.5 shrink-0 rounded-full bg-primary" />}
      </Link>
    </li>
  )
}
