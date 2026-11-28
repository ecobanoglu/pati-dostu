"use client"

import { Pencil } from "lucide-react"
import { useFormatter, useTranslations } from "next-intl"
import { useState } from "react"

import { ConfirmDialog } from "@/components/dialog/confirm-dialog"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Link, useRouter } from "@/i18n/navigation"
import { apiFetch } from "@/lib/api-browser"
import { useErrorMessage } from "@/lib/errors"
import { cn } from "@/lib/utils"

import { refreshPublicPosts } from "./actions"
import type { AdminPostRow } from "./types"

const STATUS_BADGE = { published: "success", scheduled: "warning", draft: "neutral" } as const

type Bulk = "unpublish" | "delete"

/**
 * Yazı tablosu (tasarım 07-admin/08): seçim kutusu, başlık (editöre bağlantı), tür, kategori (haberde "Türkiye ·
 * Duyuru"), durum, yayın tarihi (planlıda saatle), okunma, Düzenle. Altında "Seçilenleri: Yayından kaldır · Sil"
 * (onay penceresiyle; sonra herkese açık önbellek temizlenir, liste yenilenir) ve "1–6 / 24". Mobilde satırlar kart.
 */
export function PostsTable({
  rows,
  total,
  from,
}: {
  rows: AdminPostRow[]
  total: number
  /** Sayfadaki ilk satırın sırası (1'den). */
  from: number
}) {
  const t = useTranslations("AdminPosts")
  const format = useFormatter()
  const router = useRouter()
  const errorMessage = useErrorMessage()
  const [selected, setSelected] = useState<string[]>([])
  const [confirm, setConfirm] = useState<Bulk | null>(null)
  const [pending, setPending] = useState(false)
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null)

  const allSelected = rows.length > 0 && selected.length === rows.length
  /** Satırın seçimini değiştirir. */
  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  /** Toplu işlemi uygular. */
  const run = async (action: Bulk) => {
    setPending(true)
    const { data, error } = await apiFetch<{ count: number }>("/admin/posts/bulk", {
      method: "POST",
      body: JSON.stringify({ ids: selected, action }),
    })
    setPending(false)
    setConfirm(null)
    if (error) return setNotice({ ok: false, text: errorMessage(error.code) })
    setSelected([])
    setNotice({ ok: true, text: t(action === "delete" ? "bulkDeleted" : "bulkUnpublished", { count: data.count }) })
    await refreshPublicPosts()
    router.refresh()
  }

  /** Yayın sütunu: planlıda tarih + saat, yayındakinde tarih, taslakta "—". */
  const dateOf = (row: AdminPostRow) =>
    !row.publishedAt || row.status === "draft"
      ? "—"
      : format.dateTime(
          new Date(row.publishedAt),
          row.status === "scheduled" ? { dateStyle: "medium", timeStyle: "short" } : { dateStyle: "medium" }
        )
  /** Kategori sütunu: haberde bölge + tür. */
  const categoryOf = (row: AdminPostRow) =>
    [row.region && t(`region.${row.region}`), row.category?.name].filter(Boolean).join(" · ") || "—"
  const typeBadge = (row: AdminPostRow) => (
    <Badge variant={row.type === "blog" ? "soft" : "notice"} size="sm">
      {t(`type.${row.type}`)}
    </Badge>
  )
  const statusBadge = (row: AdminPostRow) => (
    <Badge variant={STATUS_BADGE[row.status]} size="sm">
      {t(`status.${row.status}`)}
    </Badge>
  )
  const views = (row: AdminPostRow) =>
    row.status !== "published" && row.viewCount === 0 ? "—" : format.number(row.viewCount)
  const checkbox = (row: AdminPostRow, idPrefix: string) => (
    <input
      id={`${idPrefix}-${row.id}`}
      type="checkbox"
      checked={selected.includes(row.id)}
      onChange={() => toggle(row.id)}
      aria-label={t("selectRow", { title: row.title })}
      className="size-5 cursor-pointer rounded border-input accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    />
  )
  const editLink = (row: AdminPostRow, compact = false) => (
    <Link
      href={{ pathname: "/admin/posts/[id]", params: { id: row.id } }}
      aria-label={t("editRow", { title: row.title })}
      className={cn(buttonVariants({ variant: "outline", size: compact ? "sm" : "default" }), "gap-1.5")}
    >
      <Pencil aria-hidden="true" className="size-4" />
      {t("edit")}
    </Link>
  )

  return (
    <>
      {/* Masaüstü: tablo */}
      <div className="max-lg:hidden">
        <table className="w-full text-left text-[15px]">
          <caption className="sr-only">{t("tableCaption")}</caption>
          <thead className="bg-canvas text-[13px] font-extrabold text-body">
            <tr>
              <th scope="col" className="w-14 px-4 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() => setSelected(allSelected ? [] : rows.map((r) => r.id))}
                  aria-label={t("selectAll")}
                  className="size-5 cursor-pointer rounded border-input accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                />
              </th>
              <th scope="col" className="py-3 pr-4">
                {t("colTitle")}
              </th>
              <th scope="col" className="py-3 pr-4">
                {t("colType")}
              </th>
              <th scope="col" className="py-3 pr-4">
                {t("colCategory")}
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
              <tr key={row.id} className={cn(selected.includes(row.id) && "bg-smoke/60")}>
                <td className="px-4 py-3">{checkbox(row, "row")}</td>
                <td className="py-3 pr-4">
                  <Link
                    href={{ pathname: "/admin/posts/[id]", params: { id: row.id } }}
                    className="font-extrabold text-heading hover:text-primary hover:underline"
                  >
                    {row.title}
                  </Link>
                  {row.featured && (
                    <span className="ml-2 text-[13px] font-bold text-primary">{t("featuredShort")}</span>
                  )}
                </td>
                <td className="py-3 pr-4">{typeBadge(row)}</td>
                <td className="py-3 pr-4 text-body">{categoryOf(row)}</td>
                <td className="py-3 pr-4">{statusBadge(row)}</td>
                <td className="py-3 pr-4 whitespace-nowrap text-body">{dateOf(row)}</td>
                <td className="py-3 pr-4 text-right text-body tabular-nums">{views(row)}</td>
                <td className="py-3 pr-4 text-right">{editLink(row)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobil: kartlar */}
      <ul className="divide-y divide-border lg:hidden">
        {rows.map((row) => (
          <li key={row.id} className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 p-4">
            <div className="pt-0.5">{checkbox(row, "card")}</div>
            <div className="grid gap-2">
              <Link
                href={{ pathname: "/admin/posts/[id]", params: { id: row.id } }}
                className="font-extrabold text-heading hover:text-primary"
              >
                {row.title}
              </Link>
              <div className="flex flex-wrap items-center gap-2">
                {typeBadge(row)}
                {statusBadge(row)}
                <span className="text-sm text-body">{categoryOf(row)}</span>
              </div>
              <p className="text-sm text-body">
                {[
                  row.status === "draft" ? null : dateOf(row),
                  row.status === "published" ? t("viewsShort", { count: row.viewCount }) : null,
                ]
                  .filter(Boolean)
                  .join(" · ") || t(`status.${row.status}`)}
              </p>
              <div>{editLink(row, true)}</div>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-3 text-sm text-body">
        <p className="flex flex-wrap items-center gap-x-1.5">
          <span>{t("bulkLabel", { count: selected.length })}</span>
          <button
            type="button"
            disabled={selected.length === 0}
            onClick={() => setConfirm("unpublish")}
            className="inline-flex min-h-tap items-center font-bold text-primary underline underline-offset-4 disabled:cursor-not-allowed disabled:text-body disabled:no-underline"
          >
            {t("bulkUnpublish")}
          </button>
          <span aria-hidden="true">·</span>
          <button
            type="button"
            disabled={selected.length === 0}
            onClick={() => setConfirm("delete")}
            className="inline-flex min-h-tap items-center font-bold text-destructive underline underline-offset-4 disabled:cursor-not-allowed disabled:text-body disabled:no-underline"
          >
            {t("bulkDelete")}
          </button>
        </p>
        <p>{t("range", { from, to: from + rows.length - 1, total })}</p>
        <p
          role="status"
          className={cn("w-full", notice?.ok ? "font-bold text-success-text" : "font-bold text-destructive")}
        >
          {notice?.text}
        </p>
      </div>

      <ConfirmDialog
        open={confirm !== null}
        title={t(confirm === "delete" ? "bulkDeleteTitle" : "bulkUnpublishTitle", { count: selected.length })}
        text={t(confirm === "delete" ? "bulkDeleteText" : "bulkUnpublishText")}
        confirmLabel={t(confirm === "delete" ? "bulkDelete" : "bulkUnpublish")}
        cancelLabel={t("cancel")}
        destructive={confirm === "delete"}
        pending={pending}
        onConfirm={() => confirm && void run(confirm)}
        onCancel={() => setConfirm(null)}
      />
    </>
  )
}
