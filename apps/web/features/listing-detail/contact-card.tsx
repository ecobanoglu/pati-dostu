"use client"

import { Lock, MessageCircle, Pencil, Phone } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { useState } from "react"

import { buttonVariants } from "@/components/ui/button"
import { Link } from "@/i18n/navigation"
import { apiFetch } from "@/lib/api-browser"
import { useErrorMessage } from "@/lib/errors"
import type { ListingDetailData } from "@/lib/listings"
import { cn } from "@/lib/utils"

import { FavoriteButton } from "@/components/listing/favorite-button"
import { ShareDialog } from "@/components/listing/share-dialog"

export type ContactProps = {
  listingNo: number
  listingId: string
  /** İlan türü (paylaşım görselinde varsayılan şablon için). */
  type: string
  title: string
  owner: ListingDetailData["owner"]
  contact: ListingDetailData["contact"]
  viewer: "guest" | "user" | "owner"
  /** Giriş sonrası dönülecek adres (bu ilanın yolu). */
  next: string
  /** Favori butonu gösterilsin mi (yayındaki ilan ve bakan sahibi değil). */
  canFavorite: boolean
}

/** Rol → ilan sahibi kartındaki etiketin çeviri anahtarı. */
const ROLE_LABEL = {
  user: "ownerIndividual",
  clinic: "ownerClinic",
  shelter: "ownerShelter",
  admin: "ownerAdmin",
} as const

/** "+905321234567" → "0532 123 45 67" (Türkiye cep numarası; başka biçimde olduğu gibi döner). */
export function formatPhone(e164: string): string {
  const d = e164.replace(/\D/g, "").replace(/^90/, "")
  return d.length === 10 ? `0${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 8)} ${d.slice(8)}` : e164
}

/** İlan sahibinin baş harfli yuvarlak avatarı (fotoğrafı varsa o). */
function OwnerAvatar({ name, image, className }: { name: string; image: string | null; className?: string }) {
  const locale = useLocale()
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toLocaleUpperCase(locale)
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary font-extrabold text-white",
        className
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- profil fotoğrafı */}
      {image ? <img src={image} alt="" className="size-full object-cover" /> : initials}
    </span>
  )
}

/** Sahibin adı, rolü ve yayındaki ilan sayısı. */
function OwnerHeading({ owner, size }: { owner: ContactProps["owner"]; size: "lg" | "sm" }) {
  const t = useTranslations("ListingDetail")
  return (
    <div className="flex min-w-0 items-center gap-3.5">
      <OwnerAvatar
        name={owner.name}
        image={owner.image}
        className={size === "lg" ? "size-16 text-2xl" : "size-12 text-lg"}
      />
      <div className="min-w-0">
        <p className="truncate text-lg font-extrabold text-heading">{owner.name}</p>
        <p className="text-sm text-body">
          {t(ROLE_LABEL[owner.role])} · {t("ownerListings", { count: owner.activeListings })}
        </p>
      </div>
    </div>
  )
}

/**
 * Telefon numarası: maskeli gösterilir; "Numarayı göster" giriş yapmış kullanıcıya tam numarayı API'den getirir
 * (GET /listings/{no}/phone), ardından "Ara" ve "WhatsApp ile yaz" görünür. Misafir giriş sayfasına yönlendirilir.
 * İlan sahibi numarasını paylaşmıyorsa bilgi kutusu gösterilir.
 */
function PhoneBlock({ listingNo, title, contact, viewer, next, compact }: ContactProps & { compact?: boolean }) {
  const t = useTranslations("ListingDetail")
  const errorMessage = useErrorMessage()
  const [phone, setPhone] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /** Tam numarayı API'den ister. */
  async function reveal() {
    setLoading(true)
    setError(null)
    const { data, error: err } = await apiFetch<{ phone: string }>(`/listings/${listingNo}/phone`)
    setLoading(false)
    if (err) setError(errorMessage(err.code, err.details))
    else setPhone(data.phone)
  }

  if (!contact.showPhone) {
    if (compact) {
      return (
        <p className="flex shrink-0 items-center gap-1.5 text-xs font-bold text-body">
          <Lock aria-hidden="true" className="size-3.5" />
          {t("phoneHiddenShort")}
        </p>
      )
    }
    return (
      <p className="flex gap-2 rounded-xl bg-smoke-2 p-3.5 text-sm text-heading">
        <Lock aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-body" />
        {t("phoneHidden")}
      </p>
    )
  }

  const digits = phone?.replace(/\D/g, "") ?? ""
  return (
    <div className="grid gap-2.5">
      <div className="flex min-h-tap items-center gap-3 rounded-xl bg-smoke-2 px-3.5 py-2">
        <Phone aria-hidden="true" className="size-5 shrink-0 text-body" />
        <span className="flex-1 font-extrabold whitespace-nowrap text-heading" aria-live="polite">
          {phone ? formatPhone(phone) : contact.phoneMasked}
        </span>
        {!phone &&
          (viewer === "guest" ? (
            <Link
              href={{ pathname: "/sign-in", query: { next } }}
              className="min-h-tap content-center text-sm font-bold whitespace-nowrap text-primary"
            >
              {t("revealPhone")}
              <span className="sr-only"> {t("revealPhoneSignIn")}</span>
            </Link>
          ) : (
            <button
              type="button"
              onClick={reveal}
              disabled={loading}
              className="min-h-tap text-sm font-bold whitespace-nowrap text-primary disabled:opacity-60"
            >
              {t("revealPhone")}
            </button>
          ))}
      </div>
      {error && (
        <p role="alert" className="text-sm font-bold text-danger">
          {error}
        </p>
      )}
      {phone && (
        <div className={cn("grid gap-2.5", compact && "grid-cols-2")}>
          <a href={`tel:+${digits}`} className={buttonVariants({ variant: "outline-primary" })}>
            <Phone aria-hidden="true" />
            {t("call")}
          </a>
          <a
            href={`https://wa.me/${digits}?text=${encodeURIComponent(t("whatsappText", { title }))}`}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "border-2 border-success-text text-success-text hover:bg-success-soft"
            )}
          >
            <MessageCircle aria-hidden="true" />
            {t("whatsapp")}
          </a>
        </div>
      )}
    </div>
  )
}

/** Ana eylem: "Mesaj gönder" (misafir → giriş), ilan sahibine "İlanı düzenle". */
export function PrimaryAction({ listingId, viewer, next, className }: ContactProps & { className?: string }) {
  const t = useTranslations("ListingDetail")
  if (viewer === "owner") {
    return (
      <Link
        href={{ pathname: "/account/listings/[id]/edit", params: { id: listingId } }}
        className={cn(buttonVariants(), className)}
      >
        <Pencil aria-hidden="true" />
        {t("editListing")}
      </Link>
    )
  }
  // Mesajlaşma 3. aşamada; şimdilik mesajlar sayfasına gider (ilanla konuşma başlatma o adımda).
  return (
    <Link
      href={viewer === "guest" ? { pathname: "/sign-in", query: { next } } : "/account/messages"}
      className={cn(buttonVariants(), className)}
    >
      <MessageCircle aria-hidden="true" />
      {t("sendMessage")}
    </Link>
  )
}

/** Masaüstü ilan sahibi kartı (tasarım 03, sağ sütun): sahip, telefon, mesaj, favori ve paylaş. */
export function ContactCard(props: ContactProps) {
  return (
    <section aria-labelledby="owner-name" className="grid gap-4 rounded-card border border-border p-5">
      <h2 id="owner-name" className="sr-only">
        {props.owner.name}
      </h2>
      <OwnerHeading owner={props.owner} size="lg" />
      <PhoneBlock {...props} />
      <PrimaryAction {...props} />
      <div className={cn("grid gap-2.5", props.canFavorite && "grid-cols-2")}>
        {props.canFavorite && <FavoriteButton listingNo={props.listingNo} title={props.title} variant="full" />}
        <ShareDialog listingNo={props.listingNo} title={props.title} type={props.type} variant="full" />
      </div>
    </section>
  )
}

/** Mobil ilan sahibi kartı (tasarım 19): sahip solda, telefon durumu sağda; numara açılınca altta Ara/WhatsApp. */
export function ContactCardCompact(props: ContactProps) {
  const revealable = props.contact.showPhone
  return (
    <section aria-label={props.owner.name} className="grid gap-3 rounded-card border border-border p-4">
      <div className="flex items-center justify-between gap-3">
        <OwnerHeading owner={props.owner} size="sm" />
        {!revealable && <PhoneBlock {...props} compact />}
      </div>
      {revealable && <PhoneBlock {...props} compact />}
    </section>
  )
}
