"use client"

import { REPLY_BODY_MAX } from "@pati-dostu/validators"
import { Bell, BellOff, Check, Link2, Send, ThumbsUp, Trash2 } from "lucide-react"
import { useFormatter, useLocale, useTranslations } from "next-intl"
import { type FormEvent, useEffect, useId, useMemo, useRef, useState } from "react"

import { ConfirmDialog } from "@/components/dialog/confirm-dialog"
import { ReportButton } from "@/components/dialog/report-dialog"
import { Button, buttonVariants } from "@/components/ui/button"
import { Link, useRouter } from "@/i18n/navigation"
import { apiFetch } from "@/lib/api-browser"
import { useErrorMessage } from "@/lib/errors"
import type { ReplyData, TopicDetailData } from "@/lib/forum"
import { cn } from "@/lib/utils"

import { Markdown } from "./markdown"
import { MarkdownEditor } from "./markdown-editor"
import { displayName } from "./query"

/** Bakan kişi (sunucuda okunur): oturum + konudaki durumu. Misafirde null. */
export type TopicViewer = {
  id: string
  role: "user" | "clinic" | "shelter" | "admin"
  isAuthor: boolean
  following: boolean
  likedReplyIds: string[]
}

/** Rol rozeti metni ("Veteriner", "Barınak"); bireysel üyede ve admin'de rozet yok. */
function useRoleBadge() {
  const t = useTranslations("Community")
  return (role: string) => (role === "clinic" ? t("roleClinic") : role === "shelter" ? t("roleShelter") : null)
}

/**
 * Konunun etkileşimli kısmı (tasarım 01-sayfalar/08, 25): konu kartının altındaki eylemler (Takip et, Bağlantıyı
 * paylaş, Şikayet et, Sil), "N cevap", cevap kartları (en iyi cevap yeşil çerçeveli ve başta; Faydalı, En iyi cevap
 * seç/kaldır, Şikayet, Sil), masaüstünde biçimli cevap formu, mobilde alta sabit "Cevap yaz…" çubuğu. Misafire giriş
 * bağlantıları gösterilir. Değişiklikler sayfa yenilenmeden uygulanır.
 */
export function TopicThread({
  topic,
  viewer,
  next,
  now: nowIso,
}: {
  topic: TopicDetailData
  viewer: TopicViewer | null
  /** Misafirin girişten sonra döneceği adres (#reply ile forma). */
  next: string
  now: string
}) {
  const t = useTranslations("Community")
  const format = useFormatter()
  const locale = useLocale()
  const router = useRouter()
  const errorMessage = useErrorMessage()
  const roleBadge = useRoleBadge()
  const now = useMemo(() => new Date(nowIso), [nowIso])
  const formId = useId()

  const [replies, setReplies] = useState<ReplyData[]>(topic.replies)
  const [liked, setLiked] = useState<Set<string>>(new Set(viewer?.likedReplyIds ?? []))
  const [following, setFollowing] = useState(viewer?.following ?? false)
  const [status, setStatus] = useState("")
  const [body, setBody] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<{ kind: "topic" } | { kind: "reply"; id: string } | null>(null)
  const [pending, setPending] = useState(false)

  const isAdmin = viewer?.role === "admin"
  const sorted = [...replies].sort((a, b) =>
    a.isBestAnswer !== b.isBestAnswer ? (a.isBestAnswer ? -1 : 1) : a.createdAt.localeCompare(b.createdAt)
  )

  /** Takip et / bırak (yeni cevapta bildirim). */
  async function toggleFollow() {
    const on = !following
    setFollowing(on)
    const { error: err } = await apiFetch(`/forum/topics/${topic.id}/follow`, { method: on ? "PUT" : "DELETE" })
    if (err) setFollowing(!on)
    else setStatus(on ? t("followOn") : t("followOff"))
  }

  /** Konu bağlantısını paylaşır (destekleniyorsa sistem penceresi, değilse panoya kopyalar). */
  async function share() {
    const url = window.location.href.split("#")[0]!
    try {
      if (navigator.share) {
        await navigator.share({ title: topic.title, url })
        return
      }
      await navigator.clipboard.writeText(url)
      setStatus(t("linkCopied"))
    } catch {
      // Kullanıcı paylaşımı iptal etti.
    }
  }

  /** "Faydalı" ekler / geri alır (iyimser; hata olursa geri döner). */
  async function toggleLike(r: ReplyData) {
    const on = !liked.has(r.id)
    const apply = (yes: boolean, delta: number) => {
      setLiked((s) => {
        const n = new Set(s)
        if (yes) n.add(r.id)
        else n.delete(r.id)
        return n
      })
      setReplies((list) => list.map((x) => (x.id === r.id ? { ...x, likeCount: Math.max(0, x.likeCount + delta) } : x)))
    }
    apply(on, on ? 1 : -1)
    const { data, error: err } = await apiFetch<{ likeCount: number }>(`/forum/replies/${r.id}/like`, {
      method: on ? "PUT" : "DELETE",
    })
    if (err) {
      apply(!on, on ? -1 : 1)
      setStatus(errorMessage(err.code))
    } else if (data) {
      setReplies((list) => list.map((x) => (x.id === r.id ? { ...x, likeCount: data.likeCount } : x)))
    }
  }

  /** En iyi cevabı seçer ya da seçimi kaldırır (yalnız soru sahibi). */
  async function toggleBest(r: ReplyData) {
    const on = !r.isBestAnswer
    const { error: err } = await apiFetch(`/forum/replies/${r.id}/best-answer`, { method: on ? "POST" : "DELETE" })
    if (err) return setStatus(errorMessage(err.code))
    setReplies((list) => list.map((x) => ({ ...x, isBestAnswer: on && x.id === r.id })))
    setStatus(on ? t("bestChosen") : t("bestRemoved"))
    router.refresh()
  }

  /** Onaylanan silme işlemini yapar: konu silinince kategori listesine dönülür. */
  async function runDelete() {
    if (!confirm) return
    setPending(true)
    const path = confirm.kind === "topic" ? `/forum/topics/${topic.id}` : `/forum/replies/${confirm.id}`
    const { error: err } = await apiFetch(path, { method: "DELETE" })
    setPending(false)
    if (err) {
      setConfirm(null)
      return setStatus(errorMessage(err.code))
    }
    if (confirm.kind === "topic") {
      router.replace({ pathname: "/community/[category]", params: { category: topic.category.slug } })
      return
    }
    setReplies((list) => list.filter((x) => x.id !== confirm.id))
    setConfirm(null)
    setStatus(t("replyDeleted"))
  }

  /** Cevabı gönderir; başarılıysa listenin sonuna ekler. */
  async function send(text: string): Promise<boolean> {
    const value = text.trim()
    if (!value || sending) return false
    setSending(true)
    setError(null)
    const { data, error: err } = await apiFetch<ReplyData>(`/forum/topics/${topic.id}/replies`, {
      method: "POST",
      body: JSON.stringify({ body: value }),
    })
    setSending(false)
    if (!data) {
      setError(errorMessage(err?.code, err?.details))
      return false
    }
    setReplies((list) => [...list, data])
    setStatus(t("replyPosted"))
    requestAnimationFrame(() => document.getElementById(`reply-${data.id}`)?.scrollIntoView({ block: "center" }))
    return true
  }

  /** Masaüstü form gönderimi. */
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (await send(body)) setBody("")
  }

  return (
    <>
      <p role="status" className="sr-only">
        {status}
      </p>

      {/* Konu eylemleri */}
      <div className="flex flex-wrap items-center gap-2">
        {viewer ? (
          <button
            type="button"
            onClick={toggleFollow}
            aria-pressed={following}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "min-h-tap",
              following && "border-primary bg-smoke text-primary"
            )}
          >
            {following ? <BellOff aria-hidden="true" /> : <Bell aria-hidden="true" />}
            {following ? t("following") : t("follow")}
          </button>
        ) : (
          <Link
            href={{ pathname: "/sign-in", query: { next } }}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "min-h-tap")}
          >
            <Bell aria-hidden="true" />
            {t("follow")}
          </Link>
        )}
        <button
          type="button"
          onClick={share}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "min-h-tap max-lg:hidden")}
        >
          <Link2 aria-hidden="true" />
          {t("share")}
        </button>
        {!viewer?.isAuthor && (
          <ReportButton
            target="topic"
            id={topic.id}
            subject={topic.title}
            trigger="link"
            signedIn={Boolean(viewer)}
            next={next}
            className="px-2"
          />
        )}
        {(viewer?.isAuthor || isAdmin) && (
          <button
            type="button"
            onClick={() => setConfirm({ kind: "topic" })}
            className={cn(buttonVariants({ variant: "destructive-ghost", size: "sm" }), "min-h-tap")}
          >
            <Trash2 aria-hidden="true" />
            {t("deleteTopic")}
          </button>
        )}
      </div>

      {/* Cevaplar */}
      <section aria-labelledby="replies-title" className="mt-8 grid gap-4">
        <h2 id="replies-title" className="text-xl font-extrabold text-heading lg:text-h3">
          {replies.length === 0 ? t("noRepliesTitle") : t("answers", { count: replies.length })}
        </h2>
        {replies.length === 0 && <p className="text-body">{t("noRepliesText")}</p>}
        <ol className="grid gap-4">
          {sorted.map((r) => {
            const mine = viewer?.id === r.author.id
            const badge = roleBadge(r.author.role)
            const name = displayName(r.author.name, r.author.role, locale)
            return (
              <li
                key={r.id}
                id={`reply-${r.id}`}
                className={cn(
                  "scroll-mt-24 rounded-card border bg-background p-4 lg:p-6",
                  r.isBestAnswer ? "border-2 border-success bg-success-soft/40" : "border-border"
                )}
              >
                <div className="flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "flex size-11 shrink-0 items-center justify-center rounded-full text-base font-extrabold",
                      r.author.role === "clinic" ? "bg-primary text-primary-foreground" : "bg-smoke text-primary"
                    )}
                  >
                    {name.charAt(0).toLocaleUpperCase(locale)}
                  </span>
                  <div className="min-w-0 flex-1">
                    {r.isBestAnswer && (
                      <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-success px-2 py-0.5 text-xs font-extrabold text-white lg:hidden">
                        <Check aria-hidden="true" className="size-3" />
                        {t("bestAnswer")}
                      </span>
                    )}
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="font-extrabold text-heading">{name}</span>
                      {badge && (
                        <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-extrabold text-primary-foreground">
                          {badge}
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-body">
                      {badge ? t("orgMember") : t("member")} ·{" "}
                      <time dateTime={r.createdAt}>
                        {format.relativeTime(
                          new Date(r.createdAt),
                          new Date(Math.max(now.getTime(), Date.parse(r.createdAt)))
                        )}
                      </time>
                    </p>
                  </div>
                  {r.isBestAnswer && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-success px-2.5 py-1 text-xs font-extrabold text-white max-lg:hidden">
                      <Check aria-hidden="true" className="size-3.5" />
                      {t("bestAnswer")}
                    </span>
                  )}
                </div>
                <Markdown text={r.body} className="mt-3 text-[15px] leading-relaxed text-heading lg:text-base" />
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {viewer && !mine ? (
                    <button
                      type="button"
                      onClick={() => toggleLike(r)}
                      aria-pressed={liked.has(r.id)}
                      className={cn(
                        buttonVariants({ variant: "outline", size: "sm" }),
                        "min-h-tap",
                        liked.has(r.id) && "border-primary bg-smoke text-primary"
                      )}
                    >
                      <ThumbsUp aria-hidden="true" />
                      {t("helpful", { count: r.likeCount })}
                    </button>
                  ) : viewer ? (
                    <span className="inline-flex min-h-tap items-center gap-1.5 px-1 text-sm font-bold text-body">
                      <ThumbsUp aria-hidden="true" className="size-4" />
                      {t("helpful", { count: r.likeCount })}
                    </span>
                  ) : (
                    <Link
                      href={{ pathname: "/sign-in", query: { next } }}
                      className={cn(buttonVariants({ variant: "outline", size: "sm" }), "min-h-tap")}
                    >
                      <ThumbsUp aria-hidden="true" />
                      {t("helpful", { count: r.likeCount })}
                    </Link>
                  )}
                  {viewer?.isAuthor && (
                    <button
                      type="button"
                      onClick={() => toggleBest(r)}
                      className={cn(
                        buttonVariants({ variant: r.isBestAnswer ? "ghost" : "outline", size: "sm" }),
                        "min-h-tap",
                        !r.isBestAnswer && "border-success text-success-text hover:bg-success-soft"
                      )}
                    >
                      <Check aria-hidden="true" />
                      {r.isBestAnswer ? t("unmarkBest") : t("markBest")}
                    </button>
                  )}
                  <span className="flex-1" />
                  {viewer && !mine && <ReportButton target="reply" id={r.id} subject={name} trigger="icon" signedIn />}
                  {(mine || isAdmin) && (
                    <button
                      type="button"
                      onClick={() => setConfirm({ kind: "reply", id: r.id })}
                      aria-label={t("deleteReply")}
                      className="flex size-tap items-center justify-center rounded-full text-body hover:bg-danger-soft hover:text-danger focus-visible:outline-2 focus-visible:outline-ring"
                    >
                      <Trash2 aria-hidden="true" className="size-4" />
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ol>

        {/* Masaüstü cevap formu */}
        <div
          id="reply"
          className="scroll-mt-24 rounded-card border border-border bg-background p-4 max-lg:hidden lg:p-6"
        >
          {viewer ? (
            <form onSubmit={submit} className="grid gap-2">
              <label htmlFor={formId} className="text-[15px] font-extrabold text-heading">
                {t("replyLabel")}
              </label>
              <MarkdownEditor
                id={formId}
                value={body}
                onChange={setBody}
                maxLength={REPLY_BODY_MAX}
                placeholder={t("replyPlaceholder")}
                aria-invalid={error ? true : undefined}
                aria-describedby={`${formId}-hint${error ? ` ${formId}-error` : ""}`}
              />
              <p id={`${formId}-hint`} className="text-xs text-body">
                {t("replyHint")}
              </p>
              {error && (
                <p id={`${formId}-error`} role="alert" className="text-sm font-bold text-destructive">
                  {error}
                </p>
              )}
              <div className="flex justify-end">
                <Button type="submit" disabled={sending || body.trim() === ""} aria-busy={sending}>
                  {sending ? t("sending") : t("sendReply")}
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
              {t("signInToReply")}
            </p>
          )}
        </div>
      </section>

      <MobileReplyBar viewer={viewer} next={next} onSend={send} sending={sending} error={error} />

      <ConfirmDialog
        open={confirm !== null}
        title={confirm?.kind === "topic" ? t("deleteTopicTitle") : t("deleteReplyTitle")}
        text={confirm?.kind === "topic" ? t("deleteTopicText") : t("deleteReplyText")}
        confirmLabel={t("delete")}
        cancelLabel={t("cancel")}
        destructive
        pending={pending}
        onConfirm={runDelete}
        onCancel={() => setConfirm(null)}
      />
    </>
  )
}

/**
 * Mobilde alta sabit cevap çubuğu (tasarım 25): kendiliğinden büyüyen tek satır + gönder. Biçim araç çubuğu yok
 * (masaüstünde var); misafire giriş butonu.
 */
function MobileReplyBar({
  viewer,
  next,
  onSend,
  sending,
  error,
}: {
  viewer: TopicViewer | null
  next: string
  onSend: (text: string) => Promise<boolean>
  sending: boolean
  error: string | null
}) {
  const t = useTranslations("Community")
  const id = useId()
  const ref = useRef<HTMLTextAreaElement>(null)
  const [value, setValue] = useState("")

  // Yazdıkça yüksekliği ayarla (en fazla ~5 satır).
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`
  }, [value])

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
      {viewer ? (
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            if (await onSend(value)) setValue("")
          }}
          className="grid gap-1"
        >
          <div className="flex items-end gap-2">
            <label htmlFor={id} className="sr-only">
              {t("replyLabel")}
            </label>
            <textarea
              ref={ref}
              id={id}
              rows={1}
              value={value}
              maxLength={REPLY_BODY_MAX}
              onChange={(e) => setValue(e.target.value)}
              placeholder={t("replyShortPlaceholder")}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${id}-error` : undefined}
              className="min-h-12 flex-1 resize-none rounded-3xl border border-border bg-background px-4 py-3 text-base text-heading placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-ring"
            />
            <button
              type="submit"
              disabled={sending || value.trim() === ""}
              aria-label={sending ? t("sending") : t("sendReply")}
              className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-50"
            >
              <Send aria-hidden="true" className="size-5" />
            </button>
          </div>
          {error && (
            <p id={`${id}-error`} role="alert" className="px-2 text-sm font-bold text-destructive">
              {error}
            </p>
          )}
        </form>
      ) : (
        <Link href={{ pathname: "/sign-in", query: { next } }} className={cn(buttonVariants(), "w-full")}>
          {t("signInToReplyButton")}
        </Link>
      )}
    </div>
  )
}
