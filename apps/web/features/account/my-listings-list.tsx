"use client"

import type { ReviewableField } from "@pati-dostu/validators"
import { Check, EllipsisVertical, Pencil, Trash2, X } from "lucide-react"
import { useFormatter, useTranslations } from "next-intl"
import { useState } from "react"

import { ConfirmDialog } from "@/components/dialog/confirm-dialog"
import { PdMark } from "@/components/brand/logo"
import { listingSlug } from "@/components/listing/listing-card"
import { ListingTypeBadge } from "@/components/listing/listing-type-badge"
import { ShareDialog } from "@/components/listing/share-dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { buttonVariants } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Link, useRouter } from "@/i18n/navigation"
import { apiFetch } from "@/lib/api-browser"
import { useErrorMessage } from "@/lib/errors"
import type { MyListingData } from "@/lib/listings"
import { reviewFieldLabel } from "@/lib/review-fields"
import { cn } from "@/lib/utils"

type Status = MyListingData["status"]
type Tab = "all" | "active" | "pending" | "changes_requested" | "rejected" | "draft" | "adopted" | "closed"
type Action = { kind: "adopted" | "closed" | "delete"; listing: MyListingData }

/** Sekme sırası (tasarım 11): tümü, yayında, onay bekliyor, düzeltme istendi, reddedildi, taslak, sahiplendirildi, kapatıldı. */
const TABS: Tab[] = ["all", "active", "pending", "changes_requested", "rejected", "draft", "adopted", "closed"]

/** Durum rozetinin renkleri (globals.css çiftleri; metin kontrastı ≥ 4.5:1). */
const STATUS_TONE: Record<string, string> = {
  active: "bg-success-soft text-success-text",
  pending: "bg-warning-soft text-warning-text",
  changes_requested: "bg-notice-soft text-notice-text",
  rejected: "bg-danger-soft text-danger",
  draft: "bg-smoke-2 text-body",
  adopted: "bg-smoke text-primary",
  closed: "bg-smoke-2 text-body",
}

/** Kayıp / bulunan ilanında "sahiplendirildi" yerine "kavuştu" denir (aynı `adopted` durumu). */
const isReunion = (type: string) => type === "lost" || type === "found"

/**
 * Hesabım › İlanlarım listesi (tasarım 01-sayfalar/11, 28): durum sekmeleri (yalnız ilanı olanlar), reddedilen /
 * düzeltme istenen uyarısı ve satırlar. Satırda durum rozeti, tür, tarih, duruma göre alt bilgi (görüntülenme, red
 * gerekçesi, admin notu) ve eylemler: düzenle, paylaşım görseli, sahiplendirildi/kavuştu, yayından kaldır, sil.
 * Masaüstünde ana eylemler buton, diğerleri "⋯" menüsünde; mobilde hepsi "⋯" menüsünde. Geri alınamaz işlemler
 * onay penceresiyle; başarılı olunca sayfa sunucudan yeniden okunur.
 */
export function MyListingsList({ items }: { items: MyListingData[] }) {
  const t = useTranslations("MyListings")
  const tl = useTranslations("Listing")
  const tf = useTranslations("ListingForm")
  const format = useFormatter()
  const errorMessage = useErrorMessage()
  const router = useRouter()
  const [tab, setTab] = useState<Tab>("all")
  const [action, setAction] = useState<Action | null>(null)
  const [pending, setPending] = useState(false)
  const [feedback, setFeedback] = useState<{ text: string; error?: boolean } | null>(null)

  const counts = Object.fromEntries(
    TABS.map((key) => [key, key === "all" ? items.length : items.filter((i) => i.status === key).length])
  ) as Record<Tab, number>
  const tabs = TABS.filter((key) => key === "all" || counts[key] > 0)
  const shown = tab === "all" ? items : items.filter((i) => i.status === tab)
  const title = (l: MyListingData) => l.title ?? t("untitled")

  /** Onaylanan işlemi API'ye gönderir; başarılıysa listeyi sunucudan yeniler. */
  async function run() {
    if (!action) return
    setPending(true)
    const { listing, kind } = action
    const { error } =
      kind === "delete"
        ? await apiFetch(`/listings/${listing.id}`, { method: "DELETE" })
        : await apiFetch(`/listings/${listing.id}/status`, { method: "POST", body: JSON.stringify({ status: kind }) })
    setPending(false)
    setAction(null)
    setFeedback(error ? { text: errorMessage(error.code, error.details), error: true } : { text: t("done") })
    if (!error) router.refresh()
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-card border border-border bg-background px-6 py-14 text-center">
        <PdMark className="size-16 opacity-30 grayscale" />
        <h2 className="text-xl font-extrabold text-heading">{t("emptyTitle")}</h2>
        <p className="max-w-md text-body">{t("emptyText")}</p>
        <Link href="/post-listing" className={cn(buttonVariants({ variant: "secondary" }), "mt-2")}>
          {t("newListing")}
        </Link>
      </div>
    )
  }

  const confirm = action && {
    title:
      action.kind === "delete"
        ? t("confirmDeleteTitle")
        : action.kind === "closed"
          ? t("confirmCloseTitle")
          : isReunion(action.listing.type)
            ? t("confirmReunitedTitle")
            : t("confirmAdoptedTitle"),
    text:
      action.kind === "delete"
        ? t("confirmDeleteText", { title: title(action.listing) })
        : action.kind === "closed"
          ? t("confirmCloseText")
          : t("confirmAdoptedText"),
    label:
      action.kind === "delete"
        ? t("delete")
        : action.kind === "closed"
          ? t("close")
          : isReunion(action.listing.type)
            ? t("markReunited")
            : t("markAdopted"),
  }

  return (
    <>
      {(counts.rejected > 0 || counts.changes_requested > 0) && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>
            {counts.rejected > 0 && (
              <p>
                <b>{t("alertRejected", { count: counts.rejected })}</b> {t("alertRejectedText")}
              </p>
            )}
            {counts.changes_requested > 0 && (
              <p>
                <b>{t("alertChanges", { count: counts.changes_requested })}</b> {t("alertChangesText")}
              </p>
            )}
          </AlertDescription>
        </Alert>
      )}

      <p
        role="status"
        className={cn("mb-3 text-sm font-bold empty:hidden", feedback?.error ? "text-danger" : "text-success-text")}
      >
        {feedback?.text}
      </p>

      <div className="rounded-card border border-border bg-background">
        <div
          role="group"
          aria-label={t("tabsLabel")}
          className="flex gap-1 overflow-x-auto border-b border-border px-2 [scrollbar-width:none] lg:px-3"
        >
          {tabs.map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={tab === key}
              onClick={() => setTab(key)}
              className={cn(
                "-mb-px flex min-h-13 shrink-0 items-center gap-2 border-b-[3px] px-3 text-[15px] font-extrabold whitespace-nowrap",
                "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
                tab === key ? "border-primary text-primary" : "border-transparent text-heading hover:text-primary"
              )}
            >
              {key === "all" ? t("tabAll") : tl(`status.${key}`)}
              <span className="rounded-full bg-smoke-2 px-2 py-0.5 text-xs text-heading">{counts[key]}</span>
            </button>
          ))}
        </div>

        {shown.length === 0 ? (
          <p className="p-6 text-body">{t("emptyTab")}</p>
        ) : (
          <ul className="divide-y divide-border">
            {shown.map((l) => (
              <Row
                key={l.id}
                listing={l}
                title={title(l)}
                date={format.dateTime(new Date(l.publishedAt ?? l.updatedAt), { dateStyle: "long" })}
                fields={(l.reviewFields ?? []).map((f) => tf(reviewFieldLabel[f as ReviewableField])).join(", ")}
                onAction={(kind) => {
                  setFeedback(null)
                  setAction({ kind, listing: l })
                }}
              />
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(action)}
        title={confirm?.title ?? ""}
        text={confirm?.text ?? ""}
        confirmLabel={confirm?.label ?? ""}
        cancelLabel={t("cancel")}
        destructive={action?.kind === "delete"}
        pending={pending}
        onConfirm={run}
        onCancel={() => setAction(null)}
      />
    </>
  )
}

/** Tek ilan satırı: küçük resim, rozetler, başlık, duruma göre bilgi kutusu ve eylemler. */
function Row({
  listing: l,
  title,
  date,
  fields,
  onAction,
}: {
  listing: MyListingData
  title: string
  date: string
  fields: string
  onAction: (kind: Action["kind"]) => void
}) {
  const t = useTranslations("MyListings")
  const tl = useTranslations("Listing")
  const status: Status = l.status
  const active = status === "active"
  const editable = status !== "adopted" && status !== "closed"
  const detailHref = { pathname: "/listing/[slug]" as const, params: { slug: listingSlug(l) } }
  const editHref = { pathname: "/account/listings/[id]/edit" as const, params: { id: l.id } }
  const editLabel =
    status === "draft"
      ? t("complete")
      : status === "rejected" || status === "changes_requested"
        ? t("editResubmit")
        : t("edit")
  const adoptLabel = isReunion(l.type) ? t("markReunited") : t("markAdopted")
  const sub =
    status === "active"
      ? t("views", { count: l.viewCount })
      : status === "pending"
        ? t("subPending")
        : status === "draft"
          ? t("subDraft")
          : status === "adopted"
            ? t("subAdopted")
            : status === "closed"
              ? t("subClosed")
              : null

  const thumb = (
    <span className="block size-18 overflow-hidden rounded-xl bg-smoke-2 lg:h-22 lg:w-28">
      {l.coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- depo adresi
        <img src={l.coverUrl} alt="" loading="lazy" className="size-full object-cover" />
      ) : (
        <span className="flex size-full items-center justify-center">
          <PdMark className="size-8 opacity-30 grayscale" />
        </span>
      )}
    </span>
  )

  return (
    // Izgara: [küçük resim | bilgi | ⋯]; bilgi kutuları ve butonlar alt satırda — mobilde tam genişlik, masaüstünde
    // bilgi sütununun altında.
    <li className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-3.5 gap-y-3 p-4 lg:gap-x-5 lg:p-5">
      {active ? (
        <Link href={detailHref} tabIndex={-1} aria-hidden="true" className="lg:row-span-2">
          {thumb}
        </Link>
      ) : (
        <span className="lg:row-span-2">{thumb}</span>
      )}

      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("rounded-full px-2.5 py-1 text-xs leading-none font-bold", STATUS_TONE[status])}>
            {tl(`status.${status}` as never)}
          </span>
          <ListingTypeBadge type={l.type} className="py-1 text-[11px] font-bold max-lg:hidden" />
          <span className="text-[13px] text-body max-lg:hidden">
            {l.publishedAt ? t("published", { date }) : t("updated", { date })}
          </span>
        </div>
        <h3 className="truncate text-base font-extrabold lg:text-lg">
          {active ? (
            <Link href={detailHref} className="text-title hover:underline">
              {title}
            </Link>
          ) : (
            <span className="text-title">{title}</span>
          )}
        </h3>
        {sub && <p className="text-[13px] text-body">{sub}</p>}
        <p className="text-[13px] text-body lg:hidden">{date}</p>
      </div>

      <div className="col-span-3 row-start-2 grid gap-2.5 empty:hidden lg:col-span-1 lg:col-start-2">
        {status === "rejected" && l.rejectionReason && (
          <p className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm text-heading">
            <b className="text-danger">{t("rejectionReason")}</b> {l.rejectionReason}
          </p>
        )}
        {status === "changes_requested" && (l.reviewNote || fields) && (
          <div className="grid gap-1 rounded-xl bg-notice-soft px-3.5 py-2.5 text-sm text-heading">
            {l.reviewNote && (
              <p>
                <b className="text-notice-text">{t("reviewNote")}</b> {l.reviewNote}
              </p>
            )}
            {fields && <p>{t("reviewFields", { fields })}</p>}
          </div>
        )}

        {/* Masaüstü: ana eylemler buton */}
        <div className="flex flex-wrap gap-2 max-lg:hidden">
          {editable && (
            <Link
              href={editHref}
              className={cn(
                buttonVariants({
                  variant: status === "active" || status === "pending" ? "outline" : "outline-primary",
                  size: "sm",
                }),
                "min-h-tap"
              )}
            >
              <Pencil aria-hidden="true" />
              {editLabel}
            </Link>
          )}
          {active && (
            <ShareDialog listingNo={l.listingNo} title={title} type={l.type} slug={listingSlug(l)} variant="image" />
          )}
          {active && (
            <button
              type="button"
              onClick={() => onAction("adopted")}
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "min-h-tap border-2 border-success-text text-success-text hover:bg-success-soft"
              )}
            >
              <Check aria-hidden="true" />
              {adoptLabel}
            </button>
          )}
          {status === "draft" && (
            <button
              type="button"
              onClick={() => onAction("delete")}
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "min-h-tap text-danger hover:bg-danger-soft"
              )}
            >
              {t("delete")}
            </button>
          )}
        </div>
      </div>

      {/* "⋯" menüsü: mobilde tüm eylemler, masaüstünde yalnız ikincil olanlar */}
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={t("more", { title })}
          className={cn(
            "col-start-3 row-start-1 flex size-tap shrink-0 items-center justify-center rounded-full text-heading hover:bg-smoke-2",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
            // Masaüstünde ikincil eylem yoksa (taslakta Sil zaten görünür) menü gösterilmez.
            status === "draft" && "lg:hidden"
          )}
        >
          <EllipsisVertical aria-hidden="true" className="size-5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64 rounded-card p-1.5 shadow-pop">
          {editable && (
            <DropdownMenuItem className="min-h-11 gap-3 font-bold lg:hidden" render={<Link href={editHref} />}>
              <Pencil aria-hidden="true" />
              {editLabel}
            </DropdownMenuItem>
          )}
          {active && (
            <DropdownMenuItem className="min-h-11 gap-3 font-bold lg:hidden" onClick={() => onAction("adopted")}>
              <Check aria-hidden="true" />
              {adoptLabel}
            </DropdownMenuItem>
          )}
          {active && (
            <DropdownMenuItem className="min-h-11 gap-3 font-bold" onClick={() => onAction("closed")}>
              <X aria-hidden="true" />
              {t("close")}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem className="min-h-11 gap-3 font-bold text-danger" onClick={() => onAction("delete")}>
            <Trash2 aria-hidden="true" />
            {t("delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  )
}
