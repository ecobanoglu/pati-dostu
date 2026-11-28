import {
  Briefcase,
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
  /** messages › UserMenu anahtarı */
  key: "dashboard" | "myListings" | "favorites" | "messages" | "myQuestions" | "notifications" | "settings"
  icon: LucideIcon
}

/** Klinik ve barınak hesabı mı (avatar kare, "Doğrulanmış" rozeti). */
export function isOrganization(user: Pick<Me, "role">): boolean {
  return user.role === "clinic" || user.role === "shelter"
}

/**
 * Profil menüsündeki bağlantılar (tasarım: 02-hesabim/07-ust-menu-giris-yapilmis). Karar (5. aşama 6. adım): kurum
 * hesapları (klinik / barınak) da üye menüsünü görür; hesap türü "Doğrulanmış" rozetiyle belirtilir. Kurum paneli
 * (randevular, ihtiyaç listesi) v1.1'de eklenince buraya kurum bağlantıları gelecek. Kayıtlı aramalar (v1.2) gizli.
 */
export function accountLinks(): AccountLink[] {
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
