import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { Suspense } from "react"

import { AuthShell } from "@/features/auth/auth-shell"
import { SignUpForm } from "@/features/auth/sign-up-form"
import { Link } from "@/i18n/navigation"
import { getCities } from "@/lib/dictionary"

/** Sekme başlığı; arama motorları kayıt sayfasını dizinlemez. */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("SignUp")
  return { title: t("metaTitle"), robots: { index: false } }
}

/**
 * Şehir listesiyle birlikte form. Liste önbellekteyse sayfa önceden üretilir; API'ye ulaşılamamışsa (kısa önbellek)
 * istek anında gelir. Bu yüzden Suspense içinde: o sırada şehir seçeneği boş form gösterilir.
 */
async function SignUpFormWithCities() {
  const cities = await getCities()
  return <SignUpForm cities={cities.map(({ id, name }) => ({ id, name }))} />
}

/** Kayıt sayfası (tasarım: 10-kayit-ol, 27-mobil-kayit-ol). */
export default async function SignUpPage() {
  const t = await getTranslations("SignUp")
  return (
    <AuthShell
      panelTitle={t("panelTitle")}
      points={[t("point1"), t("point2"), t("point3")]}
      title={t("title")}
      intro={
        <>
          {t("haveAccount")}{" "}
          <Link href="/sign-in" className="font-bold text-primary underline underline-offset-2">
            {t("signInLink")}
          </Link>
        </>
      }
    >
      <Suspense fallback={<SignUpForm cities={[]} />}>
        <SignUpFormWithCities />
      </Suspense>
    </AuthShell>
  )
}
