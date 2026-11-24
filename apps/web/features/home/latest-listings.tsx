import { ArrowRight } from "lucide-react"
import { getLocale, getTranslations } from "next-intl/server"

import { ListingCard } from "@/components/listing/listing-card"
import { Link } from "@/i18n/navigation"
import { emptyFilters, toApiQuery } from "@/lib/listing-filters"
import { getListings } from "@/lib/listings"

/** Anasayfada gösterilen ilan sayısı (masaüstünde tek sıra, mobilde 2×2). */
const COUNT = 4

/**
 * "En yeni ilanlar" (tasarım 01, 16): yayındaki en yeni 4 ilan, gerçek veriyle (1 dakika önbellekli, `listings`
 * etiketi). İlan yoksa "İlk ilanı siz verin" bağlantısı.
 */
export async function LatestListings() {
  const locale = await getLocale()
  const [t, page] = await Promise.all([
    getTranslations("HomePage"),
    getListings(toApiQuery(emptyFilters, locale, COUNT)),
  ])

  return (
    <section aria-labelledby="latest-title" className="mx-auto max-w-site px-4 py-10 lg:px-6 lg:py-16">
      <div className="mb-5 flex items-baseline justify-between gap-4 lg:mb-7">
        <h2 id="latest-title" className="text-h2 text-heading">
          {t("latestTitle")}
        </h2>
        <Link href="/listings" className="flex min-h-tap items-center gap-1.5 font-extrabold text-primary">
          <span className="lg:hidden">{t("allListingsShort")}</span>
          <span className="max-lg:hidden">{t("allListings")}</span>
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </div>
      {page.items.length === 0 ? (
        <p className="rounded-card border border-border p-6 text-body">
          {t("latestEmpty")}{" "}
          <Link href="/post-listing" className="font-extrabold text-primary">
            {t("postListing")}
          </Link>
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          {page.items.slice(0, COUNT).map((listing, i) => (
            <li key={listing.id}>
              <ListingCard listing={listing} priority={i < 2} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/** Yüklenirken: başlık ve 4 kart iskeleti (yerleşim kaymasın). */
export function LatestListingsFallback() {
  return (
    <div aria-hidden="true" className="mx-auto max-w-site px-4 py-10 lg:px-6 lg:py-16">
      <div className="mb-5 h-9 w-56 rounded bg-smoke-2 lg:mb-7" />
      <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
        {Array.from({ length: COUNT }, (_, i) => (
          <div key={i} className="aspect-[3/4] animate-pulse rounded-card bg-smoke-2 motion-reduce:animate-none" />
        ))}
      </div>
    </div>
  )
}
