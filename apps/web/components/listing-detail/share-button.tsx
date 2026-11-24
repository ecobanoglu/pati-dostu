"use client"

import { Share2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/**
 * İlanı paylaş: destekleyen tarayıcıda sistemin paylaşım penceresi (navigator.share), yoksa bağlantıyı panoya
 * kopyalar ve "Bağlantı kopyalandı" der (ekran okuyucuya da duyurulur).
 * variant="full": kartın altındaki çerçeveli buton · "icon": mobil üst çubuktaki ikon buton.
 */
export function ShareButton({ title, variant }: { title: string; variant: "full" | "icon" }) {
  const t = useTranslations("ListingDetail")
  const [copied, setCopied] = useState(false)

  /** Paylaşım penceresini açar ya da bağlantıyı kopyalar. */
  async function share() {
    const url = window.location.href
    if (navigator.share) {
      try {
        await navigator.share({ title, text: t("shareText", { title }), url })
      } catch {
        // Kullanıcı vazgeçti.
      }
      return
    }
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // Pano izni yok: sessizce geç.
    }
  }

  return (
    <div className={cn("relative", variant === "full" && "grid")}>
      <Button
        variant={variant === "full" ? "outline" : "ghost"}
        size={variant === "full" ? "sm" : "icon"}
        onClick={share}
        aria-label={variant === "icon" ? t("share") : undefined}
      >
        <Share2 aria-hidden="true" />
        {variant === "full" && t("share")}
      </Button>
      <span
        role="status"
        className={cn(
          "text-sm font-bold text-success-text",
          variant === "full"
            ? "mt-1.5 text-center empty:hidden"
            : "absolute top-full right-0 z-10 rounded-md bg-heading px-2 py-1 whitespace-nowrap text-white empty:hidden"
        )}
      >
        {copied ? t("shareCopied") : ""}
      </span>
    </div>
  )
}
