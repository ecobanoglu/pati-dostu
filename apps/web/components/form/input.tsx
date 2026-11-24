"use client"

import { Eye, EyeOff } from "lucide-react"
import { useTranslations } from "next-intl"
import { type ComponentProps, useState } from "react"

import { cn } from "@/lib/utils"

/** Form alanlarının ortak görünümü: 48 px yükseklik, 3:1 kontrastlı kenar, hatada kırmızı kenar. */
export const fieldClass =
  "h-12 w-full rounded-lg border border-input bg-background px-4 text-base text-heading placeholder:text-body/70 transition-colors focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ring aria-invalid:border-destructive disabled:opacity-60"

/** Tek satırlık metin alanı. */
export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(fieldClass, className)} {...props} />
}

/** Çok satırlı metin alanı (ilan açıklaması); yüksekliği kullanıcı değiştirebilir. */
export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(fieldClass, "h-auto min-h-32 resize-y py-3 leading-relaxed", className)} {...props} />
}

/** Açılır seçim (yerel <select>: mobilde işletim sisteminin seçicisi açılır, klavyeyle tam uyumlu). */
export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(fieldClass, "appearance-auto pr-3", className)} {...props} />
}

/** Şifre alanı: sağdaki göz butonu şifreyi gösterir/gizler (aria-pressed ile durumu bildirir). */
export function PasswordInput({ className, ...props }: Omit<ComponentProps<"input">, "type">) {
  const t = useTranslations("Auth")
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <input type={visible ? "text" : "password"} className={cn(fieldClass, "pr-12", className)} {...props} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-pressed={visible}
        aria-label={visible ? t("hidePassword") : t("showPassword")}
        className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-lg text-body hover:text-heading focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring"
      >
        {visible ? <EyeOff aria-hidden="true" className="size-5" /> : <Eye aria-hidden="true" className="size-5" />}
      </button>
    </div>
  )
}
