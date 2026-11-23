import { useTranslations } from "next-intl"
import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

/** Alanın içindeki giriş öğesine verilecek erişilebilirlik özellikleri. */
export type FieldControlProps = {
  id: string
  "aria-invalid": boolean
  "aria-describedby": string | undefined
  "aria-required": boolean | undefined
}

type FieldProps = {
  id: string
  label: ReactNode
  required?: boolean
  /** Alanın altındaki yardım metni (ör. "En az 8 karakter…"). */
  description?: ReactNode
  /** Çevrilmiş hata metni; varsa alan aria-invalid olur ve mesaj ekran okuyucuya bağlanır. */
  error?: string
  className?: string
  /** Giriş öğesi: verilen özellikleri <input>/<select>'e yayın. */
  children: (control: FieldControlProps) => ReactNode
}

/**
 * Etiketli form alanı: görünür etiket (zorunluysa kırmızı yıldız + ekran okuyucuya "zorunlu"), yardım metni ve hata.
 * Hata ve yardım metni aria-describedby ile alana bağlanır (CLAUDE.md › Erişilebilirlik).
 */
export function Field({ id, label, required, description, error, className, children }: FieldProps) {
  const t = useTranslations("Auth")
  const descriptionId = description ? `${id}-description` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [errorId, descriptionId].filter(Boolean).join(" ") || undefined

  return (
    <div className={cn("grid content-start gap-1.5", className)}>
      <label htmlFor={id} className="text-[15px] font-extrabold text-heading">
        {label}
        {required && (
          <>
            {" "}
            <span aria-hidden="true" className="text-destructive">
              *
            </span>
            <span className="sr-only">({t("required")})</span>
          </>
        )}
      </label>
      {children({
        id,
        "aria-invalid": Boolean(error),
        "aria-describedby": describedBy,
        "aria-required": required || undefined,
      })}
      {error && (
        <p id={errorId} className="text-sm font-bold text-destructive">
          {error}
        </p>
      )}
      {description && (
        <p id={descriptionId} className="text-[13px] text-body">
          {description}
        </p>
      )}
    </div>
  )
}
