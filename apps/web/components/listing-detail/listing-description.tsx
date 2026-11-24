"use client"

import { useTranslations } from "next-intl"
import { useState } from "react"

import { cn } from "@/lib/utils"

/** Bu uzunluktan kısa açıklamada mobilde "Devamını göster" gerekmez. */
const CLAMP_FROM = 220

/**
 * İlan açıklaması. Mobilde uzun metin 4 satırla kısaltılır ve "Devamını göster" ile açılır (tasarım 19);
 * masaüstünde metnin tamamı görünür (tasarım 03). Satır sonları korunur.
 */
export function ListingDescription({ text }: { text: string }) {
  const t = useTranslations("ListingDetail")
  const [open, setOpen] = useState(false)
  const long = text.length > CLAMP_FROM

  return (
    <div>
      <p
        id="listing-description"
        className={cn("leading-7 whitespace-pre-line text-body lg:leading-8", long && !open && "max-lg:line-clamp-4")}
      >
        {text}
      </p>
      {long && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="listing-description"
          className="mt-2 min-h-tap text-sm font-bold text-primary lg:hidden"
        >
          {open ? t("showLess") : t("showMore")}
        </button>
      )}
    </div>
  )
}
