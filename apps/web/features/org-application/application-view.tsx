import type { OrganizationType } from "@pati-dostu/validators"
import { BadgeCheck, CircleAlert, Clock } from "lucide-react"
import { getFormatter, getLocale, getTranslations } from "next-intl/server"

import { getPathname, Link, redirect } from "@/i18n/navigation"
import type { Locale } from "@/i18n/routing"
import { getCities } from "@/lib/dictionary"
import { apiServer } from "@/lib/server-api"
import { getCurrentUser } from "@/lib/session"

import { ApplicationForm } from "./application-form"
import type { OrgApplication } from "./types"

/** Adresteki `?tur=klinik|barinak` → kurum türü (alt bilgideki "Veteriner / Barınak başvurusu" bağlantıları). */
function typeFromQuery(value: string | string[] | undefined): OrganizationType | null {
  if (value === "klinik" || value === "clinic") return "clinic"
  if (value === "barinak" || value === "shelter") return "shelter"
  return null
}

/**
 * Kurumsal başvuru sayfasının sunucu tarafı (tasarım 03-icerik/09, 18): mor şerit (yol izi "Hesabım / Kurumsal
 * başvuru", başlık, açıklama), solda içerik, sağda "Süreç" ve "Kurumsal üyelikle" kutuları (mobilde formun altında).
 * İçerik başvurunun durumuna göre: yoksa boş form; beklemede → "inceleniyor" kartı; onaylıysa onay kartı; reddedildiyse
 * gerekçe + önceki bilgilerle dolu form (yeniden gönderilebilir — karar). Admin ve başvurusuz kurum hesabı bilgi
 * kartı görür. Oturum okuduğu için <Suspense> içinde render edilir.
 */
export async function ApplicationView({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const locale = (await getLocale()) as Locale
  const user = await getCurrentUser()
  if (!user) {
    return redirect({
      href: {
        pathname: "/sign-in",
        query: { next: getPathname({ href: "/account/organization-application", locale }) },
      },
      locale,
    })
  }
  const [t, ta, format, mine, cities, search] = await Promise.all([
    getTranslations("OrgApplication"),
    getTranslations("Account"),
    getFormatter(),
    apiServer<{ application: OrgApplication | null }>("/organizations/applications/me"),
    getCities(),
    searchParams,
  ])
  const application = mine?.application ?? null
  const date = (iso: string) => format.dateTime(new Date(iso), { dateStyle: "long", timeZone: "Europe/Istanbul" })

  let content
  if (application?.status === "pending") {
    content = (
      <StatusCard tone="pending" title={t("pendingTitle")} text={t("pendingText")}>
        <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[auto_minmax(0,1fr)]">
          <dt className="font-bold text-body">{t("summaryName")}</dt>
          <dd className="font-extrabold text-heading">{application.name}</dd>
          <dt className="font-bold text-body">{t("summaryType")}</dt>
          <dd className="text-heading">{t(`types.${application.type}`)}</dd>
          <dt className="font-bold text-body">{t("summaryCity")}</dt>
          <dd className="text-heading">
            {application.city}
            {application.district && ` / ${application.district}`}
          </dd>
          <dt className="font-bold text-body">{t("summarySubmitted")}</dt>
          <dd className="text-heading">{date(application.submittedAt)}</dd>
        </dl>
      </StatusCard>
    )
  } else if (application?.status === "approved") {
    content = (
      <StatusCard
        tone="approved"
        title={t("approvedTitle")}
        text={t("approvedText", { name: application.name, type: t(`types.${application.type}`) })}
      >
        <Link
          href="/account"
          className="mt-4 inline-flex min-h-tap items-center font-extrabold text-primary underline underline-offset-4"
        >
          {t("goToAccount")}
        </Link>
      </StatusCard>
    )
  } else if (user.role === "admin") {
    content = <StatusCard tone="info" title={t("adminTitle")} text={t("adminText")} />
  } else if (user.role === "clinic" || user.role === "shelter") {
    content = <StatusCard tone="approved" title={t("alreadyTitle")} text={t("alreadyText")} />
  } else {
    content = (
      <div className="grid gap-5">
        {application?.status === "rejected" && (
          <div role="status" className="rounded-card border border-destructive/40 bg-danger-soft p-4 lg:p-5">
            <p className="flex items-center gap-2 font-extrabold text-destructive">
              <CircleAlert aria-hidden="true" className="size-5 shrink-0" />
              {t("rejectedTitle")}
            </p>
            {application.rejectionReason && (
              <p className="mt-2 text-heading">
                <span className="font-bold">{t("rejectedReason")}:</span> {application.rejectionReason}
              </p>
            )}
            <p className="mt-1 text-sm text-heading">{t("rejectedText")}</p>
          </div>
        )}
        <ApplicationForm
          cities={cities}
          initial={application}
          initialType={typeFromQuery(search.tur)}
          contactName={user.name}
          emailVerified={user.emailVerified}
        />
      </div>
    )
  }

  return (
    <>
      <div className="bg-smoke">
        <div className="mx-auto max-w-site px-4 py-5 lg:px-6 lg:py-8">
          <nav aria-label="breadcrumb" className="text-sm max-lg:hidden">
            <ol className="flex flex-wrap items-center gap-2">
              <li>
                <Link href="/account" className="font-bold text-primary">
                  {ta("breadcrumb")}
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="font-bold text-heading">
                {t("title")}
              </li>
            </ol>
          </nav>
          <h1 className="text-h2 font-extrabold text-heading lg:mt-2 lg:text-h1">{t("title")}</h1>
          <p className="mt-1 text-body max-lg:hidden">{t("subtitle")}</p>
        </div>
      </div>
      <div className="bg-canvas">
        <div className="mx-auto grid max-w-site grid-cols-[minmax(0,1fr)] gap-6 px-4 py-5 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-6 lg:px-6 lg:py-8">
          <div className="min-w-0">{content}</div>
          <aside className="grid content-start gap-4" aria-label={t("asideLabel")}>
            <section aria-labelledby="org-process" className="rounded-card border border-border bg-background p-5">
              <h2 id="org-process" className="text-lg font-extrabold text-heading">
                {t("processTitle")}
              </h2>
              <ol className="mt-3 grid gap-3">
                {(["1", "2", "3"] as const).map((n) => (
                  <li key={n} className="flex gap-3">
                    <span
                      aria-hidden="true"
                      className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-smoke text-sm font-extrabold text-primary"
                    >
                      {n}
                    </span>
                    <span>
                      <span className="block font-extrabold text-heading">{t(`process.${n}.title`)}</span>
                      <span className="block text-sm text-body">{t(`process.${n}.text`)}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </section>
            <section aria-labelledby="org-benefits" className="rounded-card bg-smoke p-5">
              <h2 id="org-benefits" className="text-base font-extrabold text-heading">
                {t("benefitsTitle")}
              </h2>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-heading">
                {(["1", "2", "3"] as const).map((n) => (
                  <li key={n}>{t(`benefits.${n}`)}</li>
                ))}
              </ul>
            </section>
          </aside>
        </div>
      </div>
    </>
  )
}

/** Durum kartı: inceleniyor (saat), onaylandı (rozet), bilgi. */
function StatusCard({
  tone,
  title,
  text,
  children,
}: {
  tone: "pending" | "approved" | "info"
  title: string
  text: string
  children?: React.ReactNode
}) {
  const Icon = tone === "approved" ? BadgeCheck : tone === "pending" ? Clock : CircleAlert
  return (
    <section aria-labelledby="org-status" className="rounded-card border border-border bg-background p-5 lg:p-6">
      <span
        aria-hidden="true"
        className={
          tone === "approved"
            ? "inline-flex size-12 items-center justify-center rounded-full bg-success-soft text-success-text"
            : "inline-flex size-12 items-center justify-center rounded-full bg-smoke text-primary"
        }
      >
        <Icon className="size-6" />
      </span>
      <h2 id="org-status" className="mt-3 text-h3 font-extrabold text-heading">
        {title}
      </h2>
      <p className="mt-1 text-body">{text}</p>
      {children}
    </section>
  )
}

/** Yüklenirken: şerit ve form iskeleti. */
export function ApplicationFallback() {
  return (
    <div aria-hidden="true">
      <div className="h-40 bg-smoke" />
      <div className="mx-auto grid max-w-site gap-6 px-4 py-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:px-6">
        <div className="h-[900px] animate-pulse rounded-card bg-smoke-2 motion-reduce:animate-none" />
        <div className="h-64 rounded-card bg-smoke-2 max-lg:hidden" />
      </div>
    </div>
  )
}
