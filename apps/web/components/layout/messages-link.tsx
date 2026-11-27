"use client"

import { MessageCircle } from "lucide-react"
import { useTranslations } from "next-intl"

import { buttonVariants } from "@/components/ui/button"
import { Link, usePathname } from "@/i18n/navigation"
import { useUnreadMessages } from "@/lib/use-unread-messages"
import { cn } from "@/lib/utils"

/**
 * Üst menüdeki mesaj ikonu (tasarım 01-sayfalar/12): Mesajlar'a gider, okunmamış mesaj varsa bordo sayı rozeti
 * gösterir; erişilebilir ad sayıyı da söyler. Mesajlar sayfasındayken açık mor zeminle vurgulanır.
 */
export function MessagesLink({ className }: { className?: string }) {
  const t = useTranslations("Messages")
  const count = useUnreadMessages()
  const current = usePathname() === "/account/messages"
  return (
    <Link
      href="/account/messages"
      aria-current={current ? "page" : undefined}
      aria-label={count > 0 ? t("navUnread", { count }) : t("title")}
      className={cn(
        buttonVariants({ variant: "ghost", size: "icon" }),
        "relative text-heading hover:text-primary",
        current && "bg-smoke text-primary",
        className
      )}
    >
      <MessageCircle aria-hidden="true" />
      <UnreadMessagesBadge count={count} className="absolute top-1 right-1" />
    </Link>
  )
}

/**
 * Okunmamış mesaj sayısı rozeti (görsel; sayı bağlantının erişilebilir adında ya da yanındaki metinde söylenir).
 * Sayı 0 ise hiçbir şey çizmez.
 */
export function UnreadMessagesBadge({ count, className }: { count: number; className?: string }) {
  if (count <= 0) return null
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[11px] leading-5 font-extrabold text-destructive-foreground",
        className
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  )
}
