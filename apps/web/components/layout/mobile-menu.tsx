"use client"

import {
  Bell,
  BookOpen,
  Heart,
  LayoutGrid,
  LogOut,
  Menu,
  MessageCircle,
  Newspaper,
  Settings,
  Stethoscope,
} from "lucide-react"
import { useTranslations } from "next-intl"
import { useState } from "react"

import { buttonVariants } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Link } from "@/i18n/navigation"
import type { Me } from "@/lib/api"
import { cn } from "@/lib/utils"

import { UserAvatar } from "./user-avatar"
import { useSignOut } from "./use-sign-out"

const rowClass =
  "flex min-h-tap items-center gap-3 rounded-lg px-2 text-[17px] font-bold text-heading hover:bg-smoke [&_svg]:size-5 [&_svg]:shrink-0"

/** Alt menüde olmayan site bölümleri (Anasayfa ve İlanlar alt menüde). */
const sections = [
  { href: "/community", key: "community", icon: MessageCircle },
  { href: "/veterinarians", key: "veterinarians", icon: Stethoscope },
  { href: "/blog", key: "blog", icon: BookOpen },
  { href: "/news", key: "news", icon: Newspaper },
] as const

/**
 * Mobil/tablet hamburger menüsü: sağdan açılan panel (tasarım: 02-hesabim/14-mobil-menu-giris-yapilmis).
 * Giriş yapılmışsa hesap kartı, hesap bağlantıları ve çıkış; misafirde giriş/kayıt butonları.
 * Bir bağlantıya dokununca panel kapanır.
 */
export function MobileMenu({ user }: { user: Me | null }) {
  const t = useTranslations()
  const [open, setOpen] = useState(false)
  const { signOut, pending, error } = useSignOut()
  const close = () => setOpen(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        aria-label={t("Common.openMenu")}
        className={cn(buttonVariants({ variant: "outline", size: "icon" }), "lg:hidden")}
      >
        <Menu aria-hidden="true" />
      </SheetTrigger>

      <SheetContent side="right" closeLabel={t("Common.close")} className="w-[85%] max-w-sm gap-0 p-4 pt-16">
        <SheetTitle className="sr-only">{t("Nav.label")}</SheetTitle>

        {user ? (
          <Link
            href="/account"
            onClick={close}
            className="mb-3 flex items-center gap-3 rounded-2xl bg-smoke p-3 hover:bg-smoke/80"
          >
            <UserAvatar user={user} className="size-12 text-base" />
            <span className="min-w-0">
              <span className="block truncate text-lg font-extrabold text-heading">{user.name}</span>
              <span className="block text-sm font-bold text-primary">{t("UserMenu.goToAccount")}</span>
            </span>
          </Link>
        ) : (
          <div className="mb-3 grid grid-cols-2 gap-2">
            <Link href="/sign-in" onClick={close} className={buttonVariants({ variant: "outline" })}>
              {t("Nav.signIn")}
            </Link>
            <Link href="/sign-up" onClick={close} className={buttonVariants({ variant: "outline-primary" })}>
              {t("Nav.signUp")}
            </Link>
          </div>
        )}

        <nav aria-label={t("Nav.label")} className="flex flex-1 flex-col overflow-y-auto">
          {user && (
            <ul className="border-b border-border pb-3">
              <li>
                <Link href="/account/listings" onClick={close} className={rowClass}>
                  <LayoutGrid aria-hidden="true" />
                  {t("UserMenu.myListings")}
                </Link>
              </li>
              <li>
                <Link href="/account/messages" onClick={close} className={rowClass}>
                  <MessageCircle aria-hidden="true" />
                  {t("Nav.messages")}
                </Link>
              </li>
              <li>
                <Link href="/account/notifications" onClick={close} className={rowClass}>
                  <Bell aria-hidden="true" />
                  {t("Nav.notifications")}
                </Link>
              </li>
              <li>
                <Link href="/account/favorites" onClick={close} className={rowClass}>
                  <Heart aria-hidden="true" />
                  {t("UserMenu.favorites")}
                </Link>
              </li>
              <li>
                <Link href="/account/settings" onClick={close} className={rowClass}>
                  <Settings aria-hidden="true" />
                  {t("UserMenu.settings")}
                </Link>
              </li>
            </ul>
          )}
          <ul className={user ? "pt-3" : undefined}>
            {sections.map(({ href, key, icon: Icon }) => (
              <li key={href}>
                <Link href={href} onClick={close} className={rowClass}>
                  <Icon aria-hidden="true" />
                  {t(`Nav.${key}`)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {user && (
          <div className="border-t border-border pt-3">
            <button
              type="button"
              onClick={signOut}
              disabled={pending}
              className={cn(rowClass, "w-full text-destructive hover:bg-destructive/10 disabled:opacity-50")}
            >
              <LogOut aria-hidden="true" />
              {t("UserMenu.signOut")}
            </button>
            {error && (
              <p role="alert" className="px-2 pt-1 text-sm text-destructive">
                {error}
              </p>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
