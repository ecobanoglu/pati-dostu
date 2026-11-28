import { ArrowLeft, ArrowRight } from "lucide-react"
import type { Metadata } from "next"
import { getFormatter, getLocale, getTranslations } from "next-intl/server"

import { ApplicationActions } from "@/components/admin/application-actions"
import { PdMark } from "@/components/brand/logo"
import { AdminTopBar } from "@/components/layout/admin/admin-top-bar"
import { Badge } from "@/components/ui/badge"
import { Link } from "@/i18n/navigation"
import { requireAdmin } from "@/lib/admin"
import { apiServer } from "@/lib/server-api"
import { cn } from "@/lib/utils"

import { applicationsHref, type ApplicationsState, parseApplicationsQuery } from "./query"
import type { AdminApplicationDetail, AdminApplicationPage, AdminApplicationRow } from "./types"

type SearchParams = Record<string, string | string[] | undefined>

/** Sekme başlığı: "Kurum başvuruları". */
export async function applicationsMetadata(): Promise<Metadata> {
  const t = await getTranslations("AdminApplications")
  return { title: t("title") }
}

/**
 * Admin › Kurum başvuruları (tasarım 07-admin/03 sağ kutusunun tam sayfası). Solda başvurular (Bekleyen / Onaylanan /
 * Reddedilen sekmeleri; bekleyenler en eski önce), sağda seçili başvuru: kurum bilgileri, adres, hizmetler, çalışma
 * saatleri, başvuran (üyelik, ilan sayısı, Kullanıcılar'da aç), önceki red gerekçesi, karar (Onayla / Reddet) ya da
 * sonuç. Seçim adreste (`basvuru`); seçilmemişse listenin ilki. Mobilde liste ve ayrıntı ayrı ekran. <Suspense> içinde.
 */
export async function ApplicationsView({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdmin()
  const locale = await getLocale()
  const state = parseApplicationsQuery(await searchParams)
  const api = new URLSearchParams({ status: state.status, page: String(state.page), locale })
  const [t, page] = await Promise.all([
    getTranslations("AdminApplications"),
    apiServer<AdminApplicationPage>(`/admin/organizations/applications?${api.toString()}`),
  ])
  if (!page) throw new Error("Başvuru listesi okunamadı")
  const selectedId = state.selected ?? page.items[0]?.id ?? null
  const detail = selectedId
    ? await apiServer<AdminApplicationDetail>(`/admin/organizations/applications/${selectedId}`)
    : null
  const pages = Math.max(1, Math.ceil(page.total / page.pageSize))

  return (
    <>
      <AdminTopBar title={t("title")} crumbs={[{ label: t("title") }]} />
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-5 px-4 py-5 lg:grid-cols-[400px_minmax(0,1fr)] lg:px-7 lg:py-6">
        <section
          aria-labelledby="apps-title"
          className={cn(
            "overflow-hidden rounded-card border border-border bg-background lg:sticky lg:top-24",
            state.selected && "max-lg:hidden"
          )}
        >
          <h2 id="apps-title" className="sr-only">
            {t("listTitle")}
          </h2>
          <nav aria-label={t("statusFilter")} className="overflow-x-auto border-b border-border">
            <ul className="flex min-w-max gap-1 px-3">
              {(["pending", "approved", "rejected"] as const).map((s) => (
                <li key={s}>
                  <Link
                    href={applicationsHref({ status: s, selected: null, page: 1 })}
                    aria-current={state.status === s ? "page" : undefined}
                    className={cn(
                      "inline-flex min-h-13 items-center gap-1.5 border-b-3 px-3 font-extrabold",
                      state.status === s
                        ? "border-primary text-primary"
                        : "border-transparent text-heading hover:text-primary"
                    )}
                  >
                    {t(`status.${s}`)}{" "}
                    <span className={state.status === s ? undefined : "text-body"}>{page.counts[s]}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          {page.items.length === 0 ? (
            <p className="p-5 text-body">{t(`empty.${state.status}`)}</p>
          ) : (
            <ul className="divide-y divide-border">
              {page.items.map((item) => (
                <Row key={item.id} item={item} state={state} current={item.id === selectedId} />
              ))}
            </ul>
          )}
          {pages > 1 && (
            <nav
              aria-label={t("pagination")}
              className="flex items-center justify-between border-t border-border px-4 py-3 text-sm"
            >
              <span className="text-body">{t("pageOf", { page: state.page, pages })}</span>
              <span className="flex gap-2">
                {state.page > 1 && (
                  <Link
                    href={applicationsHref({ ...state, selected: null, page: state.page - 1 })}
                    aria-label={t("prev")}
                    className="inline-flex size-tap items-center justify-center rounded-lg border border-border hover:bg-smoke"
                  >
                    <ArrowLeft aria-hidden="true" className="size-4" />
                  </Link>
                )}
                {state.page < pages && (
                  <Link
                    href={applicationsHref({ ...state, selected: null, page: state.page + 1 })}
                    aria-label={t("next")}
                    className="inline-flex size-tap items-center justify-center rounded-lg border border-border hover:bg-smoke"
                  >
                    <ArrowRight aria-hidden="true" className="size-4" />
                  </Link>
                )}
              </span>
            </nav>
          )}
        </section>

        <div className={cn("grid gap-4", !state.selected && "max-lg:hidden")}>
          <Link
            href={applicationsHref({ ...state, selected: null })}
            className="inline-flex min-h-tap items-center gap-1.5 font-extrabold text-primary lg:hidden"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            {t("backToList")}
          </Link>
          {detail ? (
            <Detail data={detail} />
          ) : (
            <div className="grid justify-items-center gap-3 rounded-card border border-border bg-background px-6 py-16 text-center">
              <PdMark className="size-16 opacity-40" />
              <p className="text-xl font-extrabold text-heading">{t("noApplication")}</p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

/** Liste satırı: kurum adı, tür · şehir, yetkili, tarih; "yeniden gönderildi" rozeti. Satırın tamamı bağlantı. */
async function Row({
  item,
  state,
  current,
}: {
  item: AdminApplicationRow
  state: ApplicationsState
  current: boolean
}) {
  const [t, format] = await Promise.all([getTranslations("AdminApplications"), getFormatter()])
  const when = item.status === "pending" ? item.submittedAt : (item.reviewedAt ?? item.submittedAt)
  return (
    <li
      className={cn(
        "relative grid gap-0.5 border-l-4 px-4 py-3",
        current ? "border-primary bg-smoke" : "border-transparent hover:bg-canvas"
      )}
    >
      <Link
        href={applicationsHref({ ...state, selected: item.id })}
        aria-current={current ? "true" : undefined}
        scroll={false}
        className="font-extrabold text-heading after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-[-2px] focus-visible:after:outline-ring"
      >
        {item.name}
      </Link>
      <p className="text-sm text-body">
        {t(`roles.${item.type}`)} · {item.city}
        {item.district && ` / ${item.district}`} ·{" "}
        {format.dateTime(new Date(when), { day: "numeric", month: "short", timeZone: "Europe/Istanbul" })}
      </p>
      <p className="truncate text-sm text-body">
        {item.contactName ?? item.applicant.name} · {item.applicant.email}
      </p>
      {item.resubmitted && (
        <Badge variant="notice" size="sm" className="mt-1 justify-self-start">
          {t("resubmitted")}
        </Badge>
      )}
    </li>
  )
}

/** Seçili başvurunun ayrıntısı ve kararı. */
async function Detail({ data }: { data: AdminApplicationDetail }) {
  const [t, to, format, locale] = await Promise.all([
    getTranslations("AdminApplications"),
    getTranslations("OrgApplication"),
    getFormatter(),
    getLocale(),
  ])
  const date = (iso: string) => format.dateTime(new Date(iso), { dateStyle: "long", timeZone: "Europe/Istanbul" })
  const dayName = (day: number) =>
    new Intl.DateTimeFormat(locale, { weekday: "long", timeZone: "UTC" }).format(Date.UTC(2024, 0, 1 + day))
  const statusBadge = { pending: "warning", approved: "success", rejected: "danger" } as const
  const rows: Array<[string, string]> = [
    [to("registryNo"), data.registryNo],
    [to("contactName"), data.contactName ?? "—"],
    [to("phone"), data.phone ?? "—"],
    [to("email"), data.email ?? "—"],
    [t("addressLabel"), `${data.address}, ${data.district ? `${data.district} / ` : ""}${data.city}`],
  ]
  return (
    <>
      <article
        aria-labelledby="app-title"
        className="grid gap-5 rounded-card border border-border bg-background p-5 lg:p-6"
      >
        <header className="grid gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="soft" size="sm">
              {t(`roles.${data.type}`)}
            </Badge>
            <Badge variant={statusBadge[data.status]} size="sm">
              {t(`state.${data.status}`)}
            </Badge>
            {data.resubmitted && (
              <Badge variant="notice" size="sm">
                {t("resubmitted")}
              </Badge>
            )}
          </div>
          <h2 id="app-title" className="text-h3 font-extrabold text-heading">
            {data.name}
          </h2>
          <p className="text-sm text-body">{t("submittedOn", { date: date(data.submittedAt) })}</p>
        </header>

        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[160px_minmax(0,1fr)]">
          {rows.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="font-bold text-body">{k}</dt>
              <dd className="break-words text-heading">{v}</dd>
            </div>
          ))}
        </dl>

        <section aria-labelledby="app-services" className="grid gap-2">
          <h3 id="app-services" className="text-lg font-extrabold text-heading">
            {to("servicesLabel")}
          </h3>
          <ul className="flex flex-wrap gap-2">
            {data.services.map((s) => (
              <li key={s}>
                <Badge variant="neutral">{to(`services.${s}` as never)}</Badge>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="app-hours" className="grid gap-2">
          <h3 id="app-hours" className="text-lg font-extrabold text-heading">
            {to("hours")}
          </h3>
          {data.is24h ? (
            <p className="text-sm font-bold text-heading">{t("open24h")}</p>
          ) : (
            <dl className="grid grid-cols-[120px_minmax(0,1fr)] gap-y-1 text-sm">
              {Array.from({ length: 7 }, (_, day) => {
                const ranges = data.hours.filter((h) => h.weekday === day)
                return (
                  <div key={day} className="contents">
                    <dt className="font-bold text-body">{dayName(day)}</dt>
                    <dd className={ranges.length ? "text-heading" : "text-body"}>
                      {ranges.length ? ranges.map((r) => `${r.opensAt}–${r.closesAt}`).join(", ") : to("closed")}
                    </dd>
                  </div>
                )
              })}
            </dl>
          )}
        </section>
      </article>

      <div className="grid gap-4 xl:grid-cols-2">
        <section aria-labelledby="app-applicant" className="rounded-card border border-border bg-background p-5">
          <h3 id="app-applicant" className="text-lg font-extrabold text-heading">
            {t("applicant")}
          </h3>
          <p className="mt-2 font-extrabold text-heading">{data.applicant.name}</p>
          <p className="text-sm break-all text-body">{data.applicant.email}</p>
          <ul className="mt-2 grid gap-0.5 text-sm text-heading">
            <li>{t("memberSince", { date: date(data.applicant.createdAt) })}</li>
            <li>{t("listingCount", { count: data.applicant.listings })}</li>
            <li>{data.applicant.emailVerified ? t("emailVerified") : t("emailNotVerified")}</li>
          </ul>
          <Link
            href={{ pathname: "/admin/users", query: { kullanici: data.applicant.id } }}
            className="mt-3 inline-flex min-h-tap items-center font-extrabold text-primary underline underline-offset-4"
          >
            {t("openUser")}
          </Link>
        </section>

        {data.status === "pending" ? (
          <section
            aria-labelledby="app-decision"
            className="grid content-start gap-3 rounded-card border-2 border-heading bg-background p-5"
          >
            <h3 id="app-decision" className="text-lg font-extrabold text-heading">
              {t("decision")}
            </h3>
            <p className="text-sm text-body">{t("decisionHint")}</p>
            {data.resubmitted && data.rejectionReason && (
              <p className="rounded-xl bg-notice-soft px-3 py-2 text-sm text-notice-text">
                <span className="font-bold">{t("previousReason")}:</span> {data.rejectionReason}
              </p>
            )}
            <ApplicationActions key={data.id} id={data.id} name={data.name} type={data.type} />
          </section>
        ) : (
          <section aria-labelledby="app-result" className="rounded-card border border-border bg-background p-5">
            <h3 id="app-result" className="text-lg font-extrabold text-heading">
              {t("result")}
            </h3>
            <p className="mt-2 text-sm text-heading">
              {t(data.status === "approved" ? "approvedBy" : "rejectedBy", {
                name: data.reviewer ?? "—",
                date: data.reviewedAt ? date(data.reviewedAt) : "—",
              })}
            </p>
            {data.status === "rejected" && data.rejectionReason && (
              <p className="mt-2 text-sm text-heading">
                <span className="font-bold">{t("reasonLabel")}:</span> {data.rejectionReason}
              </p>
            )}
          </section>
        )}
      </div>
    </>
  )
}
