import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Rozetler.
 *
 * İlan türü:   adopt (Sahiplendirme), foster (Geçici Yuva), lost (Kayıp), found (Bulunan)
 * Durum:       success (Yayında, Aktif), warning (Onay bekliyor, Planlandı),
 *              danger (Reddedildi, Acil), notice (Kampanya), neutral (Taslak, kategori)
 * Diğer:       default (mor dolgu), soft (açık mor: "Sahiplenme", "YZ önerisi"), outline
 *
 * Bütün çiftler beyaz/açık zeminde en az 4.5:1 kontrastlıdır.
 * Renk tek başına anlam taşımaz: rozetin metni her zaman durumu söyler.
 */
const badgeVariants = cva(
  [
    "inline-flex w-fit shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-full",
    "font-extrabold leading-none",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
  ],
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        soft: "bg-accent text-accent-foreground",
        neutral: "bg-muted text-heading",
        outline: "border border-border bg-background text-heading",
        adopt: "bg-badge-adopt text-badge-adopt-fg",
        foster: "bg-badge-foster text-badge-foster-fg",
        lost: "bg-badge-lost text-badge-lost-fg",
        found: "bg-badge-found text-badge-found-fg",
        success: "bg-success-soft text-success-text",
        warning: "bg-warning-soft text-warning-text",
        danger: "bg-danger-soft text-danger",
        notice: "bg-notice-soft text-notice-text",
      },
      size: {
        sm: "px-2.5 py-1 text-xs",
        default: "px-3 py-1.5 text-[13px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

type BadgeProps = React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <span
      data-slot="badge"
      data-variant={variant ?? "default"}
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    />
  )
}

/** listing_type enum değerinden doğru rozet ve Türkçe etiket. */
const LISTING_TYPE_BADGE = {
  adoption: { variant: "adopt", label: "Sahiplendirme" },
  foster: { variant: "foster", label: "Geçici Yuva" },
  lost: { variant: "lost", label: "Kayıp" },
  found: { variant: "found", label: "Bulunan" },
} as const satisfies Record<string, { variant: NonNullable<BadgeProps["variant"]>; label: string }>

type ListingType = keyof typeof LISTING_TYPE_BADGE

function ListingTypeBadge({ type, ...props }: Omit<BadgeProps, "variant" | "children"> & { type: ListingType }) {
  const { variant, label } = LISTING_TYPE_BADGE[type]
  return (
    <Badge variant={variant} {...props}>
      {label}
    </Badge>
  )
}

export { Badge, badgeVariants, ListingTypeBadge, LISTING_TYPE_BADGE }
export type { BadgeProps, ListingType }
