"use client"

import { EllipsisVertical, ExternalLink, LoaderCircle, ShieldCheck, Trash2, X } from "lucide-react"
import { useFormatter, useTranslations } from "next-intl"
import { type FormEvent, useEffect, useId, useRef, useState } from "react"

import { PdMark } from "@/components/brand/logo"
import { ConfirmDialog } from "@/components/dialog/confirm-dialog"
import { Field } from "@/components/form/field"
import { Select, Textarea } from "@/components/form/input"
import { ListingTypeBadge } from "@/components/listing/listing-type-badge"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Link, useRouter } from "@/i18n/navigation"
import { refreshListingCaches } from "@/lib/admin-actions"
import { apiFetch } from "@/lib/api-browser"
import { useErrorMessage } from "@/lib/errors"
import { refreshAdminCounts } from "@/lib/use-admin-counts"
import { cn } from "@/lib/utils"

import type { AdminListingRow, ReasonOption } from "./types"

const STATUS_BADGE = {
  pending: "warning",
  active: "success",
  changes_requested: "notice",
  rejected: "danger",
  adopted: "soft",
  closed: "neutral",
} as const
type Status = keyof typeof STATUS_BADGE

/**
 * İlan tablosu (masaüstü) / kartları (mobil): kapak, başlık + ilan no, tür, sahibi, konum, durum, gönderim tarihi,
 * okunma. Eylemler: onay bekleyende "İncele" (İlan onayına), diğerlerinde "Görüntüle" (sitede, admin önizlemesi);
 * "⋯" menüsünde Yayından kaldır (yalnız yayında — onaylı, gerekçesiz: ilan kapatılır) ve Sil (hazır gerekçe + not;
 * sahibine bildirim). İşlemden sonra rozetler ve herkese açık ilan önbelleği yenilenir.
 */
export function ListingsTable({ rows, reasons }: { rows: AdminListingRow[]; reasons: ReasonOption[] }) {
  const t = useTranslations("AdminListings")
  const tl = useTranslations("Listing")
  const format = useFormatter()
  const router = useRouter()
  const errorMessage = useErrorMessage()
  const [closing, setClosing] = useState<AdminListingRow | null>(null)
  const [removing, setRemoving] = useState<AdminListingRow | null>(null)
  const [pending, setPending] = useState(false)
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null)

  /** İşlem sonrası: rozet, önbellek, liste. */
  const after = async (text: string) => {
    setNotice({ ok: true, text })
    await Promise.all([refreshListingCaches(), refreshAdminCounts()])
    router.refresh()
  }

  /** Yayından kaldır (kapat). */
  const close = async () => {
    if (!closing) return
    setPending(true)
    const { error } = await apiFetch(`/admin/listings/${closing.id}/close`, { method: "POST" })
    setPending(false)
    const title = closing.title ?? ""
    setClosing(null)
    if (error) return setNotice({ ok: false, text: errorMessage(error.code) })
    await after(t("closed", { title }))
  }

  const status = (row: AdminListingRow) => row.status as Status
  const date = (row: AdminListingRow) =>
    row.submittedAt ? format.dateTime(new Date(row.submittedAt), { dateStyle: "medium" }) : "—"
  const location = (row: AdminListingRow) => [row.city?.name, row.district].filter(Boolean).join(", ") || "—"
  const href = (row: AdminListingRow) =>
    ({ pathname: "/listing/[slug]", params: { slug: `${row.slug ?? "ilan"}-${row.listingNo}` } }) as const

  /** Satırın birincil eylemi: onay bekleyende İncele, diğerlerinde Görüntüle. */
  const primary = (row: AdminListingRow) =>
    status(row) === "pending" ? (
      <Link
        href={{ pathname: "/admin/listing-review", query: { ilan: String(row.listingNo) } }}
        aria-label={t("reviewRow", { title: row.title ?? "" })}
        className={cn(buttonVariants({ variant: "outline-primary", size: "sm" }), "gap-1.5")}
      >
        <ShieldCheck aria-hidden="true" className="size-4" />
        {t("review")}
      </Link>
    ) : (
      <Link
        href={href(row)}
        target="_blank"
        aria-label={t("viewRow", { title: row.title ?? "" })}
        className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
      >
        <ExternalLink aria-hidden="true" className="size-4" />
        {t("view")}
      </Link>
    )

  /** "⋯" menüsü: Yayından kaldır (yalnız yayında) ve Sil. */
  const menu = (row: AdminListingRow) => (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t("more", { title: row.title ?? "" })}
        className="flex size-tap shrink-0 items-center justify-center rounded-full text-heading hover:bg-smoke-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <EllipsisVertical aria-hidden="true" className="size-5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60 rounded-card p-1.5 shadow-pop">
        {status(row) === "active" && (
          <DropdownMenuItem className="min-h-11 gap-3 font-bold" onClick={() => setClosing(row)}>
            <X aria-hidden="true" />
            {t("close")}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem className="min-h-11 gap-3 font-bold text-danger" onClick={() => setRemoving(row)}>
          <Trash2 aria-hidden="true" />
          {t("remove")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  const cover = (row: AdminListingRow, className: string) =>
    row.coverUrl ? (
      // eslint-disable-next-line @next/next/no-img-element -- depo adresi (listings/)
      <img src={row.coverUrl} alt="" className={cn("rounded-lg bg-smoke-2 object-cover", className)} />
    ) : (
      <div aria-hidden="true" className={cn("flex items-center justify-center rounded-lg bg-smoke-2", className)}>
        <PdMark className="size-6 opacity-30 grayscale" />
      </div>
    )
  const statusBadge = (row: AdminListingRow) => (
    <Badge variant={STATUS_BADGE[status(row)]} size="sm">
      {tl(`status.${status(row)}`)}
    </Badge>
  )

  return (
    <>
      <div className="max-lg:hidden">
        <table className="w-full text-left text-[15px]">
          <caption className="sr-only">{t("tableCaption")}</caption>
          <thead className="bg-canvas text-[13px] font-extrabold text-body">
            <tr>
              <th scope="col" className="py-3 pr-4 pl-4">
                {t("colListing")}
              </th>
              <th scope="col" className="py-3 pr-4">
                {t("colType")}
              </th>
              <th scope="col" className="py-3 pr-4">
                {t("colOwner")}
              </th>
              <th scope="col" className="py-3 pr-4">
                {t("colLocation")}
              </th>
              <th scope="col" className="py-3 pr-4">
                {t("colStatus")}
              </th>
              <th scope="col" className="py-3 pr-4">
                {t("colDate")}
              </th>
              <th scope="col" className="py-3 pr-4 text-right">
                {t("colViews")}
              </th>
              <th scope="col" className="py-3 pr-4">
                <span className="sr-only">{t("colActions")}</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="py-3 pr-4 pl-4">
                  <div className="flex items-center gap-3">
                    {cover(row, "size-12 shrink-0")}
                    <div className="min-w-0">
                      <p className="font-extrabold text-heading">{row.title}</p>
                      <p className="text-[13px] text-body">PD-{row.listingNo}</p>
                    </div>
                  </div>
                </td>
                <td className="py-3 pr-4">
                  <ListingTypeBadge type={row.type} size="sm" />
                </td>
                <td className="max-w-56 py-3 pr-4">
                  <p className="truncate font-bold text-heading">{row.owner.name}</p>
                  <p className="truncate text-[13px] text-body">{row.owner.email}</p>
                </td>
                <td className="py-3 pr-4 text-body">{location(row)}</td>
                <td className="py-3 pr-4">{statusBadge(row)}</td>
                <td className="py-3 pr-4 whitespace-nowrap text-body">{date(row)}</td>
                <td className="py-3 pr-4 text-right text-body tabular-nums">{format.number(row.viewCount)}</td>
                <td className="py-3 pr-2">
                  <div className="flex items-center justify-end gap-1">
                    {primary(row)}
                    {menu(row)}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-border lg:hidden">
        {rows.map((row) => (
          <li key={row.id} className="grid grid-cols-[56px_minmax(0,1fr)_auto] gap-3 p-4">
            {cover(row, "size-14")}
            <div className="grid min-w-0 gap-1.5">
              <p className="font-extrabold text-heading">{row.title}</p>
              <div className="flex flex-wrap items-center gap-1.5">
                <ListingTypeBadge type={row.type} size="sm" />
                {statusBadge(row)}
              </div>
              <p className="text-sm text-body">
                PD-{row.listingNo} · {row.owner.name} · {location(row)}
              </p>
              <p className="text-sm text-body">
                {date(row)} · {t("viewsShort", { count: row.viewCount })}
              </p>
              <div>{primary(row)}</div>
            </div>
            {menu(row)}
          </li>
        ))}
      </ul>

      <p
        role="status"
        className={cn(
          "px-4 text-sm font-bold",
          notice ? "py-3" : "sr-only",
          notice?.ok ? "text-success-text" : "text-destructive"
        )}
      >
        {notice?.text}
      </p>

      <ConfirmDialog
        open={closing !== null}
        title={t("closeTitle")}
        text={t("closeText", { title: closing?.title ?? "" })}
        confirmLabel={t("close")}
        cancelLabel={t("cancel")}
        pending={pending}
        onConfirm={() => void close()}
        onCancel={() => setClosing(null)}
      />
      {removing && (
        <RemoveDialog
          row={removing}
          reasons={reasons}
          onClose={() => setRemoving(null)}
          onDone={async (title) => {
            setRemoving(null)
            await after(t("removed", { title }))
          }}
        />
      )}
    </>
  )
}

/**
 * Gerekçeli silme penceresi: hazır gerekçe ve/veya not (gerekçe yoksa not en az 10 karakter); sahibine bildirim ve
 * e-posta gider. Yerel <dialog> (masaüstü ortada, mobil alttan); Esc ve "Vazgeç" kapatır, gönderilirken kapanmaz.
 */
function RemoveDialog({
  row,
  reasons,
  onClose,
  onDone,
}: {
  row: AdminListingRow
  reasons: ReasonOption[]
  onClose: () => void
  onDone: (title: string) => Promise<void>
}) {
  const t = useTranslations("AdminListings")
  const errorMessage = useErrorMessage()
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const [reasonId, setReasonId] = useState("")
  const [note, setNote] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<{ field: "reason" | "general"; text: string } | null>(null)

  useEffect(() => {
    if (ref.current && !ref.current.open) ref.current.showModal()
  }, [])

  /** Doğrular ve siler. */
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!reasonId && note.trim().length < 10) return setError({ field: "reason", text: t("reasonRequired") })
    setBusy(true)
    const { error: err } = await apiFetch(`/admin/listings/${row.id}/remove`, {
      method: "POST",
      body: JSON.stringify({ ...(reasonId ? { reasonId } : {}), note: note.trim() }),
    })
    setBusy(false)
    if (err) return setError({ field: "general", text: errorMessage(err.code, err.details) })
    await onDone(row.title ?? "")
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault()
        if (!busy) onClose()
      }}
      onClick={(e) => e.target === e.currentTarget && !busy && onClose()}
      className={cn(
        "m-0 w-full max-w-none bg-background p-0 text-heading backdrop:bg-heading/60",
        "max-sm:top-auto max-sm:bottom-0 max-sm:rounded-t-dialog sm:m-auto sm:max-w-lg sm:rounded-dialog"
      )}
    >
      <form onSubmit={submit} noValidate className="grid gap-4 p-6">
        <h2 id={titleId} className="text-xl font-extrabold">
          {t("removeTitle")}
        </h2>
        <p className="text-body">{t("removeText", { title: row.title ?? "" })}</p>
        <Field id="remove-reason" label={t("reasonLabel")} error={error?.field === "reason" ? error.text : undefined}>
          {(control) => (
            <Select
              {...control}
              autoFocus
              value={reasonId}
              onChange={(e) => {
                setReasonId(e.target.value)
                setError(null)
              }}
            >
              <option value="">{t("reasonPlaceholder")}</option>
              {reasons.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field id="remove-note" label={t("noteLabel")} description={t("noteHint")}>
          {(control) => (
            <Textarea
              {...control}
              value={note}
              maxLength={1000}
              className="min-h-24"
              onChange={(e) => {
                setNote(e.target.value)
                setError(null)
              }}
            />
          )}
        </Field>
        {error?.field === "general" && (
          <p role="alert" className="text-sm font-bold text-destructive">
            {error.text}
          </p>
        )}
        <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            {t("cancel")}
          </Button>
          <Button type="submit" variant="destructive" disabled={busy}>
            {busy && <LoaderCircle aria-hidden="true" className="animate-spin motion-reduce:animate-none" />}
            {t("remove")}
          </Button>
        </div>
      </form>
    </dialog>
  )
}
