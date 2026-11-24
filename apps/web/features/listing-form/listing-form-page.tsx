import { LoaderCircle, MailWarning, Lock } from "lucide-react"
import { getLocale, getTranslations } from "next-intl/server"
import { notFound } from "next/navigation"

import { buttonVariants } from "@/components/ui/button"
import { getPathname, Link, redirect } from "@/i18n/navigation"
import type { Locale } from "@/i18n/routing"
import { getCities, getSpecies } from "@/lib/dictionary"
import { apiServer } from "@/lib/server-api"
import { getCurrentUser } from "@/lib/session"

import { ListingForm } from "./listing-form"
import type { OwnListing } from "./model"

/**
 * İlan ver / düzenle sayfasının sunucu tarafı: oturum, e-posta doğrulaması, sözlük verisi ve (düzenlemede) ilanın
 * kendisi. Oturum yoksa girişe yönlendirir (proxy cookie'ye bakar; cookie geçersizse burada yakalanır).
 * cookies() okuduğu için sayfada <Suspense> içinde render edilir.
 */
export async function ListingFormPage({ listingId }: { listingId?: string }) {
  const locale = (await getLocale()) as Locale
  const [user, species, cities, listing] = await Promise.all([
    getCurrentUser(),
    getSpecies(locale),
    getCities(),
    listingId ? apiServer<OwnListing>(`/me/listings/${encodeURIComponent(listingId)}?locale=${locale}`) : null,
  ])

  if (!user) {
    const here = listingId
      ? getPathname({ href: { pathname: "/account/listings/[id]/edit", params: { id: listingId } }, locale })
      : getPathname({ href: "/post-listing", locale })
    return redirect({ href: { pathname: "/sign-in", query: { next: here } }, locale })
  }
  if (listingId && !listing) notFound()

  const t = await getTranslations("ListingForm")

  if (!user.emailVerified) {
    return (
      <Notice
        icon={<MailWarning className="size-12 text-warning-text" />}
        title={t("verifyTitle")}
        text={t("verifyText")}
      >
        <Link href={{ pathname: "/verify-email", query: { email: user.email } }} className={buttonVariants()}>
          {t("verifyLink")}
        </Link>
      </Notice>
    )
  }
  if (listing && (listing.status === "adopted" || listing.status === "closed")) {
    return (
      <Notice icon={<Lock className="size-12 text-body" />} title={t("notEditableTitle")} text={t("notEditableText")} />
    )
  }

  return (
    <ListingForm
      listing={listing}
      species={species.map(({ id, name }) => ({ id, name }))}
      cities={cities.map(({ id, name }) => ({ id, name }))}
      userHasPhone={Boolean(user.phone)}
    />
  )
}

/** Form yüklenirken gösterilir. */
export function ListingFormFallback() {
  return (
    <div className="flex min-h-[60dvh] items-center justify-center">
      <LoaderCircle aria-hidden="true" className="size-8 animate-spin text-primary" />
    </div>
  )
}

/** Formun yerine gösterilen bilgi kutusu (doğrulanmamış e-posta, düzenlenemeyen ilan). */
function Notice({
  icon,
  title,
  text,
  children,
}: {
  icon: React.ReactNode
  title: string
  text: string
  children?: React.ReactNode
}) {
  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <div className="flex justify-center" aria-hidden="true">
        {icon}
      </div>
      <h1 className="mt-4 text-h2 text-heading">{title}</h1>
      <p className="mt-2 text-body">{text}</p>
      {children && <div className="mt-6">{children}</div>}
    </div>
  )
}
