import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { Suspense } from "react"

import { ApplicationFallback, ApplicationView } from "@/features/org-application/application-view"

/** Sekme başlığı; form sayfası dizinlenmez. */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("OrgApplication")
  return { title: t("metaTitle"), robots: { index: false } }
}

/** Kurumsal başvuru — /hesabim/kurumsal-basvuru (giriş gerekir; Hesabım sol menüsü olmadan, mor şeritli düzen). */
export default function OrganizationApplicationPage({
  searchParams,
}: PageProps<"/[locale]/account/organization-application">) {
  return (
    <Suspense fallback={<ApplicationFallback />}>
      <ApplicationView searchParams={searchParams} />
    </Suspense>
  )
}
