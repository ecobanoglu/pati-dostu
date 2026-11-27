import { Check, ThumbsUp } from "lucide-react"
import { getFormatter, getLocale, getTranslations } from "next-intl/server"

import { buttonVariants } from "@/components/ui/button"
import { getPathname, Link, redirect } from "@/i18n/navigation"
import type { Locale } from "@/i18n/routing"
import { apiServer } from "@/lib/server-api"
import { getCurrentUser } from "@/lib/session"
import { cn } from "@/lib/utils"

type Tab = "topics" | "replies" | "following"
type Counts = { topics: number; replies: number; following: number }

/** GET /me/forum/topics|following öğesi (apps/api › MyForumTopic). */
type MyTopic = {
  id: string
  slug: string
  title: string
  category: { slug: string; name: string }
  isSolved: boolean
  answerCount: number
  createdAt: string
  lastActivityAt: string
  bestAnswerAuthor: string | null
}

/** GET /me/forum/replies öğesi (apps/api › MyForumReply). */
type MyReply = {
  id: string
  excerpt: string
  likeCount: number
  isBestAnswer: boolean
  createdAt: string
  topic: { slug: string; title: string; isSolved: boolean; category: { slug: string; name: string } }
}

type Page<T> = { items: T[]; total: number; page: number; pageSize: number; counts: Counts }

/** Adresteki sekme değerleri (Türkçe) ↔ sekmeler. */
const TAB_URL: Record<Tab, string | null> = { topics: null, replies: "cevaplar", following: "takip" }
const ENDPOINT: Record<Tab, string> = { topics: "topics", replies: "replies", following: "following" }

/** Sekmenin (ve sayfanın) bağlantısı. */
function tabHref(tab: Tab, page = 1) {
  const query: Record<string, string> = {}
  if (TAB_URL[tab]) query.sekme = TAB_URL[tab]!
  if (page > 1) query.sayfa = String(page)
  return { pathname: "/account/questions" as const, query }
}

/** Konunun durum rozeti: Çözüldü (yeşil), Açık (mor; cevabı var), Cevap bekliyor (sarı; cevapsız). */
function StatusBadge({ topic, labels }: { topic: MyTopic; labels: Record<"solved" | "open" | "waiting", string> }) {
  const [label, tone] = topic.isSolved
    ? [labels.solved, "bg-success-soft text-success-text"]
    : topic.answerCount > 0
      ? [labels.open, "bg-smoke text-primary"]
      : [labels.waiting, "bg-notice-soft text-notice-text"]
  return <span className={cn("rounded-full px-2 py-0.5 text-xs font-extrabold", tone)}>{label}</span>
}

/**
 * Hesabım › Sorularım (tasarım 02-hesabim/03, 10): Sorularım / Cevaplarım / Takip ettiklerim sekmeleri (sayılarıyla;
 * adreste `sekme`, `sayfa`). Konu satırı: kategori + durum, başlık, alt bilgi (en iyi cevabın yazarı / "en iyi cevabı
 * seçerek…" ipucu / "henüz cevap yok"), cevap sayısı. Cevap satırı: konu, cevabın özeti, en iyi cevap rozeti, Faydalı
 * sayısı. Oturum yoksa girişe yönlendirir. Oturum ve adres okuduğu için <Suspense> içinde render edilir.
 */
export async function MyQuestions({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const locale = (await getLocale()) as Locale
  const user = await getCurrentUser()
  if (!user) {
    return redirect({
      href: { pathname: "/sign-in", query: { next: getPathname({ href: "/account/questions", locale }) } },
      locale,
    })
  }
  const search = await searchParams
  const sekme = typeof search.sekme === "string" ? search.sekme : null
  const tab: Tab = sekme === "cevaplar" ? "replies" : sekme === "takip" ? "following" : "topics"
  const page = Math.max(1, Number.parseInt(typeof search.sayfa === "string" ? search.sayfa : "1", 10) || 1)

  const [t, format, data] = await Promise.all([
    getTranslations("MyQuestions"),
    getFormatter(),
    apiServer<Page<MyTopic | MyReply>>(`/me/forum/${ENDPOINT[tab]}?page=${page}&locale=${locale}`),
  ])
  const result = data ?? { items: [], total: 0, page: 1, pageSize: 20, counts: { topics: 0, replies: 0, following: 0 } }
  const now = new Date()
  const labels = { solved: t("solved"), open: t("open"), waiting: t("waiting") }
  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize))
  const topicHref = (category: string, slug: string) => ({
    pathname: "/community/[category]/[slug]" as const,
    params: { category, slug },
  })

  const tabs: Array<{ tab: Tab; label: string; count: number }> = [
    { tab: "topics", label: t("tabTopics"), count: result.counts.topics },
    { tab: "replies", label: t("tabReplies"), count: result.counts.replies },
    { tab: "following", label: t("tabFollowing"), count: result.counts.following },
  ]

  return (
    <div className="overflow-hidden rounded-card border border-border bg-background">
      <nav aria-label={t("tabsLabel")} className="border-b border-border">
        <ul className="flex flex-wrap gap-x-1 px-2 lg:px-3">
          {tabs.map((x) => (
            <li key={x.tab} className="flex">
              <Link
                href={tabHref(x.tab)}
                aria-current={x.tab === tab ? "page" : undefined}
                className={cn(
                  "-mb-px flex min-h-13 items-center gap-1.5 border-b-[3px] px-3 text-[15px] font-extrabold whitespace-nowrap",
                  "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
                  x.tab === tab ? "border-primary text-primary" : "border-transparent text-heading hover:text-primary"
                )}
              >
                {x.label} <span>{format.number(x.count)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {result.items.length === 0 ? (
        <div className="grid justify-items-center gap-3 px-6 py-12 text-center">
          <p className="max-w-sm text-body">{t(`empty.${tab}`)}</p>
          <Link
            href={tab === "topics" ? "/community/ask" : "/community"}
            className={buttonVariants({ variant: tab === "topics" ? "default" : "outline" })}
          >
            {tab === "topics" ? t("ask") : t("browse")}
          </Link>
        </div>
      ) : tab === "replies" ? (
        <ul className="divide-y divide-border">
          {(result.items as MyReply[]).map((r) => (
            <li key={r.id} className="px-4 py-4 lg:px-5">
              <p className="flex flex-wrap items-center gap-2 text-[13px] font-extrabold text-primary">
                {r.topic.category.name}
                {r.isBestAnswer && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-success px-2 py-0.5 text-xs text-white">
                    <Check aria-hidden="true" className="size-3" />
                    {t("bestAnswer")}
                  </span>
                )}
              </p>
              <Link
                href={{ ...topicHref(r.topic.category.slug, r.topic.slug), hash: `reply-${r.id}` }}
                className="mt-1 block text-[17px] font-extrabold text-heading hover:text-primary focus-visible:outline-2 focus-visible:outline-ring"
              >
                {r.topic.title}
              </Link>
              <p className="mt-1 border-l-[3px] border-smoke pl-3 text-[15px] text-body">{r.excerpt}</p>
              <p className="mt-1.5 flex items-center gap-1.5 text-sm text-body">
                <ThumbsUp aria-hidden="true" className="size-4" />
                {t("helpful", { count: r.likeCount })} · {format.relativeTime(new Date(r.createdAt), now)}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="divide-y divide-border">
          {(result.items as MyTopic[]).map((x) => (
            <li key={x.id} className="flex flex-col gap-2 px-4 py-4 lg:flex-row lg:items-center lg:gap-6 lg:px-5">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-[13px] font-extrabold text-primary">
                  {x.category.name}
                  <StatusBadge topic={x} labels={labels} />
                </p>
                <Link
                  href={topicHref(x.category.slug, x.slug)}
                  className="mt-1 block text-[17px] font-extrabold text-heading hover:text-primary focus-visible:outline-2 focus-visible:outline-ring"
                >
                  {x.title}
                </Link>
                <p className="mt-0.5 text-sm text-body">
                  {tab === "following"
                    ? t("lastActivity", { time: format.relativeTime(new Date(x.lastActivityAt), now) })
                    : x.isSolved && x.bestAnswerAuthor
                      ? t("bestBy", { name: x.bestAnswerAuthor })
                      : x.answerCount > 0
                        ? t("chooseBestHint")
                        : t("noAnswerYet", { time: format.relativeTime(new Date(x.createdAt), now) })}
                </p>
              </div>
              <p className="w-16 text-center max-lg:text-left">
                <span className="block text-xl font-extrabold text-heading">{format.number(x.answerCount)}</span>
                <span className="text-xs text-body">{t("answersShort")}</span>
              </p>
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 && (
        <nav
          aria-label={t("pagination")}
          className="flex items-center justify-between gap-3 border-t border-border p-3"
        >
          {result.page > 1 ? (
            <Link
              href={tabHref(tab, result.page - 1)}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "min-h-tap")}
            >
              {t("previous")}
            </Link>
          ) : (
            <span />
          )}
          <span className="text-sm text-body">{t("pageOf", { page: result.page, total: totalPages })}</span>
          {result.page < totalPages ? (
            <Link
              href={tabHref(tab, result.page + 1)}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "min-h-tap")}
            >
              {t("next")}
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  )
}

/** Yüklenirken: sekme şeridi ve satır iskeletleri. */
export function MyQuestionsFallback() {
  return (
    <div aria-hidden="true" className="rounded-card border border-border bg-background">
      <div className="h-13 border-b border-border" />
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="grid gap-2 border-b border-border p-5 last:border-0">
          <div className="h-4 w-32 rounded bg-smoke-2" />
          <div className="h-5 w-2/3 animate-pulse rounded bg-smoke-2 motion-reduce:animate-none" />
        </div>
      ))}
    </div>
  )
}
