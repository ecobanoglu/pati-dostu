import { MapPin } from "lucide-react"
import { useTranslations } from "next-intl"

import { PdMark } from "@/components/brand/logo"
import { listingSlug } from "@/components/listing/listing-card"
import { ListingTypeBadge } from "@/components/listing/listing-type-badge"
import { Link } from "@/i18n/navigation"
import type { ListingCardData } from "@/lib/listings"
import { cn } from "@/lib/utils"

/** Benzer ilan kartı: "row" küçük resim + metin yan yana (masaüstü), "tile" dikey kart (mobil yatay şerit). */
function SimilarCard({ listing, layout }: { listing: ListingCardData; layout: "row" | "tile" }) {
  const t = useTranslations("ListingsPage")
  const place = [listing.city?.name, listing.district].filter(Boolean).join(", ")
  const row = layout === "row"
  return (
    <article
      className={cn(
        "relative h-full overflow-hidden rounded-card border border-border bg-background transition-shadow hover:shadow-pop",
        row && "flex gap-3 p-2.5"
      )}
    >
      <div className={cn("shrink-0 overflow-hidden bg-smoke-2", row ? "size-19 rounded-xl" : "aspect-[16/10] w-full")}>
        {listing.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- depo adresi
          <img src={listing.coverUrl} alt="" loading="lazy" className="size-full object-cover" />
        ) : (
          <span className="flex size-full items-center justify-center">
            <PdMark className="size-8 opacity-30 grayscale" />
          </span>
        )}
      </div>
      <div className={cn("grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-1", !row && "p-3")}>
        {row && <ListingTypeBadge type={listing.type} className="justify-self-start py-1 text-[11px] font-bold" />}
        <h3 className="truncate text-[15px] font-extrabold">
          <Link
            href={{ pathname: "/listing/[slug]", params: { slug: listingSlug(listing) } }}
            title={listing.title ?? undefined}
            className="text-title after:absolute after:inset-0 focus-visible:outline-none after:focus-visible:rounded-card after:focus-visible:outline-2 after:focus-visible:outline-ring"
          >
            {listing.title ?? t("untitled")}
          </Link>
        </h3>
        {place && (
          <p className="flex items-center gap-1 text-[13px] text-body">
            <MapPin aria-hidden="true" className="size-3.5 shrink-0" />
            <span className="truncate">{place}</span>
          </p>
        )}
      </div>
    </article>
  )
}

/** Masaüstü sağ sütundaki "Benzer ilanlar" kutusu (tasarım 03). */
export function SimilarListingsAside({ items }: { items: ListingCardData[] }) {
  const t = useTranslations("ListingDetail")
  if (items.length === 0) return null
  return (
    <section aria-labelledby="similar-title" className="rounded-card border border-border p-5">
      <h2 id="similar-title" className="text-xl font-extrabold text-heading">
        {t("similar")}
      </h2>
      <ul className="mt-4 grid gap-3">
        {items.map((item) => (
          <li key={item.id}>
            <SimilarCard listing={item} layout="row" />
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Mobil "Benzer ilanlar": yatay kaydırılan kartlar (tasarım 19). */
export function SimilarListingsStrip({ items }: { items: ListingCardData[] }) {
  const t = useTranslations("ListingDetail")
  if (items.length === 0) return null
  return (
    <section aria-labelledby="similar-title-mobile">
      <h2 id="similar-title-mobile" className="text-xl font-extrabold text-heading">
        {t("similar")}
      </h2>
      <ul className="-mx-4 mt-3 flex snap-x gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">
        {items.map((item) => (
          <li key={item.id} className="w-40 shrink-0 snap-start">
            <SimilarCard listing={item} layout="tile" />
          </li>
        ))}
      </ul>
    </section>
  )
}
