import { Check, type LucideIcon, ShieldCheck, X } from "lucide-react"
import { useFormatter, useTranslations } from "next-intl"

import { TRAIT_ICONS } from "@/components/listing/trait-icons"
import type { ListingDetailData } from "@/lib/listings"
import { cn } from "@/lib/utils"

type Row = { label: string; value: string; icon?: LucideIcon }

/** İlanın dolu alanlarından özellik satırlarını üretir (boş alan gösterilmez). short: mobil kutucuklar için. */
function useFeatureRows(listing: ListingDetailData, short: boolean): Row[] {
  const t = useTranslations("ListingDetail")
  const tl = useTranslations("Listing")
  const format = useFormatter()
  const date = new Date(listing.publishedAt ?? listing.createdAt)
  const lastSeen = listing.lastSeenAddress && (listing.type === "lost" || listing.type === "found")
  const rows: Array<Row | null> = [
    short ? null : { label: t("rowType"), value: tl(`type.${listing.type}`) },
    listing.name ? { label: t("rowName"), value: listing.name } : null,
    listing.species ? { label: t("rowSpecies"), value: listing.species.name } : null,
    listing.breed ? { label: t("rowBreed"), value: listing.breed.name } : null,
    listing.ageGroup ? { label: t(short ? "rowAgeShort" : "rowAge"), value: tl(`ageGroup.${listing.ageGroup}`) } : null,
    listing.gender !== "unknown"
      ? { label: t("rowGender"), value: tl(`gender.${listing.gender}`), icon: TRAIT_ICONS[listing.gender] }
      : null,
    listing.size ? { label: t("rowSize"), value: tl(`size.${listing.size}`) } : null,
    listing.source ? { label: t("rowSource"), value: tl(`source.${listing.source}`) } : null,
    lastSeen
      ? {
          label: t(listing.type === "lost" ? "rowLastSeenLost" : "rowLastSeenFound"),
          value: listing.lastSeenAddress ?? "",
        }
      : null,
    short ? null : { label: t("rowDate"), value: format.dateTime(date, { dateStyle: "long" }) },
    listing.microchipNumber ? { label: t("rowMicrochip"), value: listing.microchipNumber } : null,
  ]
  return rows.filter((row): row is Row => row !== null)
}

/**
 * Sağlık/uyum rozetleri: aşı ve kısırlık her zaman (aşılı → şırınga, kısır → makas; değilse ×), mikroçip ve çocuk
 * dostu yalnızca varsa (✓).
 */
export function FeaturePills({ listing }: { listing: ListingDetailData }) {
  const t = useTranslations("ListingDetail")
  const tl = useTranslations("Listing")
  const pills = [
    {
      on: listing.vaccinated,
      label: listing.vaccinated ? tl("feature.vaccinated") : t("notVaccinated"),
      icon: TRAIT_ICONS.vaccinated,
    },
    {
      on: listing.neutered,
      label: listing.neutered ? tl("feature.neutered") : t("notNeutered"),
      icon: TRAIT_ICONS.neutered,
    },
    listing.microchipped ? { on: true, label: tl("feature.microchipped"), icon: Check } : null,
    listing.childFriendly ? { on: true, label: tl("feature.childFriendly"), icon: Check } : null,
  ].filter((pill) => pill !== null)

  return (
    <ul className="flex flex-wrap gap-2">
      {pills.map(({ on, label, icon: Icon }) => (
        <li
          key={label}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold",
            on ? "bg-success-soft text-success-text" : "bg-smoke-2 text-body"
          )}
        >
          {on ? <Icon aria-hidden="true" className="size-4" /> : <X aria-hidden="true" className="size-4" />}
          {label}
        </li>
      ))}
    </ul>
  )
}

/** Satır değerinin önündeki ikon (ör. cinsiyet: ♀ / ♂); metin zaten yazdığı için ekran okuyucudan gizli. */
function RowIcon({ icon: Icon }: { icon?: LucideIcon }) {
  return Icon ? <Icon aria-hidden="true" className="size-4 shrink-0 text-primary" strokeWidth={2.25} /> : null
}

/** Masaüstü "İlan özellikleri" tablosu ve rozetler (tasarım 03, orta sütun). */
export function FeaturesTable({ listing }: { listing: ListingDetailData }) {
  const t = useTranslations("ListingDetail")
  const rows = useFeatureRows(listing, false)
  return (
    <section aria-labelledby="features-title" className="rounded-card border border-border p-5">
      <h2 id="features-title" className="text-xl font-extrabold text-heading">
        {t("features")}
      </h2>
      <dl className="mt-1">
        {rows.map((row) => (
          <div key={row.label} className="flex justify-between gap-4 border-b border-border py-3 text-[15px]">
            <dt className="text-body">{row.label}</dt>
            <dd className="flex items-center justify-end gap-1.5 text-right font-bold break-words text-heading">
              <RowIcon icon={row.icon} />
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
      <div className="mt-4">
        <FeaturePills listing={listing} />
      </div>
    </section>
  )
}

/** Mobil "Özellikler" kutucukları (tasarım 19): iki sütunlu etiket + değer. */
export function FeatureTiles({ listing }: { listing: ListingDetailData }) {
  const t = useTranslations("ListingDetail")
  const rows = useFeatureRows(listing, true)
  return (
    <section aria-labelledby="features-title-mobile">
      <h2 id="features-title-mobile" className="text-xl font-extrabold text-heading">
        {t("featuresMobile")}
      </h2>
      <dl className="mt-3 grid grid-cols-2 gap-2.5">
        {rows.map((row) => (
          <div key={row.label} className="rounded-xl bg-smoke-2 px-3 py-2.5">
            <dt className="text-xs text-body">{row.label}</dt>
            <dd className="flex items-center gap-1.5 font-extrabold break-words text-heading">
              <RowIcon icon={row.icon} />
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
      <div className="mt-3">
        <FeaturePills listing={listing} />
      </div>
    </section>
  )
}

/** "Güvenli sahiplendirme" bilgi kutusu: ilanlar ücretsizdir, ücret isteyen ilan bildirilir. */
export function SafeAdoptionNote() {
  const t = useTranslations("ListingDetail")
  return (
    <aside className="rounded-card bg-accent p-5">
      <h2 className="flex items-center gap-2 text-base font-extrabold text-heading">
        <ShieldCheck aria-hidden="true" className="size-5 text-primary" />
        {t("safeTitle")}
      </h2>
      <p className="mt-2 text-sm leading-6 text-heading">{t("safeText")}</p>
    </aside>
  )
}
