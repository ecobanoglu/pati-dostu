import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { Suspense } from "react"

import { AuthShell } from "@/components/auth/auth-shell"
import { SignInForm } from "@/components/auth/sign-in-form"
import { Link } from "@/i18n/navigation"

/** Sekme başlığı ("Giriş yap · Pati Dostu"); arama motorları giriş sayfasını dizinlemez. */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("SignIn")
  return { title: t("metaTitle"), robots: { index: false } }
}

/** Giriş sayfası (tasarım: 09-giris-yap, 26-mobil-giris). */
export default async function SignInPage() {
  const t = await getTranslations("SignIn")
  return (
    <AuthShell
      panelTitle={t("panelTitle")}
      points={[t("point1"), t("point2"), t("point3")]}
      title={t("title")}
      mobileTitle={t("panelTitle")}
      intro={
        <>
          {t("noAccount")}{" "}
          <Link href="/sign-up" className="font-bold text-primary underline underline-offset-2">
            {t("signUpLink")}
          </Link>
        </>
      }
    >
      {/* Form ?next= ve ?error= okur; arama parametreleri istekte belli olduğu için Suspense içinde. */}
      <Suspense>
        <SignInForm />
      </Suspense>
    </AuthShell>
  )
}
