"use client"

import { COMMENT_MAX } from "@pati-dostu/validators"
import { Trash2 } from "lucide-react"
import { useFormatter, useTranslations } from "next-intl"
import { type FormEvent, useId, useMemo, useState } from "react"

import { ConfirmDialog } from "@/components/dialog/confirm-dialog"
import { Textarea } from "@/components/form/input"
import { UserAvatar } from "@/components/layout/user-avatar"
import { Button, buttonVariants } from "@/components/ui/button"
import { Link } from "@/i18n/navigation"
import { apiFetch } from "@/lib/api-browser"
import { useErrorMessage } from "@/lib/errors"
import { cn } from "@/lib/utils"

/** GET /listings/{ref}/comments öğesi (apps/api › CommentDto). */
export type Comment = {
  id: string
  body: string
  createdAt: string
  author: { id: string; name: string; image: string | null; role: "user" | "clinic" | "shelter" | "admin" }
  byOwner: boolean
}

export type CommentPage = { items: Comment[]; total: number; nextCursor: string | null }

/** Mobilde "Tümünü gör"e basılana kadar görünen yorum sayısı (tasarım 19). */
const MOBILE_PREVIEW = 2

/**
 * İlan yorumları (tasarım 03 ve 19): "Yorumlar (N)", en yeni önce liste (ilan sahibinin yorumu rozetli), "Daha fazla
 * yorum", yazma formu. Kararlar: düz liste (cevap yok); içerik filtresinden geçen yorum anında yayınlanır, takılan
 * kaydedilmez ve nedeni alanın altında gösterilir; yorumu yazan, ilan sahibi ve admin silebilir. Misafire giriş
 * bağlantısı gösterilir. Mobilde önce 2 yorum, "Tümünü gör" ile hepsi ve form.
 */
export function Comments({
  listingNo,
  initial,
  viewer,
  next,
  now: nowIso,
}: {
  listingNo: number
  initial: CommentPage
  /** Bakan kişi: misafir ya da oturumdaki kullanıcının id'si, ilan sahibi mi, admin mi. */
  viewer: { id: string; isListingOwner: boolean; isAdmin: boolean } | null
  /** Misafir girişten sonra dönülecek adres (ilanın yorumlar bölümü). */
  next: string
  now: string
}) {
  const t = useTranslations("Comments")
  const format = useFormatter()
  const errorMessage = useErrorMessage()
  const id = useId()
  const now = useMemo(() => new Date(nowIso), [nowIso])

  const [items, setItems] = useState(initial.items)
  const [total, setTotal] = useState(initial.total)
  const [cursor, setCursor] = useState(initial.nextCursor)
  const [expanded, setExpanded] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [body, setBody] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<Comment | null>(null)
  const [pendingDelete, setPendingDelete] = useState(false)
  const [status, setStatus] = useState("")

  /** Bu yorumu bakan kişi silebilir mi (yazan, ilan sahibi, admin). */
  const canDelete = (c: Comment) =>
    Boolean(viewer && (viewer.id === c.author.id || viewer.isListingOwner || viewer.isAdmin))

  /** Yorumu gönderir; başarılıysa listenin başına ekler ve formu boşaltır. */
  async function submit(event: FormEvent) {
    event.preventDefault()
    const text = body.trim()
    if (!text || sending) return
    setSending(true)
    setError(null)
    const { data, error: err } = await apiFetch<Comment>(`/listings/${listingNo}/comments`, {
      method: "POST",
      body: JSON.stringify({ body: text }),
    })
    setSending(false)
    if (!data) return setError(errorMessage(err?.code, err?.details))
    setItems((list) => [data, ...list])
    setTotal((n) => n + 1)
    setBody("")
    setExpanded(true)
    setStatus(t("posted"))
  }

  /** Onaylanan yorumu siler ve listeden çıkarır. */
  async function confirmDelete() {
    if (!deleting) return
    setPendingDelete(true)
    const { error: err } = await apiFetch(`/comments/${deleting.id}`, { method: "DELETE" })
    setPendingDelete(false)
    if (err) {
      setStatus(errorMessage(err.code))
    } else {
      setItems((list) => list.filter((c) => c.id !== deleting.id))
      setTotal((n) => Math.max(0, n - 1))
      setStatus(t("deleted"))
    }
    setDeleting(null)
  }

  /** Daha eski yorumları getirir. */
  async function loadMore() {
    if (!cursor) return
    setLoadingMore(true)
    const { data } = await apiFetch<CommentPage>(`/listings/${listingNo}/comments?cursor=${encodeURIComponent(cursor)}`)
    setLoadingMore(false)
    if (!data) return
    setItems((list) => [...list, ...data.items.filter((c) => !list.some((x) => x.id === c.id))])
    setCursor(data.nextCursor)
  }

  const collapsedOnMobile = !expanded && items.length > MOBILE_PREVIEW
  const remaining = COMMENT_MAX - body.length

  return (
    <section
      id="comments"
      aria-labelledby="comments-title"
      className="scroll-mt-24 lg:rounded-card lg:border lg:border-border lg:p-6"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id="comments-title" className="text-xl font-extrabold text-heading lg:text-h3">
          {t("title")} <span className="text-base font-bold text-body">({format.number(total)})</span>
        </h2>
        {collapsedOnMobile && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            aria-controls="comments-list"
            aria-expanded={false}
            className="min-h-tap text-sm font-extrabold text-primary lg:hidden"
          >
            {t("showAll")}
          </button>
        )}
      </div>

      <p role="status" className="sr-only">
        {status}
      </p>

      {items.length === 0 ? (
        <p className="text-body">{t("empty")}</p>
      ) : (
        <ul id="comments-list" className="grid gap-4">
          {items.map((c, i) => (
            <li key={c.id} className={cn("flex gap-3", collapsedOnMobile && i >= MOBILE_PREVIEW && "max-lg:hidden")}>
              <UserAvatar user={c.author} className="size-10 bg-smoke text-primary" />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                  <span className="font-extrabold text-heading">{c.author.name}</span>
                  {c.byOwner && (
                    <span className="rounded-full bg-smoke px-2 py-0.5 text-xs font-extrabold text-primary">
                      {t("ownerBadge")}
                    </span>
                  )}
                  <span className="text-body" aria-hidden="true">
                    ·
                  </span>
                  {/* Yeni yazılan yorum sayfa açılış anından sonra: "1 saniye sonra" yerine "şimdi" görünsün. */}
                  <time dateTime={c.createdAt} className="text-body">
                    {format.relativeTime(
                      new Date(c.createdAt),
                      new Date(Math.max(now.getTime(), Date.parse(c.createdAt)))
                    )}
                  </time>
                </p>
                <p className="mt-0.5 break-words whitespace-pre-wrap text-heading">{c.body}</p>
              </div>
              {canDelete(c) && (
                <button
                  type="button"
                  onClick={() => setDeleting(c)}
                  aria-label={t("delete")}
                  className="flex size-tap shrink-0 items-center justify-center rounded-full text-body hover:bg-danger-soft hover:text-danger focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {cursor && !collapsedOnMobile && (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            aria-busy={loadingMore}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "min-h-tap")}
          >
            {t("loadMore")}
          </button>
        </div>
      )}

      <div className={cn("mt-5 border-t border-border pt-5", collapsedOnMobile && "max-lg:hidden")}>
        {viewer ? (
          <form onSubmit={submit} className="grid gap-2">
            <label htmlFor={id} className="text-sm font-extrabold text-heading">
              {t("formLabel")}
            </label>
            <Textarea
              id={id}
              value={body}
              maxLength={COMMENT_MAX}
              onChange={(e) => setBody(e.target.value)}
              placeholder={t("placeholder")}
              aria-invalid={error ? true : undefined}
              aria-describedby={`${id}-hint${error ? ` ${id}-error` : ""}`}
              className="min-h-24"
            />
            <p id={`${id}-hint`} className="text-xs text-body">
              {t("hint")}
              {remaining <= 100 && ` ${t("charsLeft", { count: remaining })}`}
            </p>
            {error && (
              <p id={`${id}-error`} role="alert" className="text-sm font-bold text-destructive">
                {error}
              </p>
            )}
            <div className="flex justify-end">
              <Button type="submit" disabled={sending || body.trim() === ""} aria-busy={sending}>
                {sending ? t("sending") : t("submit")}
              </Button>
            </div>
          </form>
        ) : (
          <p className="text-body">
            <Link
              href={{ pathname: "/sign-in", query: { next } }}
              className="font-extrabold text-primary underline underline-offset-4"
            >
              {t("signIn")}
            </Link>{" "}
            {t("signInText")}
          </p>
        )}
      </div>

      <ConfirmDialog
        open={deleting !== null}
        title={t("deleteTitle")}
        text={t("deleteText")}
        confirmLabel={t("delete")}
        cancelLabel={t("cancel")}
        destructive
        pending={pendingDelete}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </section>
  )
}
