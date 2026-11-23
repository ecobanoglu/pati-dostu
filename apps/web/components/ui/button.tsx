import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Pati Dostu butonları.
 *
 * default          Mor ana eylem: "Onaya gönder", "Kaydet"
 * secondary        Turuncu vurgu, koyu metin: üst menüdeki "İlan Ver"
 * outline          Beyaz, gri kenarlı: "Önizle", "Vazgeç", "Düzenle"
 * outline-primary  Mor kenarlı: "Kayıt ol", "Başka fotoğrafla tekrar dene"
 * ghost            Zeminsiz: menü ve ikon butonları
 * destructive      Koyu pembe dolgu: "Seçili işlemleri uygula" (ban/sil)
 * destructive-ghost Zeminsiz koyu pembe metin: "Reddet", "Çıkış yap"
 * link             Metin bağlantısı görünümü
 *
 * Bağlantıyı buton gibi göstermek için: <Link className={buttonVariants({ variant: "secondary" })} />
 */
const buttonVariants = cva(
  [
    "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg",
    "font-sans font-extrabold transition-[color,background-color,border-color,box-shadow]",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
    "disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50",
    "aria-invalid:border-destructive",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-[18px]",
  ],
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-purple-2",
        secondary: "bg-secondary text-secondary-foreground hover:bg-[#f26a10]",
        outline: "border border-border bg-background text-heading hover:bg-smoke-2",
        "outline-primary": "border-2 border-primary bg-background text-primary hover:bg-accent",
        ghost: "text-heading hover:bg-accent hover:text-accent-foreground",
        destructive: "bg-destructive text-destructive-foreground hover:bg-[#8a0a47]",
        "destructive-ghost": "text-danger hover:bg-danger-soft",
        link: "h-auto px-0 text-primary underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-10 px-3.5 text-sm",
        default: "h-12 px-5 text-[15px]",
        lg: "h-13 rounded-xl px-6 text-base",
        icon: "size-tap",
        "icon-sm": "size-10 rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

type ButtonProps = React.ComponentProps<"button"> & VariantProps<typeof buttonVariants>

function Button({ className, variant, size, type = "button", ...props }: ButtonProps) {
  return (
    <button
      data-slot="button"
      data-variant={variant ?? "default"}
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
}

export { Button, buttonVariants }
export type { ButtonProps }
