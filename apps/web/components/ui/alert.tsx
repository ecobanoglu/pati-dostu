import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Bilgi, başarı, uyarı ve hata kutuları.
 *
 * default      Beyaz, gri kenarlı
 * info         Açık mor: "Bu bir randevu talebidir…", "Nasıl çalışır?"
 * success      Açık yeşil: "Şu an açık", "Yapay zekâ 6 alanı doldurdu"
 * warning      Açık sarı, sarı kenar: "Düzeltme istendi", planlı bakım
 * destructive  Açık pembe: "Yorumunuz gönderilemedi", engellenen içerik
 *
 * Erişilebilirlik: destructive varsayılan olarak role="alert" (hemen okunur),
 * diğerleri role="status" (sırası gelince okunur). Gerekirse role verilerek değiştirilir.
 * Kutuya ikon eklemek için ilk çocuk olarak bir <svg> koyun; ızgara kendini ayarlar.
 */
const alertVariants = cva(
  [
    "relative grid w-full items-start gap-y-1 rounded-xl px-4 py-3.5 text-sm leading-relaxed",
    "grid-cols-[0_1fr] has-[>svg]:grid-cols-[1.25rem_1fr] has-[>svg]:gap-x-3",
    "[&>svg]:size-5 [&>svg]:translate-y-px [&>svg]:text-current",
  ],
  {
    variants: {
      variant: {
        default: "border border-border bg-card text-heading",
        info: "bg-accent text-heading [&>svg]:text-primary",
        success: "bg-success-soft text-heading [&>svg]:text-success-text",
        warning: "border-2 border-warning bg-warning-soft text-heading [&>svg]:text-warning-text",
        destructive: "bg-danger-soft text-heading [&>svg]:text-danger",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

type AlertProps = React.ComponentProps<"div"> & VariantProps<typeof alertVariants>

function Alert({ className, variant, role, ...props }: AlertProps) {
  return (
    <div
      data-slot="alert"
      data-variant={variant ?? "default"}
      role={role ?? (variant === "destructive" ? "alert" : "status")}
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  )
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn("col-start-2 text-[15px] font-extrabold text-heading", className)}
      {...props}
    />
  )
}

function AlertDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn("col-start-2 grid justify-items-start gap-1 text-sm text-heading [&_p]:leading-relaxed", className)}
      {...props}
    />
  )
}

export { Alert, AlertTitle, AlertDescription, alertVariants }
export type { AlertProps }
