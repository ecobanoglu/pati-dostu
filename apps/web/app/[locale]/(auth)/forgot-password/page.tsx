import { Lock } from "lucide-react"
import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { Suspense } from "react"

import { AuthShell } from "@/components/auth/auth-shell"
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form"
import { site } from "@/lib/site"

/** Sekme başlığı; arama motorları bu sayfayı dizinlemez. */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("ForgotPassword")
  return { title: t("metaTitle"), robots: { index: false } }
}

/** "Şifremi unuttum" sayfası (tasarım: 13-sifremi-unuttum, 30-mobil-sifremi-unuttum). */
export default async function ForgotPasswordPage() {
  const t = await getTranslations("ForgotPassword")
  return (
    <AuthShell
      panelTitle={t("panelTitle")}
      points={[t("point1"), t("point2"), t("point3", { email: site.email })]}
      title={t("title")}
      icon={Lock}
      intro={t("description")}
    >
      {/* ?email= ile önceden doldurulabilir (giriş formundan gelince). */}
      <Suspense>
        <ForgotPasswordForm />
      </Suspense>
    </AuthShell>
  )
}
