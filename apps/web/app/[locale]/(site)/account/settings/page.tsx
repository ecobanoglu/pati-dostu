import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { Suspense } from "react"

import { AccountMobileMenu } from "@/features/account/account-mobile-menu"
import { AccountPageHeader } from "@/features/account/account-page-header"
import { Settings, SettingsFallback } from "@/features/account/settings/settings"

/** Sekme başlığı; kişisel sayfa dizinlenmez. */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Settings")
  return { title: t("metaTitle"), robots: { index: false } }
}

/** Hesabım › Profil ve ayarlar — /hesabim/ayarlar (tasarım 02-hesabim/06, 13). */
export default async function SettingsPage() {
  const t = await getTranslations("Settings")
  return (
    <>
      <AccountPageHeader title={t("title")} crumb={t("title")} back="/account" />
      <Suspense fallback={<SettingsFallback />}>
        <Settings />
      </Suspense>
      <AccountMobileMenu current="/account/settings" />
    </>
  )
}
