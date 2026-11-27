import { useFormatter, useTranslations } from "next-intl"
import type { MouseEvent } from "react"

import { PdMark } from "@/components/brand/logo"
import { Link } from "@/i18n/navigation"
import { cn } from "@/lib/utils"

import { listTime } from "./time"
import type { Conversation } from "./types"

/**
 * Konuşma listesindeki tek satır (tasarım 01-sayfalar/12 ve Panel özeti › Son mesajlar): ilan kapağı, karşı tarafın
 * adı, ilan başlığı, son mesaj (okunmamışsa kalın), zaman ve okunmamış sayısı. Tamamı `?c={id}` bağlantısıdır;
 * Mesajlar sayfası tıklamayı yakalayıp sayfayı yenilemeden açar (`onSelect`).
 */
export function ConversationItem({
  conversation: c,
  now,
  selected = false,
  onSelect,
}: {
  conversation: Conversation
  now: Date
  selected?: boolean
  onSelect?: (event: MouseEvent<HTMLAnchorElement>) => void
}) {
  const t = useTranslations("Messages")
  const format = useFormatter()
  const unread = c.unreadCount > 0
  const name = c.other.deleted ? t("deletedUser") : c.other.name
  const preview = c.lastMessage ? `${c.lastMessage.mine ? t("you") : ""}${c.lastMessage.body}` : ""
  const at = c.lastMessage?.createdAt ?? c.lastMessageAt

  return (
    <Link
      href={{ pathname: "/account/messages", query: { c: c.id } }}
      onClick={onSelect}
      aria-current={selected ? "true" : undefined}
      className={cn(
        "flex gap-3 px-4 py-3.5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
        selected ? "bg-smoke" : "hover:bg-smoke-2/60"
      )}
    >
      <span className="flex size-13 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-smoke-2">
        {c.listing.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- depodaki ilan kapağı, küçük kare
          <img src={c.listing.coverUrl} alt="" className="size-full object-cover" />
        ) : (
          <PdMark className="size-7 opacity-30 grayscale" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span className="min-w-0 flex-1 truncate font-extrabold text-heading">{name}</span>
          {at && (
            <span className="shrink-0 text-xs font-bold text-primary">{listTime(at, now, format, t("yesterday"))}</span>
          )}
        </span>
        <span className="block truncate text-xs font-extrabold text-primary">{c.listing.title}</span>
        <span className="flex items-center gap-2">
          <span className={cn("min-w-0 flex-1 truncate text-sm", unread ? "font-extrabold text-heading" : "text-body")}>
            {preview}
          </span>
          {unread && (
            <span className="flex min-w-5 shrink-0 items-center justify-center rounded-full bg-destructive px-1.5 text-[11px] leading-5 font-extrabold text-destructive-foreground">
              <span aria-hidden="true">{c.unreadCount}</span>
              <span className="sr-only">{t("unreadCount", { count: c.unreadCount })}</span>
            </span>
          )}
        </span>
      </span>
    </Link>
  )
}
