import { Calendar, Eye, MapPin, Pencil } from "lucide-react"
import type { Metadata } from "next"
import { getFormatter, getLocale, getTranslations } from "next-intl/server"
import { notFound } from "next/navigation"

import { listingSlug } from "@/components/listing/listing-card"
import { ListingTypeBadge } from "@/components/listing/listing-type-badge"
import { getPathname, Link, permanentRedirect } from "@/i18n/navigation"
import type { Locale } from "@/i18n/routing"
import { getListing, getSimilarListings, type ListingDetailData } from "@/lib/listings"
import { apiServer } from "@/lib/server-api"
import { defaultTemplate, shareImagePath } from "@/lib/share-image"
import { getCurrentUser } from "@/lib/session"

import { ContactCard, ContactCardCompact, type ContactProps } from "./contact-card"
import { Gallery } from "./gallery"
import { ListingDescription } from "./listing-description"
import { FeaturesTable, FeatureTiles, SafeAdoptionNote } from "./listing-features"
import { MobileActionBar, MobileTopBar } from "./mobile-bars"
import { SimilarListingsAside, SimilarListingsStrip } from "./similar-listings"
import { ViewTracker } from "./view-tracker"

/** Adresin slug parçasından ilan numarasını çıkarır: "luna-2-aylik-tekir-kedi-104582" → 104582. */
export function parseListingNo(slug: string): number | null {
  const match = /(?:^|-)(\d{1,9})$/.exec(decodeURIComponent(slug))
  return match ? Number(match[1]) : null
}

/** Sekme başlığı ve paylaşım önizlemesi: ilan başlığı, açıklamanın ilk ~160 karakteri ve ilanın paylaşım görseli. */
export async function listingDetailMetadata(slug: string): Promise<Metadata> {
  const locale = (await getLocale()) as Locale
  const t = await getTranslations("ListingDetail")
  const no = parseListingNo(slug)
  const listing = no ? await getListing(no, locale) : null
  if (!listing) return { title: t("pageTitle"), robots: { index: false } }

  const title = listing.title ?? t("pageTitle")
  const text = (listing.description ?? "").replace(/\s+/g, " ").trim()
  const description = text.length > 160 ? `${text.slice(0, 157).trimEnd()}…` : text
  // Paylaşım önizlemesi: ilanın paylaşım görseli (kayıp/bulunanda Afiş, diğerlerinde Klasik; 1080×1080).
  const image = shareImagePath(listing.listingNo, { template: defaultTemplate(listing.type), format: "post", locale })
  return {
    title,
    description,
    openGraph: { title, description, type: "article", images: [{ url: image, width: 1080, height: 1080 }] },
  }
}

/**
 * Yayındaki ilanı (herkese açık, önbellekli) ya da — yayında değilse — sahibine/admin'e önizlemesini getirir.
 * Önizleme oturumla (cookie) ve önbelleksiz okunur.
 */
async function loadListing(no: number, locale: Locale, signedIn: boolean) {
  const live = await getListing(no, locale)
  if (live) return { listing: live, preview: false }
  if (!signedIn) return null
  const own = await apiServer<ListingDetailData>(`/listings/${no}?locale=${locale}`)
  return own ? { listing: own, preview: true } : null
}

/**
 * İlan detay sayfası (tasarım: 03-ilan-detay, 19-mobil-ilan-detay). Masaüstü üç sütun: başlık + galeri + açıklama ·
 * özellikler · ilan sahibi + benzer ilanlar. Mobilde sayfanın kendi üst çubuğu, kaydırmalı galeri, özellik
 * kutucukları ve altta sabit "Mesaj gönder". Yalnızca yayındaki ilan görünür (sahibi ve admin önizleyebilir);
 * eski/yanlış slug kalıcı olarak doğru adrese yönlendirilir. Oturuma baktığı için <Suspense> içinde render edilir.
 * Yorumlar ve şikâyet 3. aşamada eklenecek.
 */
export async function ListingDetailView({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const locale = (await getLocale()) as Locale
  const no = parseListingNo(slug)
  if (!no) notFound()

  const user = await getCurrentUser()
  const loaded = await loadListing(no, locale, Boolean(user))
  if (!loaded) notFound()
  const { listing, preview } = loaded

  const canonical = listingSlug(listing)
  if (decodeURIComponent(slug) !== canonical) {
    permanentRedirect({ href: { pathname: "/listing/[slug]", params: { slug: canonical } }, locale })
  }

  const [t, tp, tl, format, similar] = await Promise.all([
    getTranslations("ListingDetail"),
    getTranslations("ListingsPage"),
    getTranslations("Listing"),
    getFormatter(),
    preview ? Promise.resolve([]) : getSimilarListings(no, locale),
  ])

  const title = listing.title ?? tp("untitled")
  const place = [listing.city?.name, listing.district].filter(Boolean).join(", ")
  const date = new Date(listing.publishedAt ?? listing.createdAt)
  const contact: ContactProps = {
    listingNo: listing.listingNo,
    listingId: listing.id,
    type: listing.type,
    title,
    owner: listing.owner,
    contact: listing.contact,
    viewer: !user ? "guest" : user.id === listing.owner.id ? "owner" : "user",
    next: getPathname({ href: { pathname: "/listing/[slug]", params: { slug: canonical } }, locale }),
    canFavorite: !preview && user?.id !== listing.owner.id,
  }

  return (
    <>
      <MobileTopBar title={title} type={listing.type} listingNo={listing.listingNo} canFavorite={contact.canFavorite} />
      {!preview && <ViewTracker listingNo={listing.listingNo} />}

      <div className="mx-auto max-w-site pb-28 lg:px-6 lg:py-8 lg:pb-16">
        {preview && (
          <div
            role="status"
            className="flex flex-wrap items-center justify-between gap-3 bg-warning-soft px-4 py-3 text-sm font-bold text-heading lg:mb-6 lg:rounded-card lg:border-2 lg:border-warning"
          >
            {t("previewStatus", { status: tl(`status.${listing.status}` as never) })}
            {contact.viewer === "owner" && (
              <Link
                href={{ pathname: "/account/listings/[id]/edit", params: { id: listing.id } }}
                className="flex min-h-tap items-center gap-1.5 text-primary"
              >
                <Pencil aria-hidden="true" className="size-4" />
                {t("editListing")}
              </Link>
            )}
          </div>
        )}

        <nav aria-label="breadcrumb" className="mb-4 hidden text-sm lg:block">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link href="/" className="font-bold text-primary">
                {tp("breadcrumbHome")}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href="/listings" className="font-bold text-primary">
                {tp("breadcrumbListings")}
              </Link>
            </li>
            {listing.species && (
              <>
                <li aria-hidden="true">/</li>
                <li>
                  <Link
                    href={{ pathname: "/listings/[species]", params: { species: listing.species.slug } }}
                    className="font-bold text-primary"
                  >
                    {listing.species.name}
                  </Link>
                </li>
              </>
            )}
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="font-bold text-heading">
              {title}
            </li>
          </ol>
        </nav>

        <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_280px_300px] lg:items-start">
          {/* Sol sütun (mobilde tüm sayfa sırası buradadır) */}
          <div className="flex flex-col gap-6">
            <div className="order-2 flex flex-col items-start gap-3 px-4 lg:order-1 lg:px-0">
              <ListingTypeBadge type={listing.type} className="justify-self-start" />
              <h1 className="text-h2 text-heading lg:text-h1">{title}</h1>
              <ul className="flex flex-wrap items-center gap-x-5 gap-y-1.5 self-stretch text-[15px] text-body">
                {place && (
                  <li className="flex items-center gap-1.5">
                    <MapPin aria-hidden="true" className="size-4" />
                    {place}
                  </li>
                )}
                <li className="flex items-center gap-1.5">
                  <Calendar aria-hidden="true" className="size-4" />
                  <time dateTime={date.toISOString()}>{format.dateTime(date, { dateStyle: "long" })}</time>
                </li>
                <li className="max-lg:basis-full">
                  {t.rich("listingNo", {
                    no: listing.listingNo,
                    b: (chunks) => <b className="text-heading">{chunks}</b>,
                  })}
                </li>
                {!preview && (
                  <li className="flex items-center gap-1.5 max-lg:hidden">
                    <Eye aria-hidden="true" className="size-4" />
                    {t("views", { count: listing.viewCount })}
                  </li>
                )}
              </ul>
              <div className="mt-2 self-stretch lg:hidden">
                <ContactCardCompact {...contact} />
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <Gallery images={listing.images} title={title} />
            </div>

            <div className="order-3 flex flex-col gap-6 px-4 lg:px-0">
              <div className="lg:hidden">
                <FeatureTiles listing={listing} />
              </div>
              {listing.description && (
                <section
                  aria-labelledby="description-title"
                  className="lg:rounded-card lg:border lg:border-border lg:p-6"
                >
                  <h2 id="description-title" className="mb-2 text-xl font-extrabold text-heading lg:text-h3">
                    {t("description")}
                  </h2>
                  <ListingDescription text={listing.description} />
                </section>
              )}
              <div className="lg:hidden">
                <SimilarListingsStrip items={similar} />
              </div>
              <div className="lg:hidden">
                <SafeAdoptionNote />
              </div>
            </div>
          </div>

          {/* Orta sütun: özellikler */}
          <div className="hidden gap-6 lg:grid">
            <FeaturesTable listing={listing} />
            <SafeAdoptionNote />
          </div>

          {/* Sağ sütun: ilan sahibi + benzer ilanlar */}
          <div className="hidden gap-6 lg:grid">
            <ContactCard {...contact} />
            <SimilarListingsAside items={similar} />
          </div>
        </div>
      </div>

      <MobileActionBar {...contact} />
    </>
  )
}

/** İlan detayı yüklenirken: galeri ve sütun iskeletleri. */
export function ListingDetailFallback() {
  return (
    <div aria-hidden="true" className="mx-auto max-w-site lg:px-6 lg:py-8">
      <div className="h-15 border-b border-border lg:hidden" />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_280px_300px]">
        <div className="grid gap-4">
          <div className="mx-4 hidden h-10 w-3/4 rounded bg-smoke-2 lg:mx-0 lg:block" />
          <div className="aspect-[4/3] animate-pulse bg-smoke-2 lg:rounded-dialog" />
          <div className="mx-4 h-8 w-2/3 rounded bg-smoke-2 lg:hidden" />
        </div>
        <div className="hidden h-[520px] rounded-card bg-smoke-2 lg:block" />
        <div className="hidden h-[420px] rounded-card bg-smoke-2 lg:block" />
      </div>
    </div>
  )
}
