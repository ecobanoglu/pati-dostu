import { Calendar, MapPin } from "lucide-react"
import { useFormatter, useTranslations } from "next-intl"

import { PdMark } from "@/components/brand/logo"
import { Link } from "@/i18n/navigation"
import type { ListingCardData } from "@/lib/listings"
import { cn } from "@/lib/utils"

import { ListingTypeBadge } from "./listing-type-badge"

/** İlan detay adresinin slug parçası: /ilan/{slug}-{ilanNo}. */
export function listingSlug(listing: Pick<ListingCardData, "slug" | "listingNo">): string {
  return listing.slug ? `${listing.slug}-${listing.listingNo}` : String(listing.listingNo)
}

/**
 * İlan kartı (tasarım: 02-ilan-listeleme, 17-mobil-ilan-listeleme): kapak fotoğrafı, tür rozeti, başlık, il/ilçe ve
 * yayın tarihi. Kartın tamamı detay sayfasına bağlantıdır (başlık bağlantının adıdır). `layout="list"`: yatay kart.
 * Favori (kalp) butonu 8. adımda eklenecek.
 */
export function ListingCard({
  listing,
  layout = "grid",
  priority = false,
}: {
  listing: ListingCardData
  layout?: "grid" | "list"
  /** İlk ekrandaki kartlar: fotoğraf tembel yüklenmesin (LCP). */
  priority?: boolean
}) {
  const t = useTranslations("ListingsPage")
  const format = useFormatter()
  const date = listing.publishedAt ? new Date(listing.publishedAt) : null
  const place = [listing.city?.name, listing.district].filter(Boolean).join(", ")
  const list = layout === "list"

  return (
    <article
      className={cn(
        "group relative h-full overflow-hidden rounded-card border border-border bg-background transition-shadow hover:shadow-pop",
        list && "sm:flex"
      )}
    >
      <div className={cn("relative aspect-[4/3] bg-smoke-2", list && "sm:aspect-auto sm:h-44 sm:w-60 sm:shrink-0")}>
        {listing.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- depo adresi (R2/RustFS); next/image uzak yükleyici yayına çıkarken ayarlanacak
          <img
            src={listing.coverUrl}
            alt=""
            loading={priority ? "eager" : "lazy"}
            className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <span className="flex size-full flex-col items-center justify-center gap-1 text-xs font-bold text-body">
            <PdMark className="size-10 opacity-30 grayscale" />
            {t("photo")}
          </span>
        )}
        <ListingTypeBadge type={listing.type} className="absolute top-2.5 left-2.5" />
      </div>

      <div className="grid content-start gap-1.5 p-3.5 sm:p-4">
        <h3 className="line-clamp-2 text-base font-extrabold text-title sm:text-lg">
          <Link
            href={{ pathname: "/listing/[slug]", params: { slug: listingSlug(listing) } }}
            className="text-title after:absolute after:inset-0 focus-visible:outline-none after:focus-visible:rounded-card after:focus-visible:outline-2 after:focus-visible:outline-ring"
          >
            {listing.title ?? t("untitled")}
          </Link>
        </h3>
        {place && (
          <p className="flex items-center gap-1.5 text-[13px] text-body sm:text-sm">
            <MapPin aria-hidden="true" className="size-3.5 shrink-0" />
            <span className="truncate">{place}</span>
          </p>
        )}
        {date && (
          <p className="flex items-center gap-1.5 text-[13px] text-body sm:text-sm">
            <Calendar aria-hidden="true" className="size-3.5 shrink-0" />
            <time dateTime={listing.publishedAt ?? undefined}>
              <span className="sm:hidden">{format.dateTime(date, { day: "numeric", month: "short" })}</span>
              <span className="max-sm:hidden">
                {format.dateTime(date, { day: "numeric", month: "long", year: "numeric" })}
              </span>
            </time>
          </p>
        )}
      </div>
    </article>
  )
}
