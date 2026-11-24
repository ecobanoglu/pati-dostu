import "server-only"

import { readFile } from "node:fs/promises"
import { join } from "node:path"

import { ImageResponse } from "next/og"
import { getTranslations } from "next-intl/server"
import QRCode from "qrcode"

import { getPathname } from "@/i18n/navigation"
import type { Locale } from "@/i18n/routing"
import type { ListingDetailData } from "@/lib/listings"
import { SHARE_FORMATS, type ShareFormat, type ShareTemplate } from "@/lib/share-image"

import { BRAND, type ShareData, ShareImage } from "./templates"

/** "Melez / Bilinmiyor" ırkı görselde yazılmaz (bilgi vermez). */
const MIXED_BREED_SLUG = "melez-bilinmiyor"

type Font = { name: string; data: Buffer; weight: 400 | 800; style: "normal" }
let fontsPromise: Promise<Font[]> | null = null

/**
 * Nunito (latin + latin-ext: Türkçe ğ, ş, ı, İ) — assets/fonts altındaki woff dosyaları, süreç başına bir kez okunur.
 * Satori bir harfi ilk fontta bulamazsa listedeki sonrakine bakar; bu yüzden iki alt küme aynı adla verilir.
 */
function loadFonts(): Promise<Font[]> {
  fontsPromise ??= Promise.all(
    (["latin", "latin-ext"] as const).flatMap((subset) =>
      ([400, 800] as const).map(async (weight) => ({
        name: "Nunito",
        data: await readFile(join(process.cwd(), "assets", "fonts", `nunito-${subset}-${weight}-normal.woff`)),
        weight,
        style: "normal" as const,
      }))
    )
  )
  return fontsPromise
}

/** PD logosu SVG'si (components/brand/logo.tsx › PdMark ile aynı çizim) — data: adresi. */
function logoDataUrl(tone: "light" | "dark"): string {
  const pad = tone === "light" ? BRAND.purple : BRAND.white
  const letters = tone === "light" ? BRAND.white : BRAND.purple
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
<ellipse cx="20" cy="35" rx="7" ry="9" transform="rotate(-22 20 35)" fill="${BRAND.orange}"/>
<ellipse cx="38" cy="22" rx="7.5" ry="9.5" transform="rotate(-6 38 22)" fill="${BRAND.orange}"/>
<ellipse cx="62" cy="22" rx="7.5" ry="9.5" transform="rotate(6 62 22)" fill="${BRAND.orange}"/>
<ellipse cx="80" cy="35" rx="7" ry="9" transform="rotate(22 80 35)" fill="${BRAND.orange}"/>
<path d="M50 40 C70 40 84 54 84 70 C84 82 74 88 62 86 C56 85 54 83 50 83 C46 83 44 85 38 86 C26 88 16 82 16 70 C16 54 30 40 50 40 Z" fill="${pad}"/>
<path d="M31 76 V54 H38 A6.5 6.5 0 0 1 38 67 H31" fill="none" stroke="${letters}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M55 54 V76 H57 A11 11 0 0 0 57 54 Z" fill="none" stroke="${letters}" stroke-width="7" stroke-linejoin="round"/>
</svg>`
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`
}

/**
 * Kapak fotoğrafını indirip data: adresine çevirir (Satori uzak adresi kendisi de indirebilir ama zaman aşımı ve
 * hata durumunu burada yönetmek için). Yalnızca JPEG/PNG; başka tür ya da hata olursa yer tutucu çizilir.
 */
async function photoDataUrl(url: string | undefined): Promise<string | null> {
  if (!url) return null
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
    const type = res.headers.get("content-type") ?? ""
    if (!res.ok || !/^image\/(jpeg|png)$/.test(type)) return null
    return `data:${type};base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`
  } catch {
    return null
  }
}

/** İlandan şablon verisini hazırlar (aktif dilde; telefon numarası bilerek alınmaz). */
async function buildData(
  listing: ListingDetailData,
  opts: { locale: Locale; origin: string; features: boolean }
): Promise<ShareData> {
  const { locale, origin } = opts
  const [t, tl] = await Promise.all([
    getTranslations({ locale, namespace: "ShareImage" }),
    getTranslations({ locale, namespace: "Listing" }),
  ])
  const upper = (s: string) => s.toLocaleUpperCase(locale)
  const age = listing.ageGroup ? t(`ageShort.${listing.ageGroup}`) : null
  const breed = listing.breed && listing.breed.slug !== MIXED_BREED_SLUG ? listing.breed.name : null
  const place = listing.district ?? listing.city?.name ?? null
  const gender = listing.gender === "unknown" ? null : tl(`gender.${listing.gender}`)
  const statusText = t(`status.${listing.type}`)

  const shortPath = getPathname({
    href: { pathname: "/listing/[slug]", params: { slug: `PD-${listing.listingNo}` } },
    locale,
  })
  const fullPath = getPathname({
    href: { pathname: "/listing/[slug]", params: { slug: `${listing.slug}-${listing.listingNo}` } },
    locale,
  })
  const host = new URL(origin).host.replace(/^www\./, "")
  const qrSvg = await QRCode.toString(`${origin}${fullPath}`, { type: "svg", margin: 0, color: { dark: BRAND.ink } })

  const lostOrFound = listing.type === "lost" || listing.type === "found"
  const date = new Date(listing.publishedAt ?? listing.createdAt)
  const lastSeenPlace = [listing.lastSeenAddress, listing.district, listing.city?.name].filter(Boolean).join(", ")
  const features = opts.features
    ? [
        listing.vaccinated && tl("feature.vaccinated"),
        listing.neutered && tl("feature.neutered"),
        listing.microchipped && tl("feature.microchipped"),
        listing.childFriendly && tl("feature.childFriendly"),
      ].filter((x): x is string => Boolean(x))
    : []

  return {
    name: listing.name ?? listing.title ?? "",
    facts: [age, gender, breed, place].filter(Boolean).join(" · "),
    badge: upper(statusText),
    status: [statusText, place].filter(Boolean).join(" · "),
    tagline: t(`tagline.${listing.type}`),
    cta: t(`cta.${listing.type}`),
    breedLine: [
      breed ? `${breed} ${listing.species?.name.toLocaleLowerCase(locale) ?? ""}`.trim() : listing.species?.name,
      age,
    ]
      .filter(Boolean)
      .join(" · "),
    lastSeenLabel: listing.type === "lost" || listing.type === "found" ? t(`lastSeen.${listing.type}`) : null,
    lastSeen: lostOrFound
      ? [
          lastSeenPlace,
          new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", timeZone: "Europe/Istanbul" }).format(date),
        ]
          .filter(Boolean)
          .join(" · ")
      : null,
    features,
    photo: await photoDataUrl(listing.images[0]?.url),
    qr: `data:image/svg+xml;base64,${Buffer.from(qrSvg).toString("base64")}`,
    link: `${host}${shortPath}`,
    host,
    logo: logoDataUrl("light"),
    logoDark: logoDataUrl("dark"),
  }
}

/**
 * İlanın paylaşım görselini PNG olarak üretir. Yanıt herkese açık önbelleğe alınır: görsel yalnızca yayındaki
 * (onaylı) ilandan üretildiği için bir süre eski kalması sorun değildir.
 */
export async function renderShareImage(
  listing: ListingDetailData,
  opts: { template: ShareTemplate; format: ShareFormat; features: boolean; locale: Locale; origin: string }
): Promise<ImageResponse> {
  const [data, fonts] = await Promise.all([buildData(listing, opts), loadFonts()])
  const { width, height } = SHARE_FORMATS[opts.format]
  return new ImageResponse(<ShareImage template={opts.template} format={opts.format} data={data} />, {
    width,
    height,
    fonts,
    headers: { "cache-control": "public, max-age=600, s-maxage=3600, stale-while-revalidate=86400" },
  })
}
