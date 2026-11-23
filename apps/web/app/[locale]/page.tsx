import { useTranslations } from "next-intl"

/** Anasayfa (şimdilik yer tutucu). */
export default function HomePage() {
  const t = useTranslations("HomePage")
  return (
    <main className="mx-auto flex min-h-dvh max-w-site flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-h1 text-heading">{t("title")}</h1>
      <p className="text-body">{t("comingSoon")}</p>
    </main>
  )
}
