import type { ListingStatus, ReviewFlag } from "@pati-dostu/validators"
import { AlertTriangle, Check, Clock, ExternalLink, Info } from "lucide-react"
import type { Metadata } from "next"
import { getFormatter, getLocale, getTranslations } from "next-intl/server"

import { PdMark } from "@/components/brand/logo"
import { AdminTopBar } from "@/components/layout/admin/admin-top-bar"
import { ListingTypeBadge } from "@/components/listing/listing-type-badge"
import { Badge } from "@/components/ui/badge"
import { Link } from "@/i18n/navigation"
import { requireAdmin } from "@/lib/admin"
import type { ListingDetailData } from "@/lib/listings"
import { apiServer } from "@/lib/server-api"
import { cn } from "@/lib/utils"

import { DecisionPanel } from "./decision-panel"
import { parseReviewQuery, type ReviewFilter, reviewHref, type ReviewState } from "./query"
import { QueueSort } from "./queue-sort"
import type { RejectionReasonOption, ReviewInfo, ReviewQueue, ReviewQueueItem } from "./types"

type SearchParams = Record<string, string | string[] | undefined>
type ContentReason = "phone" | "email" | "url" | "iban" | "price" | "banned_term"

/** Sekme başlığı: "İlan onayı". */
export async function reviewMetadata(): Promise<Metadata> {
  const t = await getTranslations("AdminReview")
  return { title: t("title") }
}

const FLAG_BADGE: Record<ReviewFlag, "neutral" | "danger" | "warning" | "soft"> = {
  new_user: "neutral",
  content: "danger",
  similar: "warning",
  organization: "neutral",
  resubmitted: "soft",
}

/** Bekleme süresi kısa biçimde ("40 dk", "9 sa", "3 gün"): çeviri anahtarı ve sayı. */
function elapsed(from: string | null, now: number) {
  if (!from) return null
  const min = Math.max(0, Math.round((now - Date.parse(from)) / 60_000))
  if (min < 60) return { key: "elapsedMin" as const, n: min }
  const h = Math.round(min / 60)
  return h < 48 ? { key: "elapsedHour" as const, n: h } : { key: "elapsedDay" as const, n: Math.round(h / 24) }
}

/** Bireysel üyede "Zeynep D.", kurum hesabında tam ad (tasarım). */
function shortName(owner: { name: string; role: string }): string {
  if (owner.role === "clinic" || owner.role === "shelter") return owner.name
  const [first, ...rest] = owner.name.trim().split(/\s+/)
  const last = rest.at(-1)
  return last ? `${first} ${last[0]}.` : (first ?? owner.name)
}

/**
 * Admin › İlan onayı (tasarım 07-admin/02, mobil 04). Solda kuyruk (sayı, sıralama, Tümü / İşaretli / Kurum /
 * Düzenlenmiş süzgeçleri; satırda kapak, tür, bekleme süresi, başlık, gönderen, işaretler), sağda seçili ilanın
 * incelemesi (fotoğraflar, özellikler, açıklama), otomatik kontroller, ilan sahibi ve karar. Seçim adreste (`ilan` =
 * ilan no); seçilmemişse kuyruğun ilki. Mobilde kuyruk gizli: ilanlar sırayla incelenir, üst çubukta "1 / 12".
 * Oturum ve adres okuduğu için <Suspense> içinde.
 */
export async function ReviewView({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdmin()
  const locale = await getLocale()
  const state = parseReviewQuery(await searchParams)
  const [t, queue, reasons] = await Promise.all([
    getTranslations("AdminReview"),
    apiServer<ReviewQueue>(`/admin/listings/queue?filter=${state.filter}&sort=${state.sort}&locale=${locale}`),
    apiServer<RejectionReasonOption[]>(`/admin/listings/rejection-reasons?locale=${locale}`),
  ])
  if (!queue || !reasons) throw new Error("İlan onay kuyruğu okunamadı")
  const items = queue.items
  const selectedNo = state.listingNo ?? items[0]?.listingNo ?? null
  const index = items.findIndex((i) => i.listingNo === selectedNo)
  const detail = selectedNo ? await apiServer<ListingDetailData>(`/listings/${selectedNo}?locale=${locale}`) : null
  const info = detail ? await apiServer<ReviewInfo>(`/admin/listings/${detail.id}/review`) : null
  const now = new Date().getTime()
  const counter = index >= 0 ? t("counter", { n: index + 1, total: items.length }) : null

  return (
    <>
      <AdminTopBar
        title={t("title")}
        crumbs={[{ label: t("title") }]}
        mobileEnd={counter && <span className="font-extrabold text-secondary">{counter}</span>}
      />
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-5 px-4 pt-4 pb-28 lg:grid-cols-[320px_minmax(0,1fr)] lg:px-7 lg:py-6">
        <QueuePanel queue={queue} state={state} selectedNo={selectedNo} now={now} />
        {detail && info ? (
          <div className="grid gap-4">
            <DetailCard detail={detail} info={info} />
            <div className="grid gap-4 xl:grid-cols-2">
              <ChecksCard info={info} now={now} />
              <OwnerCard info={info} />
            </div>
            <DecisionPanel
              listingId={detail.id}
              pending={detail.status === "pending"}
              reasons={reasons}
              state={state}
              nextNo={index >= 0 ? (items[index + 1]?.listingNo ?? null) : (items[0]?.listingNo ?? null)}
              prevNo={index > 0 ? (items[index - 1]?.listingNo ?? null) : null}
            />
          </div>
        ) : (
          <div className="grid justify-items-center gap-3 rounded-card border border-border bg-background px-6 py-16 text-center">
            <PdMark className="size-16 opacity-40" />
            <p className="text-xl font-extrabold text-heading">
              {selectedNo && items.length > 0 ? t("notFound") : t("emptyTitle")}
            </p>
            <p className="text-body">{t("emptyText")}</p>
          </div>
        )}
      </div>
    </>
  )
}

/** Kuyruk kutusu (masaüstü): başlık + sıralama, süzgeç çipleri, ilan satırları. */
async function QueuePanel({
  queue,
  state,
  selectedNo,
  now,
}: {
  queue: ReviewQueue
  state: ReviewState
  selectedNo: number | null
  now: number
}) {
  const t = await getTranslations("AdminReview")
  const filters: Array<{ key: ReviewFilter; label: string; count: number }> = [
    { key: "all", label: t("filter.all"), count: queue.counts.all },
    { key: "flagged", label: t("filter.flagged"), count: queue.counts.flagged },
    { key: "organization", label: t("filter.organization"), count: queue.counts.organization },
    { key: "resubmitted", label: t("filter.resubmitted"), count: queue.counts.resubmitted },
  ]
  return (
    <section
      aria-labelledby="queue-title"
      className="overflow-hidden rounded-card border border-border bg-background max-lg:hidden lg:sticky lg:top-24"
    >
      <div className="grid gap-3 border-b border-border p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 id="queue-title" className="text-lg font-extrabold text-heading">
            {t("queueTitle", { count: queue.counts.all })}
          </h2>
          <QueueSort state={state} />
        </div>
        <nav aria-label={t("filterLabel")}>
          <ul className="flex flex-wrap gap-2">
            {filters.map((f) => (
              <li key={f.key}>
                <Link
                  href={reviewHref({ ...state, filter: f.key, listingNo: null })}
                  aria-current={state.filter === f.key ? "page" : undefined}
                  className={cn(
                    "inline-flex min-h-9 items-center gap-1 rounded-full border px-3 text-sm font-extrabold",
                    state.filter === f.key
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-heading hover:border-primary"
                  )}
                >
                  {f.label} {f.count}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      {queue.items.length === 0 ? (
        <p className="p-5 text-body">{t("queueEmpty")}</p>
      ) : (
        <ul className="max-h-[calc(100dvh-16rem)] divide-y divide-border overflow-y-auto">
          {queue.items.map((item) => (
            <QueueRow key={item.id} item={item} state={state} current={item.listingNo === selectedNo} now={now} />
          ))}
        </ul>
      )}
    </section>
  )
}

/** Kuyruk satırı: kapak, tür, bekleme süresi, başlık, gönderen, işaretler; satırın tamamı bağlantı. */
async function QueueRow({
  item,
  state,
  current,
  now,
}: {
  item: ReviewQueueItem
  state: ReviewState
  current: boolean
  now: number
}) {
  const t = await getTranslations("AdminReview")
  const wait = elapsed(item.submittedAt, now)
  return (
    <li
      className={cn(
        "relative grid grid-cols-[56px_minmax(0,1fr)] gap-3 border-l-4 px-3 py-3",
        current ? "border-primary bg-smoke" : "border-transparent hover:bg-canvas"
      )}
    >
      {item.coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- depo adresi (listings/)
        <img src={item.coverUrl} alt="" className="size-14 rounded-lg bg-smoke-2 object-cover" />
      ) : (
        <div aria-hidden="true" className="flex size-14 items-center justify-center rounded-lg bg-smoke-2">
          <PdMark className="size-7 opacity-30 grayscale" />
        </div>
      )}
      <div className="grid min-w-0 gap-1">
        <div className="flex items-center justify-between gap-2">
          <ListingTypeBadge type={item.type} size="sm" />
          <span className="flex items-center gap-1 text-xs font-bold text-primary">
            <Clock aria-hidden="true" className="size-3.5" />
            <span className="sr-only">{t("waiting")}</span>
            {wait ? t(wait.key, { n: wait.n }) : "—"}
          </span>
        </div>
        <Link
          href={reviewHref({ ...state, listingNo: item.listingNo })}
          aria-current={current ? "true" : undefined}
          scroll={false}
          className="leading-snug font-extrabold text-title after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-[-2px] focus-visible:after:outline-ring"
        >
          {item.title}
        </Link>
        <span className="truncate text-sm text-primary">{shortName(item.owner)}</span>
        {item.flags.length > 0 && (
          <ul className="flex flex-wrap gap-1">
            {item.flags.map((f) => (
              <li key={f}>
                <Badge variant={FLAG_BADGE[f]} size="sm">
                  {t(`flag.${f}`)}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  )
}

/** İnceleme kartı: tür, ilan no, gönderim zamanı, ilk/yeniden gönderim, fotoğraflar, özellikler, açıklama. */
async function DetailCard({ detail, info }: { detail: ListingDetailData; info: ReviewInfo }) {
  const [t, format, tl, td] = await Promise.all([
    getTranslations("AdminReview"),
    getFormatter(),
    getTranslations("Listing"),
    getTranslations("ListingDetail"),
  ])
  const lostFound = detail.type === "lost" || detail.type === "found"
  const rows: Array<[string, string]> = [
    [td("rowSpecies"), detail.species?.name ?? "—"],
    [td("rowBreed"), detail.breed?.name ?? "—"],
    [td("rowAge"), detail.ageGroup ? tl(`ageGroup.${detail.ageGroup}`) : "—"],
    [td("rowGender"), tl(`gender.${detail.gender}`)],
    [td("rowSize"), detail.size ? tl(`size.${detail.size}`) : "—"],
    [td("rowSource"), detail.source ? tl(`source.${detail.source}`) : "—"],
    [t("rowLocation"), [detail.city?.name, detail.district].filter(Boolean).join(", ") || "—"],
    [t("rowPhone"), detail.contact.showPhone ? t("phoneShown") : t("phoneHidden")],
  ]
  if (detail.name) rows.splice(2, 0, [td("rowName"), detail.name])
  if (lostFound && detail.lastSeenAddress)
    rows.push([td(detail.type === "lost" ? "rowLastSeenLost" : "rowLastSeenFound"), detail.lastSeenAddress])
  if (detail.microchipped && detail.microchipNumber) rows.push([td("rowMicrochip"), detail.microchipNumber])
  const features = (["vaccinated", "neutered", "microchipped", "childFriendly"] as const).filter((f) => detail[f])

  return (
    <article
      aria-labelledby="review-title"
      className="grid gap-4 rounded-card border border-border bg-background p-4 lg:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-sm text-body">
          <ListingTypeBadge type={detail.type} />
          {detail.status !== "pending" && (
            <Badge variant="neutral">{tl(`status.${detail.status as ListingStatus}`)}</Badge>
          )}
          <span>
            {t("meta", {
              no: detail.listingNo,
              date: info.submittedAt
                ? format.dateTime(new Date(info.submittedAt), { dateStyle: "medium", timeStyle: "short" })
                : "—",
            })}
            {" · "}
            {info.resubmitted ? t("resubmitted") : t("firstSubmission")}
          </span>
        </div>
        {detail.slug && (
          <Link
            href={{ pathname: "/listing/[slug]", params: { slug: `${detail.slug}-${detail.listingNo}` } }}
            target="_blank"
            className="inline-flex min-h-tap items-center gap-1.5 text-sm font-extrabold text-primary underline underline-offset-4 hover:no-underline"
          >
            {t("openOnSite")}
            <ExternalLink aria-hidden="true" className="size-4" />
            <span className="sr-only">{t("opensNewTab")}</span>
          </Link>
        )}
      </div>
      <h2 id="review-title" className="text-h3 font-extrabold text-heading">
        {detail.title}
      </h2>
      {detail.images.length > 0 ? (
        <ul
          aria-label={t("photos")}
          className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 lg:mx-0 lg:grid lg:grid-cols-3 lg:overflow-visible lg:px-0"
        >
          {detail.images.map((img, i) => (
            <li key={img.url} className="w-[70%] shrink-0 snap-start lg:w-auto">
              <a
                href={img.url}
                target="_blank"
                rel="noreferrer"
                className="block rounded-card focus-visible:outline-2 focus-visible:outline-ring"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- depo adresi (listings/) */}
                <img
                  src={img.url}
                  alt={t("photoAlt", { n: i + 1 })}
                  className="aspect-[4/3] w-full rounded-card bg-smoke-2 object-cover"
                />
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-card bg-smoke p-4 text-body">{t("noPhotos")}</p>
      )}
      <dl className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-xl bg-canvas px-3 py-2">
            <dt className="text-[13px] text-body">{label}</dt>
            <dd className="font-extrabold break-words text-heading">{value}</dd>
          </div>
        ))}
      </dl>
      {features.length > 0 && (
        <ul aria-label={td("features")} className="flex flex-wrap gap-2">
          {features.map((f) => (
            <li key={f}>
              <Badge variant="success">{tl(`feature.${f}`)}</Badge>
            </li>
          ))}
        </ul>
      )}
      <div className="grid gap-1">
        <h3 className="text-base font-extrabold text-heading">{td("description")}</h3>
        <p className="whitespace-pre-line text-body">{detail.description}</p>
      </div>
    </article>
  )
}

/** Otomatik kontroller (basit — karar): içerik taraması, benzer ilan, yeni üye; kurum ve önceki not bilgi olarak. */
async function ChecksCard({ info, now }: { info: ReviewInfo; now: number }) {
  const t = await getTranslations("AdminReview")
  const days = Math.max(0, Math.floor((now - Date.parse(info.owner.createdAt)) / 86_400_000))
  const items: Array<{ ok: boolean | null; text: string }> = [
    info.contentMatches.length === 0
      ? { ok: true, text: t("checkContentOk") }
      : {
          ok: false,
          text: t("checkContent", {
            list: info.contentMatches
              .map(
                (m) =>
                  `${t(`field.${m.field as "title" | "description"}`)}: ${t(`reason.${m.reason as ContentReason}`)}`
              )
              .join(", "),
          }),
        },
    info.flags.includes("similar") ? { ok: false, text: t("checkSimilar") } : { ok: true, text: t("checkSimilarOk") },
    info.flags.includes("new_user")
      ? { ok: false, text: t("checkNewUser", { days }) }
      : { ok: true, text: t("checkNewUserOk", { days }) },
  ]
  if (info.flags.includes("organization")) items.push({ ok: null, text: t("checkOrganization") })
  return (
    <section
      aria-labelledby="checks-title"
      className="grid content-start gap-3 rounded-card border border-border bg-background p-5"
    >
      <h2 id="checks-title" className="text-lg font-extrabold text-heading">
        {t("checksTitle")}
      </h2>
      <ul className="grid gap-2">
        {items.map((item) => (
          <li key={item.text} className="flex items-start gap-2 text-[15px] text-heading">
            {item.ok === true ? (
              <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-success" />
            ) : item.ok === false ? (
              <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-warning-text" />
            ) : (
              <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
            )}
            <span>
              <span className="sr-only">
                {item.ok === true ? t("ok") : item.ok === false ? t("warning") : t("info")}:{" "}
              </span>
              {item.text}
            </span>
          </li>
        ))}
      </ul>
      {info.resubmitted && info.previousNote && (
        <p className="rounded-xl bg-canvas p-3 text-sm text-body">
          <strong className="font-extrabold text-heading">{t("previousNote")}</strong> {info.previousNote}
        </p>
      )}
    </section>
  )
}

/** İlan sahibi: ad · hesap türü, üyelik ve e-posta durumu, diğer ilan / şikâyet / red sayıları. */
async function OwnerCard({ info }: { info: ReviewInfo }) {
  const [t, format] = await Promise.all([getTranslations("AdminReview"), getFormatter()])
  const o = info.owner
  return (
    <section
      aria-labelledby="owner-title"
      className="grid content-start gap-2 rounded-card border border-border bg-background p-5"
    >
      <h2 id="owner-title" className="text-lg font-extrabold text-heading">
        {t("ownerTitle")}
      </h2>
      <p className="font-extrabold text-heading">
        {o.name} · {t(`role.${o.role}`)}
      </p>
      <p className="text-[15px] text-body">
        {t("memberSince", { date: format.dateTime(new Date(o.createdAt), { dateStyle: "medium" }) })} ·{" "}
        {o.emailVerified ? t("emailVerified") : t("emailUnverified")}
      </p>
      <p className="text-[15px] text-body">
        {t("ownerStats", { listings: o.otherListings, reports: o.reports, rejections: o.rejections })}
      </p>
      <p className="text-sm break-all text-body">{o.email}</p>
    </section>
  )
}
