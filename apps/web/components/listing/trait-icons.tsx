import { type LucideIcon, Mars, Scissors, Syringe, Venus } from "lucide-react"
import { useTranslations } from "next-intl"

import type { ListingCardData } from "@/lib/listings"
import { cn } from "@/lib/utils"

/** Özellik ikonları (Lucide): ilan kartı, detaydaki rozetler ve cinsiyet satırı aynı ikonları kullanır. */
export const TRAIT_ICONS = {
  female: Venus,
  male: Mars,
  vaccinated: Syringe,
  neutered: Scissors,
} satisfies Record<string, LucideIcon>

/** Kart rozetlerinin dolgu rengi (globals.css › --color-trait-*): kısır mor, aşılı yeşil, erkek mavi, dişi pembe. */
const TRAIT_BG: Record<keyof typeof TRAIT_ICONS, string> = {
  female: "bg-trait-female",
  male: "bg-trait-male",
  vaccinated: "bg-trait-vaccinated",
  neutered: "bg-trait-neutered",
}

type Traits = Pick<ListingCardData, "gender" | "vaccinated" | "neutered">

/**
 * Kart görselinin alt köşesindeki ikon rozetleri: cinsiyet (♀ pembe / ♂ mavi), aşılı (şırınga, yeşil), kısır (makas,
 * mor); 24 px renkli daire içinde 12 px beyaz ikon. Yalnızca bilinen / olumlu bilgiler gösterilir. İkonlar dekoratif
 * değil: her birinin metni ekran okuyucuya söylenir, fareyle üzerine gelince de görünür (title). Renk tek başına anlam
 * taşımaz.
 */
export function ListingTraitBadges({ listing, className }: { listing: Traits; className?: string }) {
  const tl = useTranslations("Listing")
  const items = [
    (listing.gender === "female" || listing.gender === "male") && {
      key: listing.gender,
      label: tl(`gender.${listing.gender}`),
    },
    listing.vaccinated && { key: "vaccinated" as const, label: tl("feature.vaccinated") },
    listing.neutered && { key: "neutered" as const, label: tl("feature.neutered") },
  ].filter((item) => item !== false)
  if (items.length === 0) return null

  return (
    <ul className={cn("flex gap-1.5", className)}>
      {items.map(({ key, label }) => {
        const Icon = TRAIT_ICONS[key]
        return (
          <li
            key={key}
            title={label}
            className={cn("flex size-6 items-center justify-center rounded-full text-white shadow-sm", TRAIT_BG[key])}
          >
            <Icon aria-hidden="true" className="size-3" strokeWidth={2.25} />
            <span className="sr-only">{label}</span>
          </li>
        )
      })}
    </ul>
  )
}
