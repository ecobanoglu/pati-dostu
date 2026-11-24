import { Mail } from "lucide-react"
import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { Suspense } from "react"

import { AuthShell } from "@/features/auth/auth-shell"
import { VerifyEmailPanel } from "@/features/auth/verify-email-panel"

/** Sekme başlığı; arama motorları bu sayfayı dizinlemez. */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("VerifyEmail")
  return { title: t("metaTitle"), robots: { index: false } }
}

/** "E-postanı doğrula" sayfası (tasarım: 15-e-posta-dogrulama, 32-mobil-e-posta-dogrulama). */
export default async function VerifyEmailPage() {
  const t = await getTranslations("VerifyEmail")
  return (
    <AuthShell
      panelTitle={t("panelTitle")}
      points={[t("point1"), t("point2"), t("point3")]}
      title={t("title")}
      icon={Mail}
    >
      {/* ?email=, ?verified= ve ?error= okur. */}
      <Suspense>
        <VerifyEmailPanel />
      </Suspense>
    </AuthShell>
  )
}
