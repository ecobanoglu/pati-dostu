"use client"

import { EllipsisVertical, ExternalLink, FolderInput, Lock, LockOpen, Pin, PinOff, Trash2 } from "lucide-react"
import { useFormatter, useTranslations } from "next-intl"
import { type ReactNode, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Link, useRouter } from "@/i18n/navigation"
import { refreshForumCaches } from "@/lib/admin-actions"
import { apiFetch } from "@/lib/api-browser"
import { useErrorMessage } from "@/lib/errors"
import { cn } from "@/lib/utils"

import { MoveDialog, RemoveDialog } from "./dialogs"
import type { AdminReplyRow, AdminTopicRow, Removal } from "./types"

type Category = { id: string; name: string }

/** İşlem sonrası ortak akış: kısa bildirim, topluluk önbelleği ve liste yenilenir. */
function useAfter() {
  const router = useRouter()
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null)
  const after = async (text: string) => {
    setNotice({ ok: true, text })
    await refreshForumCaches()
    router.refresh()
  }
  const status = (
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
  )
  return { after, fail: (text: string) => setNotice({ ok: false, text }), status }
}

/** Silme bilgisi: "Yazarı sildi" ya da "Silen: Ad", tarih, gerekçe + not. */
function RemovalInfo({ removal }: { removal: NonNullable<Removal> }) {
  const t = useTranslations("AdminCommunity")
  const tr = useTranslations("Reports")
  const format = useFormatter()
  return (
    <div className="grid gap-0.5 text-sm">
      <p className="font-bold text-heading">
        {removal.byAuthor ? t("removedByAuthor") : t("removedBy", { name: removal.by ?? "—" })}
      </p>
      <p className="text-body">{format.dateTime(new Date(removal.at), { dateStyle: "medium", timeStyle: "short" })}</p>
      {removal.reason && (
        <p className="text-heading">
          {tr(`reasons.${removal.reason}` as "reasons.other")}
          {removal.note && <span className="text-body"> — {removal.note}</span>}
        </p>
      )}
    </div>
  )
}

/** "⋯" menüsünün tetik düğmesi. */
function MenuTrigger({ label }: { label: string }) {
  return (
    <DropdownMenuTrigger
      aria-label={label}
      className="flex size-tap shrink-0 items-center justify-center rounded-full text-heading hover:bg-smoke-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <EllipsisVertical aria-hidden="true" className="size-5" />
    </DropdownMenuTrigger>
  )
}

/** Masaüstü tablo başlık hücresi. */
function Th({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <th scope="col" className={cn("py-3 pr-4", className)}>
      {children}
    </th>
  )
}

/**
 * Konu tablosu (masaüstü) / kartları (mobil): başlık + rozetler (Sabit, Kilitli, Çözüldü), kategori, yazar, cevap,
 * görüntülenme, tarih. Yayındakilerde "Görüntüle" ve "⋯" menüsü: Sabitle / Sabitliği kaldır, Kilitle / Kilidi aç,
 * Kategoriyi değiştir, Sil (gerekçeli). Silinenlerde eylem yok; silme bilgisi gösterilir.
 */
export function TopicsTable({
  rows,
  categories,
  deleted,
}: {
  rows: AdminTopicRow[]
  categories: Category[]
  deleted: boolean
}) {
  const t = useTranslations("AdminCommunity")
  const tc = useTranslations("Community")
  const format = useFormatter()
  const errorMessage = useErrorMessage()
  const { after, fail, status } = useAfter()
  const [moving, setMoving] = useState<AdminTopicRow | null>(null)
  const [removing, setRemoving] = useState<AdminTopicRow | null>(null)

  /** Sabitle / kilitle anahtarı (geri alınabilir, onay sorulmaz). */
  const toggle = async (row: AdminTopicRow, field: "isPinned" | "isLocked") => {
    const value = !row[field]
    const { error } = await apiFetch(`/admin/forum/topics/${row.id}`, {
      method: "PATCH",
      body: JSON.stringify({ [field]: value }),
    })
    if (error) return fail(errorMessage(error.code))
    const key = field === "isPinned" ? (value ? "pinnedDone" : "unpinnedDone") : value ? "lockedDone" : "unlockedDone"
    await after(t(key, { title: row.title }))
  }

  const href = (row: AdminTopicRow) =>
    ({ pathname: "/community/[category]/[slug]", params: { category: row.category.slug, slug: row.slug } }) as const
  const date = (iso: string) => format.dateTime(new Date(iso), { dateStyle: "medium" })
  const badges = (row: AdminTopicRow) =>
    (row.isPinned || row.isLocked || row.isSolved) && (
      <span className="flex flex-wrap gap-1.5">
        {row.isPinned && (
          <Badge variant="notice" size="sm">
            {tc("pinned")}
          </Badge>
        )}
        {row.isLocked && (
          <Badge variant="neutral" size="sm">
            {tc("locked")}
          </Badge>
        )}
        {row.isSolved && (
          <Badge variant="success" size="sm">
            {tc("solved")}
          </Badge>
        )}
      </span>
    )

  /** Görüntüle bağlantısı + "⋯" menüsü (yalnız yayında). */
  const actions = (row: AdminTopicRow) =>
    !deleted && (
      <div className="flex items-center justify-end gap-1">
        <Link
          href={href(row)}
          target="_blank"
          aria-label={t("viewRow", { title: row.title })}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
        >
          <ExternalLink aria-hidden="true" className="size-4" />
          {t("view")}
        </Link>
        <DropdownMenu>
          <MenuTrigger label={t("more", { title: row.title })} />
          <DropdownMenuContent align="end" className="w-64 rounded-card p-1.5 shadow-pop">
            <DropdownMenuItem className="min-h-11 gap-3 font-bold" onClick={() => void toggle(row, "isPinned")}>
              {row.isPinned ? <PinOff aria-hidden="true" /> : <Pin aria-hidden="true" />}
              {row.isPinned ? t("unpin") : t("pin")}
            </DropdownMenuItem>
            <DropdownMenuItem className="min-h-11 gap-3 font-bold" onClick={() => void toggle(row, "isLocked")}>
              {row.isLocked ? <LockOpen aria-hidden="true" /> : <Lock aria-hidden="true" />}
              {row.isLocked ? t("unlock") : t("lock")}
            </DropdownMenuItem>
            <DropdownMenuItem className="min-h-11 gap-3 font-bold" onClick={() => setMoving(row)}>
              <FolderInput aria-hidden="true" />
              {t("moveAction")}
            </DropdownMenuItem>
            <DropdownMenuItem className="min-h-11 gap-3 font-bold text-danger" onClick={() => setRemoving(row)}>
              <Trash2 aria-hidden="true" />
              {t("remove")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    )

  return (
    <>
      <div className="max-lg:hidden">
        <table className="w-full text-left text-[15px]">
          <caption className="sr-only">{t(deleted ? "deletedTopicsCaption" : "topicsCaption")}</caption>
          <thead className="bg-canvas text-[13px] font-extrabold text-body">
            <tr>
              <Th className="pl-4">{t("colTopic")}</Th>
              <Th>{t("colCategory")}</Th>
              <Th>{t("colAuthor")}</Th>
              {deleted ? (
                <Th>{t("colRemoval")}</Th>
              ) : (
                <>
                  <Th className="text-right">{t("colReplies")}</Th>
                  <Th className="text-right">{t("colViews")}</Th>
                  <Th>{t("colDate")}</Th>
                  <Th>
                    <span className="sr-only">{t("colActions")}</span>
                  </Th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="max-w-96 py-3 pr-4 pl-4">
                  <p className="font-extrabold text-heading">{row.title}</p>
                  {badges(row)}
                </td>
                <td className="py-3 pr-4 text-body">{row.category.name}</td>
                <td className="max-w-56 py-3 pr-4">
                  <p className="truncate font-bold text-heading">{row.author.name}</p>
                  <p className="truncate text-[13px] text-body">{row.author.email}</p>
                </td>
                {deleted && row.removal ? (
                  <td className="py-3 pr-4">
                    <RemovalInfo removal={row.removal} />
                  </td>
                ) : (
                  <>
                    <td className="py-3 pr-4 text-right text-body tabular-nums">{row.answerCount}</td>
                    <td className="py-3 pr-4 text-right text-body tabular-nums">{format.number(row.viewCount)}</td>
                    <td className="py-3 pr-4 whitespace-nowrap text-body">{date(row.createdAt)}</td>
                    <td className="py-3 pr-2">{actions(row)}</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-border lg:hidden">
        {rows.map((row) => (
          <li key={row.id} className="grid gap-1.5 p-4">
            <p className="font-extrabold text-heading">{row.title}</p>
            {badges(row)}
            <p className="text-sm text-body">
              {row.category.name} · {row.author.name}
            </p>
            {deleted && row.removal ? (
              <RemovalInfo removal={row.removal} />
            ) : (
              <>
                <p className="text-sm text-body">
                  {date(row.createdAt)} · {tc("answers", { count: row.answerCount })}
                </p>
                {actions(row)}
              </>
            )}
          </li>
        ))}
      </ul>

      {status}

      {moving && (
        <MoveDialog
          id={moving.id}
          title={moving.title}
          currentCategoryId={moving.category.id}
          categories={categories}
          onClose={() => setMoving(null)}
          onDone={async (name) => {
            const title = moving.title
            setMoving(null)
            await after(t("movedDone", { title, category: name }))
          }}
        />
      )}
      {removing && (
        <RemoveDialog
          kind="topic"
          id={removing.id}
          title={removing.title}
          onClose={() => setRemoving(null)}
          onDone={async () => {
            const title = removing.title
            setRemoving(null)
            await after(t("removedTopicDone", { title }))
          }}
        />
      )}
    </>
  )
}

/**
 * Cevap tablosu / kartları: cevap özeti (+ "En iyi cevap"), konusu, yazar, faydalı sayısı, tarih. Yayındakilerde
 * "Görüntüle" (konu sayfasında cevaba) ve "Sil" (gerekçeli). Silinenlerde silme bilgisi.
 */
export function RepliesTable({ rows, deleted }: { rows: AdminReplyRow[]; deleted: boolean }) {
  const t = useTranslations("AdminCommunity")
  const tc = useTranslations("Community")
  const format = useFormatter()
  const { after, status } = useAfter()
  const [removing, setRemoving] = useState<AdminReplyRow | null>(null)

  const date = (iso: string) => format.dateTime(new Date(iso), { dateStyle: "medium" })
  const topicLink = (row: AdminReplyRow, hash?: string) =>
    ({
      pathname: "/community/[category]/[slug]",
      params: { category: row.topic.categorySlug, slug: row.topic.slug },
      ...(hash ? { hash } : {}),
    }) as const
  const topicTitle = (row: AdminReplyRow) =>
    row.topic.deleted ? (
      <span className="text-body">
        {row.topic.title} <span className="text-xs font-bold">({t("topicDeleted")})</span>
      </span>
    ) : (
      <Link href={topicLink(row)} target="_blank" className="font-bold text-primary hover:underline">
        {row.topic.title}
      </Link>
    )
  const actions = (row: AdminReplyRow) =>
    !deleted && (
      <div className="flex flex-wrap items-center justify-end gap-1">
        <Link
          href={topicLink(row, `reply-${row.id}`)}
          target="_blank"
          aria-label={t("viewReply", { title: row.topic.title })}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
        >
          <ExternalLink aria-hidden="true" className="size-4" />
          {t("view")}
        </Link>
        <button
          type="button"
          onClick={() => setRemoving(row)}
          aria-label={t("removeReplyRow", { name: row.author.name, title: row.topic.title })}
          className={cn(buttonVariants({ variant: "destructive-ghost", size: "sm" }), "gap-1.5")}
        >
          <Trash2 aria-hidden="true" className="size-4" />
          {t("remove")}
        </button>
      </div>
    )

  return (
    <>
      <div className="max-lg:hidden">
        <table className="w-full text-left text-[15px]">
          <caption className="sr-only">{t(deleted ? "deletedRepliesCaption" : "repliesCaption")}</caption>
          <thead className="bg-canvas text-[13px] font-extrabold text-body">
            <tr>
              <Th className="pl-4">{t("colReply")}</Th>
              <Th>{t("colTopic")}</Th>
              <Th>{t("colAuthor")}</Th>
              {deleted ? (
                <Th>{t("colRemoval")}</Th>
              ) : (
                <>
                  <Th className="text-right">{t("colHelpful")}</Th>
                  <Th>{t("colDate")}</Th>
                  <Th>
                    <span className="sr-only">{t("colActions")}</span>
                  </Th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="max-w-96 py-3 pr-4 pl-4">
                  <p className="text-heading">{row.excerpt}</p>
                  {row.isBestAnswer && (
                    <Badge variant="success" size="sm" className="mt-1">
                      {tc("bestAnswer")}
                    </Badge>
                  )}
                </td>
                <td className="max-w-64 py-3 pr-4">{topicTitle(row)}</td>
                <td className="max-w-56 py-3 pr-4">
                  <p className="truncate font-bold text-heading">{row.author.name}</p>
                  <p className="truncate text-[13px] text-body">{row.author.email}</p>
                </td>
                {deleted && row.removal ? (
                  <td className="py-3 pr-4">
                    <RemovalInfo removal={row.removal} />
                  </td>
                ) : (
                  <>
                    <td className="py-3 pr-4 text-right text-body tabular-nums">{row.likeCount}</td>
                    <td className="py-3 pr-4 whitespace-nowrap text-body">{date(row.createdAt)}</td>
                    <td className="py-3 pr-2">{actions(row)}</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-border lg:hidden">
        {rows.map((row) => (
          <li key={row.id} className="grid gap-1.5 p-4">
            <p className="text-heading">{row.excerpt}</p>
            <p className="text-sm">{topicTitle(row)}</p>
            <p className="text-sm text-body">
              {row.author.name} · {date(row.createdAt)}
            </p>
            {deleted && row.removal ? <RemovalInfo removal={row.removal} /> : actions(row)}
          </li>
        ))}
      </ul>

      {status}

      {removing && (
        <RemoveDialog
          kind="reply"
          id={removing.id}
          title={removing.topic.title}
          onClose={() => setRemoving(null)}
          onDone={async () => {
            const name = removing.author.name
            setRemoving(null)
            await after(t("removedReplyDone", { name }))
          }}
        />
      )}
    </>
  )
}
