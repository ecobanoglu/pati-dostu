import { Lock } from "lucide-react"
import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { Suspense } from "react"

import { AuthShell } from "@/components/auth/auth-shell"
import { ResetPasswordForm } from "@/components/auth/reset-password-form"
import { site } from "@/lib/site"

/** Sekme başlığı; arama motorları bu sayfayı dizinlemez. */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("ResetPassword")
  return { title: t("metaTitle"), robots: { index: false } }
}

/** "Yeni şifre belirle" sayfası (tasarım: 14-yeni-sifre-belirle, 31-mobil-yeni-sifre-belirle). */
export default async function ResetPasswordPage() {
  const [t, tForgot] = await Promise.all([getTranslations("ResetPassword"), getTranslations("ForgotPassword")])
  return (
    <AuthShell
      panelTitle={tForgot("panelTitle")}
      points={[tForgot("point1"), tForgot("point2"), tForgot("point3", { email: site.email })]}
      title={t("title")}
      icon={Lock}
      intro={t("description")}
    >
      {/* ?token= ve ?error= okur. */}
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  )
}
