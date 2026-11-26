"use client"

import { Bell } from "lucide-react"
import { useTranslations } from "next-intl"

import { buttonVariants } from "@/components/ui/button"
import { Link, usePathname } from "@/i18n/navigation"
import { useUnreadNotifications } from "@/lib/use-unread-notifications"
import { cn } from "@/lib/utils"

/**
 * Üst menüdeki zil: bildirimler sayfasına gider, okunmamış varsa bordo sayı rozeti gösterir (tasarım 02-hesabim/05,
 * 12). Erişilebilir ad sayıyı da söyler ("Bildirimler, 3 okunmamış"). Sayı dakikada bir yenilenir. Bildirimler
 * sayfasındayken açık mor zeminle vurgulanır (aria-current).
 */
export function NotificationBell({ className }: { className?: string }) {
  const t = useTranslations("Notifications")
  const count = useUnreadNotifications()
  const current = usePathname() === "/account/notifications"
  return (
    <Link
      href="/account/notifications"
      aria-current={current ? "page" : undefined}
      aria-label={count > 0 ? t("bellUnread", { count }) : t("bell")}
      className={cn(
        buttonVariants({ variant: "ghost", size: "icon" }),
        "relative text-heading hover:text-primary",
        current && "bg-smoke text-primary",
        className
      )}
    >
      <Bell aria-hidden="true" />
      {count > 0 && (
        <span
          aria-hidden="true"
          className="absolute top-1 right-1 flex min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[11px] leading-5 font-extrabold text-destructive-foreground"
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  )
}
