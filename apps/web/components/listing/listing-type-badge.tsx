import { useTranslations } from "next-intl"

import { Badge, type BadgeProps, LISTING_TYPE_BADGE, type ListingType } from "@/components/ui/badge"

/**
 * İlan türü rozeti, etiketi aktif dilde. Renkler ui/badge.tsx › LISTING_TYPE_BADGE'den; oradaki ListingTypeBadge
 * Türkçe sabit etiket kullandığı için arayüzde bunu kullanın.
 */
export function ListingTypeBadge({ type, ...props }: Omit<BadgeProps, "variant" | "children"> & { type: ListingType }) {
  const t = useTranslations("Listing.type")
  return (
    <Badge variant={LISTING_TYPE_BADGE[type].variant} {...props}>
      {t(type)}
    </Badge>
  )
}
