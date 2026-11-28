import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { Suspense } from "react"

import { AccountMobileMenu } from "@/features/account/account-mobile-menu"
import { AccountPageHeader } from "@/features/account/account-page-header"
import { Notifications, NotificationsFallback } from "@/features/account/notifications"

/** Sekme başlığı; kişisel sayfa dizinlenmez. */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Notifications")
  return { title: t("metaTitle"), robots: { index: false } }
}

/** Hesabım › Bildirimler — /hesabim/bildirimler (tasarım 02-hesabim/05, 12). */
export default async function NotificationsPage() {
  const t = await getTranslations("Notifications")
  return (
    <>
      <AccountPageHeader title={t("title")} crumb={t("title")} back="/account" />
      <Suspense fallback={<NotificationsFallback />}>
        <Notifications />
      </Suspense>
      <AccountMobileMenu current="/account/notifications" />
    </>
  )
}
