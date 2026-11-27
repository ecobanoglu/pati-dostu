"use client"

import { ArrowLeft, Lock } from "lucide-react"
import { useFormatter, useTranslations } from "next-intl"
import { Fragment, type ReactNode, useLayoutEffect, useRef } from "react"

import { PdMark } from "@/components/brand/logo"
import { UserAvatar } from "@/components/layout/user-avatar"
import { Link } from "@/i18n/navigation"
import { cn } from "@/lib/utils"

import { Composer } from "./composer"
import { dayLabel, istanbulDay, messageTime } from "./time"
import type { Conversation, Message } from "./types"

/** Kullanıcı en alttan bu kadar yakınsa yeni mesajda liste aşağı kayar (yukarıda eski mesaj okurken kaymaz). */
const STICK_TO_BOTTOM_PX = 120

/**
 * Konuşma paneli (tasarım 01-sayfalar/12, sağ taraf): üstte karşı taraf (mobilde geri oku), altında ilan kartı,
 * ortada gün ayraçlı mesaj balonları (benimkiler sağda mor), "Okundu", en altta güvenlik notu ve yazma kutusu.
 * Mesaj listesi `role="log"`: ekran okuyucu yeni gelen mesajı okur. Taslakta (ilk mesaj) mesaj yerine `intro`.
 */
export function ChatPanel({
  other,
  listing,
  messages,
  readUpTo,
  hasMore,
  loadingOlder,
  onLoadOlder,
  onBack,
  onSend,
  sendError,
  blockedNote,
  intro,
  headerAction,
  now,
}: {
  other: { name: string; image: string | null; deleted: boolean }
  listing: Conversation["listing"]
  messages: Message[]
  readUpTo: string | null
  hasMore: boolean
  loadingOlder: boolean
  onLoadOlder: () => void
  onBack: () => void
  onSend: (body: string) => Promise<boolean>
  sendError: string | null
  /** Yazılamıyorsa nedeni (yazma kutusu yerine gösterilir). */
  blockedNote: string | null
  /** Taslak konuşmada mesajların yerine gösterilen açıklama. */
  intro?: ReactNode
  /** Başlığın sağındaki eylem ("Şikâyet et"; tasarımdaki "Şikayet / engelle" — engelleme v1.1). */
  headerAction?: ReactNode
  now: Date
}) {
  const t = useTranslations("Messages")
  const tl = useTranslations("Listing")
  const format = useFormatter()
  const logRef = useRef<HTMLDivElement>(null)
  const name = other.deleted ? t("deletedUser") : other.name

  // Kaydırma: ilk açılışta en alta; yeni mesajda kullanıcı alttaysa en alta; eski mesajlar eklenince yerinde kal.
  const last = messages.at(-1)?.id
  const first = messages[0]?.id
  const prev = useRef<{ first?: string; last?: string; height: number }>({ height: 0 })
  useLayoutEffect(() => {
    const el = logRef.current
    if (!el) return
    const p = prev.current
    if (p.first && first !== p.first && last === p.last) {
      // Üste eski mesajlar eklendi: görünen mesaj yerinde kalsın.
      el.scrollTop += el.scrollHeight - p.height
    } else if (!p.last || last !== p.last) {
      // Güncellemeden önceki yüksekliğe göre: kullanıcı en alttaydı mı?
      const nearBottom = p.height - el.scrollTop - el.clientHeight < STICK_TO_BOTTOM_PX
      const mineNew = messages.at(-1)?.mine
      if (!p.last || nearBottom || mineNew) el.scrollTop = el.scrollHeight
    }
    prev.current = { first, last, height: el.scrollHeight }
  }, [first, last, messages])

  // "Okundu": karşı tarafın okuduğu son mesajım (yalnız onun altında yazar).
  const lastReadMine = readUpTo
    ? messages.filter((m) => m.mine && !m.pending && m.createdAt <= readUpTo).at(-1)?.id
    : undefined

  const listingLinked = listing.status === "active" && !listing.deleted && listing.slug
  const listingCard = (
    <>
      <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-smoke-2">
        {listing.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- depodaki ilan kapağı, küçük kare
          <img src={listing.coverUrl} alt="" className="size-full object-cover" />
        ) : (
          <PdMark className="size-6 opacity-30 grayscale" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-bold text-primary">{t("listingLabel")}</span>
        <span className="block truncate font-extrabold text-heading">{listing.title}</span>
      </span>
      <span
        className={cn(
          "shrink-0 rounded-full px-2.5 py-1 text-xs font-extrabold",
          listing.status === "active" && !listing.deleted
            ? "bg-success-soft text-success-text"
            : "bg-smoke-2 text-heading"
        )}
      >
        {listing.deleted ? t("listingRemoved") : tl(`status.${listing.status}` as "status.active")}
      </span>
    </>
  )

  return (
    <section aria-label={t("conversationWith", { name })} className="flex min-h-0 flex-1 flex-col">
      <header className="flex min-h-18 items-center gap-3 border-b border-border px-3 py-3 lg:px-5">
        <button
          type="button"
          onClick={onBack}
          aria-label={t("back")}
          className="flex size-tap shrink-0 items-center justify-center rounded-full text-heading hover:bg-smoke-2 focus-visible:outline-2 focus-visible:outline-ring lg:hidden"
        >
          <ArrowLeft aria-hidden="true" className="size-6" />
        </button>
        <UserAvatar user={{ name, role: "user", image: other.image }} className="size-10 bg-smoke text-primary" />
        <h2 className="min-w-0 flex-1 truncate text-lg font-extrabold text-heading">{name}</h2>
        {headerAction}
      </header>

      <div ref={logRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 lg:px-5">
        {listingLinked ? (
          <Link
            href={{ pathname: "/listing/[slug]", params: { slug: `${listing.slug}-${listing.listingNo}` } }}
            className="mb-4 flex items-center gap-3 rounded-card border border-border bg-background p-3 hover:bg-smoke-2/60 focus-visible:outline-2 focus-visible:outline-ring"
          >
            {listingCard}
          </Link>
        ) : (
          <div className="mb-4 flex items-center gap-3 rounded-card border border-border bg-background p-3">
            {listingCard}
          </div>
        )}

        {hasMore && (
          <div className="mb-3 flex justify-center">
            <button
              type="button"
              onClick={onLoadOlder}
              disabled={loadingOlder}
              aria-busy={loadingOlder}
              className="min-h-tap rounded-full border border-border px-4 text-sm font-extrabold text-heading hover:bg-smoke-2 focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-60"
            >
              {t("loadOlder")}
            </button>
          </div>
        )}

        {intro}

        <ol role="log" aria-live="polite" aria-label={t("messagesLabel")} className="grid gap-2.5">
          {messages.map((m, i) => {
            const newDay =
              i === 0 || istanbulDay(new Date(messages[i - 1]!.createdAt)) !== istanbulDay(new Date(m.createdAt))
            return (
              <Fragment key={m.id}>
                {newDay && (
                  <li className="my-1 flex justify-center" aria-hidden="true">
                    <span className="rounded-full bg-smoke-2 px-3 py-0.5 text-xs font-bold text-body">
                      {dayLabel(m.createdAt, now, format, t("today"), t("yesterday"))}
                    </span>
                  </li>
                )}
                <li className={cn("flex", m.mine ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-4 py-3 lg:max-w-[70%]",
                      m.mine
                        ? "rounded-br-md bg-primary text-primary-foreground"
                        : "rounded-bl-md border border-border bg-background text-heading",
                      m.pending && "opacity-70"
                    )}
                  >
                    <span className="sr-only">{m.mine ? t("youSaid") : t("theySaid", { name })}</span>
                    <p className="text-[15px] leading-relaxed break-words whitespace-pre-wrap">{m.body}</p>
                    <p className={cn("mt-1 text-right text-xs", m.mine ? "text-primary-foreground/85" : "text-body")}>
                      {m.pending ? t("sending") : messageTime(m.createdAt, format)}
                      {m.id === lastReadMine && ` · ${t("read")}`}
                    </p>
                  </div>
                </li>
              </Fragment>
            )
          })}
        </ol>
      </div>

      <div className="border-t border-border px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:px-5 lg:pb-4">
        <p className="mb-2.5 flex items-start gap-2 text-xs text-body">
          <Lock aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
          {t("safety")}
        </p>
        {blockedNote ? (
          <p role="status" className="rounded-xl bg-smoke-2 px-4 py-3 text-sm font-bold text-heading">
            {blockedNote}
          </p>
        ) : (
          <Composer onSend={onSend} error={sendError} autoFocus />
        )}
      </div>
    </section>
  )
}
