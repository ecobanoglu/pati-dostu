"use client"

import { Check, Share2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { useState } from "react"

import { cn } from "@/lib/utils"

/**
 * "Paylaş" kutusu (tasarım 03-icerik/02): bağlantıyı kopyala, WhatsApp ve X. Adres tarayıcıdaki sayfa adresidir
 * (çapa hariç); paylaşım bağlantıları tıklanınca kurulur ki sunucu çiziminde site adresine ihtiyaç olmasın.
 */
export function ShareBox({ title }: { title: string }) {
  const t = useTranslations("Posts")
  const [copied, setCopied] = useState(false)

  /** Sayfa adresi (çapa olmadan). */
  const pageUrl = () => window.location.href.split("#")[0]!

  /** Adresi panoya kopyalar ve kısa süre "Kopyalandı" gösterir. */
  async function copy() {
    try {
      await navigator.clipboard.writeText(pageUrl())
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // Pano izni yoksa sessizce geç.
    }
  }

  /** Paylaşım penceresini yeni sekmede açar. */
  function open(kind: "whatsapp" | "x") {
    const url = pageUrl()
    const target =
      kind === "whatsapp"
        ? `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`
        : `https://x.com/intent/post?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`
    window.open(target, "_blank", "noopener,noreferrer")
  }

  const button =
    "inline-flex min-h-tap items-center gap-2 rounded-xl border border-border px-3 text-sm font-extrabold text-heading hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
  return (
    <section aria-labelledby="share-title" className="grid gap-3 rounded-card border border-border p-5">
      <h2 id="share-title" className="text-lg font-extrabold text-heading">
        {t("share")}
      </h2>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={copy} className={button}>
          {copied ? (
            <Check aria-hidden="true" className="size-4 text-success-text" />
          ) : (
            <Share2 aria-hidden="true" className="size-4" />
          )}
          {copied ? t("copied") : t("copyLink")}
        </button>
        <button type="button" onClick={() => open("whatsapp")} className={button}>
          {t("whatsapp")}
        </button>
        <button type="button" onClick={() => open("x")} aria-label={t("shareOnX")} className={cn(button, "px-4")}>
          {t("x")}
        </button>
      </div>
      <p role="status" className="sr-only">
        {copied ? t("copied") : ""}
      </p>
    </section>
  )
}
