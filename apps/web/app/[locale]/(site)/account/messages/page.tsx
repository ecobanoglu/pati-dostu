import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { Suspense } from "react"

import { AccountMobileMenu } from "@/features/account/account-mobile-menu"
import { AccountPageHeader } from "@/features/account/account-page-header"
import { Messages, MessagesFallback } from "@/features/account/messages/messages"

type SearchParams = Promise<{ c?: string | string[]; ilan?: string | string[] }>

/** Sekme başlığı; kişisel sayfa dizinlenmez. */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Messages")
  return { title: t("metaTitle"), robots: { index: false } }
}

/** Adres sorgusunu (açık konuşma `c`, yeni konuşma `ilan`) okuyup Mesajlar'ı çizer; sorgu okunduğu için Suspense içinde. */
async function MessagesWithParams({ searchParams }: { searchParams: SearchParams }) {
  const { c, ilan } = await searchParams
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)
  return <Messages c={one(c)} ilan={one(ilan)} />
}

/**
 * Hesabım › Mesajlar — /hesabim/mesajlar (tasarım 01-sayfalar/12; mobil tasarım yok, liste → tam ekran konuşma).
 * Masaüstünde başlık konuşma listesinin içinde (tasarım); mobilde diğer Hesabım sayfaları gibi geri oklu başlık.
 */
export default async function MessagesPage({ searchParams }: { searchParams: SearchParams }) {
  const t = await getTranslations("Messages")
  return (
    <>
      <div className="lg:hidden">
        <AccountPageHeader title={t("title")} crumb={t("title")} back="/account" />
      </div>
      <Suspense fallback={<MessagesFallback />}>
        <MessagesWithParams searchParams={searchParams} />
      </Suspense>
      <AccountMobileMenu current="/account/messages" />
    </>
  )
}
