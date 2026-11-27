import {
  Briefcase,
  CalendarClock,
  Bell,
  Heart,
  House,
  LayoutGrid,
  type LucideIcon,
  MessageCircle,
  MessageCircleQuestion,
  Settings,
} from "lucide-react"

import type { Me } from "@/lib/api"

type AccountLink = {
  href:
    | "/account"
    | "/account/listings"
    | "/account/favorites"
    | "/account/messages"
    | "/account/questions"
    | "/account/notifications"
    | "/account/settings"
    | "/organization"
    | "/organization/appointments"
  /** messages › UserMenu anahtarı */
  key:
    | "dashboard"
    | "myListings"
    | "favorites"
    | "messages"
    | "myQuestions"
    | "notifications"
    | "settings"
    | "organizationPanel"
    | "appointments"
    | "organizationSettings"
  icon: LucideIcon
}

/** Klinik ve barınak hesapları kurum menüsünü görür (avatar kare, Kurum paneli). */
export function isOrganization(user: Pick<Me, "role">): boolean {
  return user.role === "clinic" || user.role === "shelter"
}

/**
 * Profil menüsündeki bağlantılar, role göre (tasarım: 02-hesabim/07-ust-menu-giris-yapilmis).
 * Okunmamış/adet rozetleri ilgili modüller (ilanlar, favoriler, randevular) eklenince gelecek.
 * Kayıtlı aramalar (v1.2) sayfası yapılana kadar gizli (karar: yapılmamış sayfa menüde yok).
 */
export function accountLinks(user: Pick<Me, "role">): AccountLink[] {
  if (isOrganization(user)) {
    return [
      { href: "/organization", key: "organizationPanel", icon: House },
      { href: "/organization/appointments", key: "appointments", icon: CalendarClock },
      { href: "/account/listings", key: "myListings", icon: LayoutGrid },
      { href: "/account/settings", key: "organizationSettings", icon: Settings },
    ]
  }
  return [
    { href: "/account", key: "dashboard", icon: House },
    { href: "/account/listings", key: "myListings", icon: LayoutGrid },
    { href: "/account/favorites", key: "favorites", icon: Heart },
    { href: "/account/questions", key: "myQuestions", icon: MessageCircleQuestion },
    { href: "/account/settings", key: "settings", icon: Settings },
  ]
}

/**
 * Hesabım sol menüsü (tasarım 02-hesabim/01): tüm rollerde aynı. Kayıtlı aramalar sayfası yapılınca buraya eklenecek
 * (şimdilik gizli — karar).
 */
export const accountNav: AccountLink[] = [
  { href: "/account", key: "dashboard", icon: House },
  { href: "/account/listings", key: "myListings", icon: LayoutGrid },
  { href: "/account/messages", key: "messages", icon: MessageCircle },
  { href: "/account/favorites", key: "favorites", icon: Heart },
  { href: "/account/questions", key: "myQuestions", icon: MessageCircleQuestion },
  { href: "/account/notifications", key: "notifications", icon: Bell },
  { href: "/account/settings", key: "settings", icon: Settings },
]

/** Yalnızca bireysel kullanıcılar kurumsal başvuru yapabilir. */
export const organizationApplyIcon = Briefcase
