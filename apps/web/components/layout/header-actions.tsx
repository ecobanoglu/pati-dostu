import { Bell, MessageCircle } from "lucide-react"
import { getTranslations } from "next-intl/server"

import { buttonVariants } from "@/components/ui/button"
import { Link } from "@/i18n/navigation"
import { getCurrentUser } from "@/lib/session"
import { cn } from "@/lib/utils"

import { MobileMenu } from "./mobile-menu"
import { UserMenu } from "./user-menu"

const iconLink = cn(buttonVariants({ variant: "ghost", size: "icon" }), "text-heading hover:text-primary")

/**
 * Üst menünün oturuma bağlı sağ tarafı. Misafir: Giriş yap / Kayıt ol; giriş yapılmış: mesajlar, bildirimler,
 * profil menüsü. Her durumda "İlan Ver" ve (lg altı) hamburger menü.
 * cookies() okuduğu için SiteHeader'da <Suspense> içinde render edilir; sayfanın geri kalanı beklemez.
 * Okunmamış sayısı rozetleri ve bildirim açılır paneli, mesajlaşma/bildirim modülleriyle gelecek.
 */
export async function HeaderActions() {
  const [user, t] = await Promise.all([getCurrentUser(), getTranslations("Nav")])

  return (
    <div className="flex items-center gap-2">
      {user ? (
        <div className="hidden items-center gap-1 lg:flex">
          <Link href="/account/messages" aria-label={t("messages")} className={iconLink}>
            <MessageCircle aria-hidden="true" />
          </Link>
          <Link href="/account/notifications" aria-label={t("notifications")} className={iconLink}>
            <Bell aria-hidden="true" />
          </Link>
          <UserMenu user={user} />
        </div>
      ) : (
        <div className="hidden items-center gap-2 lg:flex">
          <Link href="/sign-in" className={buttonVariants({ variant: "ghost" })}>
            {t("signIn")}
          </Link>
          <Link href="/sign-up" className={buttonVariants({ variant: "outline-primary" })}>
            {t("signUp")}
          </Link>
        </div>
      )}
      {/* Mobilde İlan Ver alt menüde; tablet ve masaüstünde burada. */}
      <Link href="/post-listing" className={cn(buttonVariants({ variant: "secondary" }), "hidden md:inline-flex")}>
        {t("postListing")}
      </Link>
      <MobileMenu user={user} />
    </div>
  )
}

/** Oturum bilgisi gelene kadar sağ tarafın yerini tutar (yükseklik sabit, misafir butonları yanıp sönmez). */
export function HeaderActionsFallback() {
  return <div aria-hidden="true" className="h-tap w-44" />
}
