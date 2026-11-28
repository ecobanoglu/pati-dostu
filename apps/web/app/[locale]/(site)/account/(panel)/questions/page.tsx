import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { Suspense } from "react"

import { AccountMobileMenu } from "@/features/account/account-mobile-menu"
import { AccountPageHeader } from "@/features/account/account-page-header"
import { MyQuestions, MyQuestionsFallback } from "@/features/account/questions"

/** Sekme başlığı; kişisel sayfa dizinlenmez. */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("MyQuestions")
  return { title: t("metaTitle"), robots: { index: false } }
}

/** Hesabım › Sorularım — /hesabim/sorularim (tasarım 02-hesabim/03, 10; sekme ve sayfa sorguda). */
export default async function MyQuestionsPage({ searchParams }: PageProps<"/[locale]/account/questions">) {
  const t = await getTranslations("MyQuestions")
  return (
    <>
      <AccountPageHeader title={t("title")} crumb={t("title")} back="/account" />
      <Suspense fallback={<MyQuestionsFallback />}>
        <MyQuestions searchParams={searchParams} />
      </Suspense>
      <AccountMobileMenu current="/account/questions" />
    </>
  )
}
