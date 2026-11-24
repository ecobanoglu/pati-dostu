import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { Suspense } from "react"

import { Dashboard, DashboardFallback } from "@/features/account/dashboard"

/** Sekme başlığı; kişisel sayfa dizinlenmez. */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard")
  return { title: t("metaTitle"), robots: { index: false } }
}

/** Hesabım › Panel özeti — /hesabim. */
export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardFallback />}>
      <Dashboard />
    </Suspense>
  )
}
