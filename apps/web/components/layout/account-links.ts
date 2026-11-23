import {
  Briefcase,
  CalendarClock,
  Heart,
  House,
  LayoutGrid,
  type LucideIcon,
  MessageCircle,
  Search,
  Settings,
} from "lucide-react"

import type { Me } from "@/lib/api"

type AccountLink = {
  href:
    | "/account"
    | "/account/listings"
    | "/account/favorites"
    | "/account/questions"
    | "/account/saved-searches"
    | "/account/settings"
    | "/organization"
    | "/organization/appointments"
  /** messages › UserMenu anahtarı */
  key:
    | "dashboard"
    | "myListings"
    | "favorites"
    | "myQuestions"
    | "savedSearches"
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
    { href: "/account/questions", key: "myQuestions", icon: MessageCircle },
    { href: "/account/saved-searches", key: "savedSearches", icon: Search },
    { href: "/account/settings", key: "settings", icon: Settings },
  ]
}

/** Yalnızca bireysel kullanıcılar kurumsal başvuru yapabilir. */
export const organizationApplyIcon = Briefcase
