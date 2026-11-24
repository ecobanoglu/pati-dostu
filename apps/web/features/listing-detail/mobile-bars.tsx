"use client"

import { ArrowLeft } from "lucide-react"
import { useTranslations } from "next-intl"

import { FavoriteButton } from "@/components/listing/favorite-button"
import { Button } from "@/components/ui/button"
import { useRouter } from "@/i18n/navigation"

import { PrimaryAction, type ContactProps } from "./contact-card"
import { ShareButton } from "./share-button"

/**
 * Mobil üst çubuk (tasarım 19): geri, "İlan detayı" ve paylaş. Geri, siteden gelindiyse önceki sayfaya;
 * doğrudan açıldıysa ilanlar sayfasına gider. Sağda paylaş ve (yayındaki, başkasının ilanıysa) favori.
 */
export function MobileTopBar({
  title,
  listingNo,
  canFavorite,
}: {
  title: string
  listingNo: number
  canFavorite: boolean
}) {
  const t = useTranslations("ListingDetail")
  const router = useRouter()

  /** Önceki sayfaya döner; geçmiş yoksa ilan listesine. */
  function back() {
    if (window.history.length > 1 && document.referrer.startsWith(window.location.origin)) router.back()
    else router.push("/listings")
  }

  return (
    <header className="sticky top-0 z-30 flex h-15 items-center gap-1 border-b border-border bg-background px-2 lg:hidden">
      <Button variant="ghost" size="icon" onClick={back} aria-label={t("back")}>
        <ArrowLeft aria-hidden="true" className="size-6" />
      </Button>
      <p className="flex-1 font-extrabold text-heading">{t("pageTitle")}</p>
      <ShareButton title={title} variant="icon" />
      {canFavorite && <FavoriteButton listingNo={listingNo} title={title} variant="icon" />}
    </header>
  )
}

/** Mobil alt eylem çubuğu (tasarım 19): ekranın altına sabit favori + "Mesaj gönder" (sahibine "İlanı düzenle"). */
export function MobileActionBar(props: ContactProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
      <div className="flex gap-3">
        {props.canFavorite && <FavoriteButton listingNo={props.listingNo} title={props.title} variant="bar" />}
        <PrimaryAction {...props} className="h-12 flex-1" />
      </div>
    </div>
  )
}
