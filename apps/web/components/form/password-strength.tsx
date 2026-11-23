"use client"

import { passwordStrength } from "@pati-dostu/validators"
import { useTranslations } from "next-intl"

import { cn } from "@/lib/utils"

const barColor = ["", "bg-destructive", "bg-warning", "bg-success", "bg-success"] as const

/**
 * 4 çubuklu şifre gücü göstergesi (tasarım: kayıt ve yeni şifre formları). Renk tek başına anlam taşımasın diye
 * gücün adı ekran okuyucuya da okunur (aria-live, yalnızca değişince).
 */
export function PasswordStrength({ value }: { value: string }) {
  const t = useTranslations("Auth")
  const score = passwordStrength(value)

  return (
    <div className="grid gap-1">
      <div aria-hidden="true" className="grid grid-cols-4 gap-1.5">
        {[1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={cn("h-1.5 rounded-full transition-colors", i <= score ? barColor[score] : "bg-smoke-2")}
          />
        ))}
      </div>
      <p aria-live="polite" className="sr-only">
        {t("strengthLabel", { level: t(`strength${score}`) })}
      </p>
    </div>
  )
}
