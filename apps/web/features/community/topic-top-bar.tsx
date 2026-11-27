"use client"

import { ArrowLeft, Share2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { useRouter } from "@/i18n/navigation"

/**
 * Konu sayfasının mobil üst çubuğu (tasarım 25): geri, "Topluluk", paylaş. Geri, siteden gelindiyse önceki sayfaya;
 * doğrudan açıldıysa konunun kategorisine gider. Paylaş, destekleniyorsa sistem penceresini açar, değilse bağlantıyı
 * kopyalar.
 */
export function TopicTopBar({ title, category }: { title: string; category: string }) {
  const t = useTranslations("Community")
  const router = useRouter()
  const [copied, setCopied] = useState(false)

  /** Önceki sayfaya döner; geçmiş yoksa kategori listesine. */
  function back() {
    if (window.history.length > 1 && document.referrer.startsWith(window.location.origin)) router.back()
    else router.push({ pathname: "/community/[category]", params: { category } })
  }

  /** Konu bağlantısını paylaşır ya da kopyalar. */
  async function share() {
    const url = window.location.href.split("#")[0]!
    try {
      if (navigator.share) return await navigator.share({ title, url })
      await navigator.clipboard.writeText(url)
      setCopied(true)
    } catch {
      // Paylaşım iptal edildi.
    }
  }

  return (
    <header className="sticky top-0 z-30 flex h-15 items-center gap-1 border-b border-border bg-background px-2 lg:hidden">
      <Button variant="ghost" size="icon" onClick={back} aria-label={t("back")}>
        <ArrowLeft aria-hidden="true" className="size-6" />
      </Button>
      <p className="flex-1 font-extrabold text-heading">{t("title")}</p>
      <Button variant="ghost" size="icon" onClick={share} aria-label={t("share")}>
        <Share2 aria-hidden="true" />
      </Button>
      <p role="status" className="sr-only">
        {copied ? t("linkCopied") : ""}
      </p>
    </header>
  )
}
