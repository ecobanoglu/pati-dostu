import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { Suspense } from "react"

import { AskFallback, AskView } from "@/features/community/ask-view"

/** Sekme başlığı; form sayfası dizinlenmez. */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("AskTopic")
  return { title: t("metaTitle"), robots: { index: false } }
}

/** Soru sor — /topluluk/soru-sor (giriş gerekir; proxy korur). */
export default function AskPage({ searchParams }: PageProps<"/[locale]/community/ask">) {
  return (
    <Suspense fallback={<AskFallback />}>
      <AskView searchParams={searchParams} />
    </Suspense>
  )
}
