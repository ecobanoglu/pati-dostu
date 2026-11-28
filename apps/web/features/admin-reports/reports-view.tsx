import type { ReportTarget } from "@pati-dostu/validators"
import { ArrowLeft, ExternalLink } from "lucide-react"
import type { Metadata } from "next"
import { getFormatter, getLocale, getTranslations } from "next-intl/server"

import { PdMark } from "@/components/brand/logo"
import { AdminTopBar } from "@/components/layout/admin/admin-top-bar"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Link } from "@/i18n/navigation"
import { requireAdmin } from "@/lib/admin"
import { apiServer } from "@/lib/server-api"
import { cn } from "@/lib/utils"

import { ActionPanel } from "./action-panel"
import { parseReportsQuery, reportsHref, type ReportsState } from "./query"
import type { ReportCase, ReportCasePage, ReportCaseRow } from "./types"

type SearchParams = Record<string, string | string[] | undefined>
type Reason =
  | "sale"
  | "fake"
  | "animal_abuse"
  | "inappropriate"
  | "spam"
  | "misinformation"
  | "harassment"
  | "fake_account"
  | "other"

/** 24 saati geçen açık dosyalar kırmızı gösterilir (tasarım). */
const LATE_MS = 24 * 3600_000

/** Sekme başlığı: "Şikayetler". */
export async function reportsMetadata(): Promise<Metadata> {
  const t = await getTranslations("AdminReports")
  return { title: t("title") }
}

/** Bireysel üyede "Kaan B.", tek kelimelik adda olduğu gibi (tasarım). */
function shortName(name: string): string {
  const [first, ...rest] = name.trim().split(/\s+/)
  const last = rest.at(-1)
  return last ? `${first} ${last[0]}.` : (first ?? name)
}

/** Geçen süre: dakika / saat / gün (çeviri anahtarı + sayı). */
function since(iso: string, now: number) {
  const min = Math.max(0, Math.round((now - Date.parse(iso)) / 60_000))
  if (min < 60) return { key: "elapsedMin" as const, n: min }
  const h = Math.round(min / 60)
  return h < 48 ? { key: "elapsedHour" as const, n: h } : { key: "elapsedDay" as const, n: Math.round(h / 24) }
}

/**
 * Admin › Şikayetler (tasarım 07-admin/05). Solda dosyalar (hedef başına bir; Açık / Sonuçlanan sekmeleri, tür
 * süzgeci; satırda tür, neden, bağlam, kişi sayısı, bekleme süresi — 24 saati geçen kırmızı), sağda seçili dosya:
 * içerik alıntısı ve bağlantısı, şikâyet notları, şikâyet edilen kullanıcı ve geçmişi, ilgili kayıtlar (onay bekleyen
 * ilanları), işlem kutusu. Seçim adreste (`dosya`); seçilmemişse listenin ilki. Mobilde liste ve dosya ayrı ekran.
 * Oturum ve adres okuduğu için <Suspense> içinde.
 */
export async function ReportsView({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdmin()
  const locale = await getLocale()
  const state = parseReportsQuery(await searchParams)
  const api = new URLSearchParams({ status: state.status, page: String(state.page), locale })
  if (state.target) api.set("target", state.target)
  const [t, tr, page] = await Promise.all([
    getTranslations("AdminReports"),
    getTranslations("Reports"),
    apiServer<ReportCasePage>(`/admin/reports?${api.toString()}`),
  ])
  if (!page) throw new Error("Şikâyet listesi okunamadı")
  const selected =
    state.selected ?? (page.items[0] ? { type: page.items[0].targetType, id: page.items[0].targetId } : null)
  const detail = selected
    ? await apiServer<ReportCase>(`/admin/reports/${selected.type}/${encodeURIComponent(selected.id)}`)
    : null
  const index = selected
    ? page.items.findIndex((i) => i.targetType === selected.type && i.targetId === selected.id)
    : -1
  const next = page.items[index + 1] ?? page.items[index - 1] ?? null
  const now = new Date().getTime()
  const targets: Array<ReportTarget | null> = [null, "listing", "comment", "user", "topic", "reply"]

  return (
    <>
      <AdminTopBar title={t("title")} crumbs={[{ label: t("title") }]} />
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-5 px-4 py-5 lg:grid-cols-[400px_minmax(0,1fr)] lg:px-7 lg:py-6">
        {/* Liste */}
        <section
          aria-labelledby="cases-title"
          className={cn(
            "overflow-hidden rounded-card border border-border bg-background lg:sticky lg:top-24",
            state.selected && "max-lg:hidden"
          )}
        >
          <h2 id="cases-title" className="sr-only">
            {t("casesTitle")}
          </h2>
          <nav aria-label={t("statusFilter")} className="border-b border-border">
            <ul className="flex gap-1 px-3">
              {(["open", "closed"] as const).map((s) => (
                <li key={s}>
                  <Link
                    href={reportsHref({ ...state, status: s, selected: null, page: 1 })}
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
          <nav aria-label={t("targetFilter")} className="overflow-x-auto border-b border-border px-3 py-2">
            <ul className="flex min-w-max gap-1.5">
              {targets.map((tg) => {
                const active = state.target === tg
                const n = tg ? (page.counts.byTarget[tg] ?? 0) : null
                return (
                  <li key={tg ?? "all"}>
                    <Link
                      href={reportsHref({ ...state, target: tg, selected: null, page: 1 })}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "inline-flex min-h-9 items-center gap-1 rounded-full px-3 text-sm font-extrabold",
                        active ? "bg-primary text-primary-foreground" : "text-heading hover:bg-smoke"
                      )}
                    >
                      {tg ? tr(`targets.${tg}`) : t("all")}
                      {n !== null && n > 0 && <span className={active ? undefined : "text-body"}>{n}</span>}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>
          {page.items.length === 0 ? (
            <p className="p-5 text-body">{state.status === "open" ? t("emptyOpen") : t("emptyClosed")}</p>
          ) : (
            <ul className="divide-y divide-border">
              {page.items.map((item) => (
                <CaseRow
                  key={`${item.targetType}.${item.targetId}`}
                  item={item}
                  state={state}
                  current={selected?.type === item.targetType && selected.id === item.targetId}
                  now={now}
                />
              ))}
            </ul>
          )}
          <p className="border-t border-border px-4 py-3 text-[13px] text-body">{t("listNote")}</p>
        </section>

        {/* Dosya */}
        <div className={cn("grid gap-4", !state.selected && "max-lg:hidden")}>
          <Link
            href={reportsHref({ ...state, selected: null })}
            className="inline-flex min-h-tap items-center gap-1.5 font-extrabold text-primary lg:hidden"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            {t("backToList")}
          </Link>
          {detail ? (
            <>
              <CaseCard data={detail} now={now} />
              <div className="grid gap-4 xl:grid-cols-2">
                <SubjectCard data={detail} now={now} />
                <RelatedCard data={detail} />
              </div>
              {detail.open ? (
                <ActionPanel
                  key={`${detail.targetType}.${detail.targetId}`}
                  data={detail}
                  state={state}
                  nextId={next ? { type: next.targetType, id: next.targetId } : null}
                />
              ) : (
                <ClosedCard data={detail} />
              )}
            </>
          ) : (
            <div className="grid justify-items-center gap-3 rounded-card border border-border bg-background px-6 py-16 text-center">
              <PdMark className="size-16 opacity-40" />
              <p className="text-xl font-extrabold text-heading">{t("noCase")}</p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

/** Liste satırı: tür, neden, bağlam, kişi sayısı, bekleme süresi; satırın tamamı bağlantı. */
async function CaseRow({
  item,
  state,
  current,
  now,
}: {
  item: ReportCaseRow
  state: ReportsState
  current: boolean
  now: number
}) {
  const [t, tr] = await Promise.all([getTranslations("AdminReports"), getTranslations("Reports")])
  const wait = since(item.firstAt, now)
  const late = state.status === "open" && now - Date.parse(item.firstAt) > LATE_MS
  const context =
    item.targetType === "listing"
      ? `PD-${item.listingNo}`
      : item.targetType === "comment"
        ? t("commentUnder", { no: item.listingNo ?? 0, name: shortName(item.subjectName) })
        : item.targetType === "user"
          ? shortName(item.subjectName)
          : item.title
  return (
    <li
      className={cn(
        "relative grid grid-cols-[84px_minmax(0,1fr)_auto] items-center gap-3 border-l-4 px-3 py-3",
        current ? "border-primary bg-smoke" : "border-transparent hover:bg-canvas"
      )}
    >
      <Badge variant="neutral" size="sm" className="justify-self-start">
        {tr(`targets.${item.targetType}`)}
      </Badge>
      <div className="min-w-0">
        <Link
          href={reportsHref({ ...state, selected: { type: item.targetType, id: item.targetId } })}
          aria-current={current ? "true" : undefined}
          scroll={false}
          className="font-extrabold text-heading after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-[-2px] focus-visible:after:outline-ring"
        >
          {tr(`reasons.${item.reason as Reason}`)}
        </Link>
        <p className="truncate text-sm text-primary">{context}</p>
        {item.outcome && <p className="text-xs font-bold text-body">{t(`outcome.${item.outcome}`)}</p>}
      </div>
      <div className="grid justify-items-end gap-0.5 text-sm">
        <span className="font-extrabold text-heading">{t("people", { count: item.reports })}</span>
        <span className={cn("font-bold", late ? "text-danger" : "text-body")}>
          <span className="sr-only">{late ? t("lateLabel") : t("waitLabel")} </span>
          {t(wait.key, { n: wait.n })}
        </span>
      </div>
    </li>
  )
}

/** Dosya kartı: tür + neden, kişi sayısı, başlık, içerik alıntısı + bağlantısı, şikâyet notları. */
async function CaseCard({ data, now }: { data: ReportCase; now: number }) {
  const [t, tr, format] = await Promise.all([
    getTranslations("AdminReports"),
    getTranslations("Reports"),
    getFormatter(),
  ])
  const first = data.reports[0]!
  const wait = since(first.createdAt, now)
  const name = data.subject ? shortName(data.subject.name) : "—"
  const heading =
    data.targetType === "listing"
      ? t("heading.listing", { title: data.title })
      : data.targetType === "user"
        ? t("heading.user", { name: data.subject?.name ?? data.title })
        : data.targetType === "comment"
          ? t("heading.comment", { name, title: data.listing?.title ?? "" })
          : data.targetType === "topic"
            ? t("heading.topic", { name, title: data.title })
            : t("heading.reply", { name, title: data.topic?.title ?? "" })
  const link =
    data.listing && data.targetType !== "user"
      ? {
          href: {
            pathname: "/listing/[slug]" as const,
            params: { slug: `${data.listing.slug ?? "ilan"}-${data.listing.no}` },
            ...(data.targetType === "comment" ? { hash: "comments" } : {}),
          },
          label: t("openListing"),
        }
      : data.topic
        ? {
            href: {
              pathname: "/community/[category]/[slug]" as const,
              params: { category: data.topic.categorySlug, slug: data.topic.slug },
            },
            label: t("openTopic"),
          }
        : null
  const open = data.reports.filter((r) => r.status === "open")
  return (
    <article
      aria-labelledby="case-title"
      className="grid gap-4 rounded-card border border-border bg-background p-5 lg:p-6"
    >
      <div className="flex flex-wrap items-center gap-2 text-sm text-body">
        <Badge variant="neutral" size="sm">
          {tr(`targets.${data.targetType}`)}
        </Badge>
        <Badge variant="danger" size="sm">
          {tr(`reasons.${data.reason as Reason}`)}
        </Badge>
        <span>{t("caseMeta", { count: open.length || data.reports.length, time: t(wait.key, { n: wait.n }) })}</span>
      </div>
      <h2 id="case-title" className="text-h4 font-extrabold text-heading">
        {heading}
      </h2>
      {(data.body || data.targetType === "listing") && (
        <blockquote className="grid gap-2 rounded-r-xl border-l-4 border-danger bg-canvas p-4">
          <p className="whitespace-pre-line text-heading">“{data.body ?? data.title}”</p>
          <p className="flex flex-wrap items-center gap-x-2 text-[13px] text-body">
            {!data.live && (
              <Badge variant="neutral" size="sm">
                {t("contentGone")}
              </Badge>
            )}
            {link && (
              <Link
                href={link.href}
                target="_blank"
                className="inline-flex min-h-tap items-center gap-1 font-bold text-primary underline underline-offset-4"
              >
                {link.label}
                <ExternalLink aria-hidden="true" className="size-3.5" />
                <span className="sr-only">{t("opensNewTab")}</span>
              </Link>
            )}
          </p>
        </blockquote>
      )}
      <section aria-labelledby="notes-title" className="grid gap-2">
        <h3 id="notes-title" className="text-base font-extrabold text-heading">
          {t("notesTitle")}
        </h3>
        <ul className="divide-y divide-border border-t border-border">
          {data.reports.map((r) => (
            <li key={r.id} className="grid gap-0.5 py-2.5 text-[15px]">
              <p>
                <strong className="font-extrabold text-heading">{shortName(r.reporter.name)}:</strong>{" "}
                <span className="text-body">{r.details || tr(`reasons.${r.reason as Reason}`)}</span>
              </p>
              <p className="text-xs text-body">
                {format.dateTime(new Date(r.createdAt), { dateStyle: "medium", timeStyle: "short" })}
                {r.status !== "open" && ` · ${t(`reportStatus.${r.status as "resolved" | "dismissed"}`)}`}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </article>
  )
}

/** Şikâyet edilen kullanıcı: ad · üyelik süresi, ilan / önceki şikâyet / uyarı sayıları, askı durumu. */
async function SubjectCard({ data, now }: { data: ReportCase; now: number }) {
  const [t, format] = await Promise.all([getTranslations("AdminReports"), getFormatter()])
  const s = data.subject
  return (
    <section
      aria-labelledby="subject-title"
      className="grid content-start gap-1.5 rounded-card border border-border bg-background p-5"
    >
      <h2 id="subject-title" className="text-lg font-extrabold text-heading">
        {t("subjectTitle")}
      </h2>
      {s ? (
        <>
          <p className="font-extrabold text-heading">
            {s.name} · {t("memberDays", { days: Math.floor((now - Date.parse(s.createdAt)) / 86_400_000) })}
          </p>
          <p className="text-[15px] text-body">
            {t("subjectStats", {
              listings: s.listings,
              pending: s.pendingListings.length,
              reports: s.previousReports,
              warnings: s.warnings,
            })}
          </p>
          <p className="text-sm break-all text-body">{s.email}</p>
          <Link
            href={{ pathname: "/admin/users", query: { kullanici: s.id } }}
            className="inline-flex min-h-tap items-center font-bold text-primary underline underline-offset-4"
          >
            {t("openUser")}
          </Link>
          {s.role === "admin" && <Badge variant="soft">{t("isAdmin")}</Badge>}
          {s.deleted && <Badge variant="neutral">{t("deletedUser")}</Badge>}
          {s.banned && (
            <Badge variant="danger">
              {s.banExpires
                ? t("bannedUntil", { date: format.dateTime(new Date(s.banExpires), { dateStyle: "medium" }) })
                : t("bannedPermanent")}
            </Badge>
          )}
        </>
      ) : (
        <p className="text-body">—</p>
      )}
    </section>
  )
}

/** İlgili kayıtlar: kullanıcının onay bekleyen ilanları (İlan onayına bağlantı) ve içeriğin durumu. */
async function RelatedCard({ data }: { data: ReportCase }) {
  const t = await getTranslations("AdminReports")
  const pending = data.subject?.pendingListings ?? []
  return (
    <section
      aria-labelledby="related-title"
      className="grid content-start gap-2 rounded-card border border-border bg-background p-5"
    >
      <h2 id="related-title" className="text-lg font-extrabold text-heading">
        {t("relatedTitle")}
      </h2>
      {pending.length === 0 ? (
        <p className="text-[15px] text-body">{t("relatedNone")}</p>
      ) : (
        <ul className="grid gap-1.5">
          {pending.map((p) => (
            <li key={p.id} className="text-[15px] text-body">
              {t.rich("relatedPending", {
                no: p.no,
                link: (chunks) => (
                  <Link
                    href={{ pathname: "/admin/listing-review", query: { ilan: String(p.no) } }}
                    className="font-bold text-primary underline underline-offset-4"
                  >
                    {chunks}
                  </Link>
                ),
              })}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/** Sonuçlanmış dosya: sonuç ve iç notlar (işlem kutusu yerine). */
async function ClosedCard({ data }: { data: ReportCase }) {
  const t = await getTranslations("AdminReports")
  const dismissed = data.reports.every((r) => r.status === "dismissed")
  const notes = [...new Set(data.reports.map((r) => r.resolutionNote).filter(Boolean))]
  return (
    <section aria-labelledby="closed-title" className="grid gap-2 rounded-card border border-border bg-background p-5">
      <h2 id="closed-title" className="text-lg font-extrabold text-heading">
        {t(dismissed ? "outcome.no_violation" : "outcome.action_taken")}
      </h2>
      {notes.length > 0 ? (
        notes.map((n) => (
          <p key={n} className="text-[15px] text-body">
            <strong className="font-extrabold text-heading">{t("internalNote")}</strong> {n}
          </p>
        ))
      ) : (
        <p className="text-[15px] text-body">{t("noNote")}</p>
      )}
      <Link
        href={reportsHref({ status: "open", target: null, selected: null, page: 1 })}
        className={cn(buttonVariants({ variant: "outline" }), "justify-self-start")}
      >
        {t("toOpen")}
      </Link>
    </section>
  )
}
