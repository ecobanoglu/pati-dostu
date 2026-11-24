import { getLocale } from "next-intl/server"

import { getPathname, redirect } from "@/i18n/navigation"
import type { Locale } from "@/i18n/routing"
import { getCities } from "@/lib/dictionary"
import { getCurrentUser } from "@/lib/session"

import { ContactSection, DeleteAccountSection, PasswordSection, PreferencesSections } from "./account-sections"
import { ProfileSection } from "./profile-section"

/**
 * Profil ve ayarlar (tasarım 02-hesabim/06, 13): profil bilgileri, iletişim, şifre, e-posta tercihleri, gizlilik,
 * hesap. Kullanıcı bilgisi oturumla ve önbelleksiz okunur (GET /me); oturum yoksa girişe yönlendirir.
 * cookies() okuduğu için <Suspense> içinde render edilir. Veri kopyası ve SMS doğrulama şimdilik yok (karar).
 */
export async function Settings() {
  const locale = (await getLocale()) as Locale
  const [user, cities] = await Promise.all([getCurrentUser(), getCities()])
  if (!user) {
    return redirect({
      href: { pathname: "/sign-in", query: { next: getPathname({ href: "/account/settings", locale }) } },
      locale,
    })
  }
  return (
    <div className="grid gap-4 lg:gap-6">
      <ProfileSection user={user} cities={cities} />
      <ContactSection user={user} />
      <PasswordSection user={user} />
      <PreferencesSections user={user} />
      <DeleteAccountSection user={user} />
    </div>
  )
}

/** Yüklenirken: bölüm iskeletleri. */
export function SettingsFallback() {
  return (
    <div aria-hidden="true" className="grid gap-6">
      {[320, 180, 200].map((h) => (
        <div
          key={h}
          style={{ height: h }}
          className="animate-pulse rounded-card bg-smoke-2 motion-reduce:animate-none"
        />
      ))}
    </div>
  )
}
