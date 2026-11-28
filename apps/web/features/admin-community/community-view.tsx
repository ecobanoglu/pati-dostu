import type { Metadata } from "next"
import { getLocale, getTranslations } from "next-intl/server"

import { AdminTopBar } from "@/components/layout/admin/admin-top-bar"
import { buttonVariants } from "@/components/ui/button"
import { Link } from "@/i18n/navigation"
import { requireAdmin } from "@/lib/admin"
import { getForumCategories } from "@/lib/forum"
import { apiServer } from "@/lib/server-api"
import { cn } from "@/lib/utils"

import { CommunityFilters } from "./community-filters"
import { RepliesTable, TopicsTable } from "./community-table"
import { communityApiPath, communityHref, type CommunityState, parseCommunityQuery } from "./query"
import type { AdminForumPage, AdminReplyRow, AdminTopicRow } from "./types"

type SearchParams = Record<string, string | string[] | undefined>

/** Sekme başlığı: "Topluluk". */
export async function communityMetadata(): Promise<Metadata> {
  const t = await getTranslations("AdminCommunity")
  return { title: t("title") }
}

/**
 * Admin › Topluluk (tasarım yok — admin İlanlar düzeninde). Sekmeler: Konular, Cevaplar, Silinenler (sayılarıyla;
 * silinenlerde Konular / Cevaplar çipleri, salt okunur — geri alma yok, karar). Arama + kategori (+ konularda
 * sıralama), tablo / mobil kartlar, sayfalama. Süzgeçler adreste. Oturum ve adres okuduğu için <Suspense> içinde.
 */
export async function CommunityView({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdmin()
  const locale = await getLocale()
  const state = parseCommunityQuery(await searchParams)
  const topicsMode = state.tab === "topics" || (state.tab === "deleted" && state.kind === "topics")
  const [t, categories, data] = await Promise.all([
    getTranslations("AdminCommunity"),
    getForumCategories(locale),
    apiServer<AdminForumPage<AdminTopicRow | AdminReplyRow>>(communityApiPath(state, locale)),
  ])
  if (!data) throw new Error("Topluluk listesi okunamadı")
  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize))
  const filtered = Boolean(state.q || state.category)
  const deleted = state.tab === "deleted"
  const tabs: Array<{ key: CommunityState["tab"]; count: number }> = [
    { key: "topics", count: data.counts.topics },
    { key: "replies", count: data.counts.replies },
    { key: "deleted", count: data.counts.deletedTopics + data.counts.deletedReplies },
  ]

  return (
    <>
      <AdminTopBar title={t("title")} crumbs={[{ label: t("title") }]} />
      <div className="grid gap-5 px-4 py-5 lg:px-7 lg:py-6">
        <section
          aria-labelledby="admin-community-title"
          className="overflow-hidden rounded-card border border-border bg-background"
        >
          <h2 id="admin-community-title" className="sr-only">
            {t("title")}
          </h2>
          <nav aria-label={t("tabsLabel")} className="overflow-x-auto border-b border-border">
            <ul className="flex min-w-max gap-1 px-3">
              {tabs.map((tab) => {
                const active = state.tab === tab.key
                return (
                  <li key={tab.key}>
                    <Link
                      href={communityHref({ ...state, tab: tab.key, kind: "topics", sort: "new", page: 1 })}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "inline-flex min-h-13 items-center gap-1.5 border-b-3 px-3 font-extrabold whitespace-nowrap",
                        active ? "border-primary text-primary" : "border-transparent text-heading hover:text-primary"
                      )}
                    >
                      {t(`tabs.${tab.key}`)}
                      <span className={active ? undefined : "text-body"}>{tab.count}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>
          {deleted && (
            <nav aria-label={t("kindLabel")} className="px-4 pt-4">
              <ul className="flex gap-1.5">
                {(["topics", "replies"] as const).map((kind) => {
                  const active = state.kind === kind
                  const n = kind === "topics" ? data.counts.deletedTopics : data.counts.deletedReplies
                  return (
                    <li key={kind}>
                      <Link
                        href={communityHref({ ...state, kind, page: 1 })}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "inline-flex min-h-tap items-center gap-1 rounded-full px-4 text-sm font-extrabold",
                          active ? "bg-primary text-primary-foreground" : "bg-smoke text-heading hover:bg-smoke-2"
                        )}
                      >
                        {t(`tabs.${kind}`)} <span className={active ? undefined : "text-body"}>{n}</span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </nav>
          )}
          <CommunityFilters
            key={`${state.tab}.${state.kind}`}
            state={state}
            categories={categories.map(({ slug, name }) => ({ slug, name }))}
          />
          {data.items.length === 0 ? (
            <div className="grid justify-items-center gap-3 border-t border-border px-6 py-12 text-center">
              <p className="text-lg font-extrabold text-heading">{filtered ? t("emptyFiltered") : t("empty")}</p>
              {filtered && (
                <Link
                  href={communityHref({ ...state, q: "", category: null, page: 1 })}
                  className={buttonVariants({ variant: "outline" })}
                >
                  {t("clearFilters")}
                </Link>
              )}
            </div>
          ) : (
            <>
              {topicsMode ? (
                <TopicsTable
                  key={communityApiPath(state, locale)}
                  rows={data.items as AdminTopicRow[]}
                  categories={categories.map(({ id, name }) => ({ id, name }))}
                  deleted={deleted}
                />
              ) : (
                <RepliesTable
                  key={communityApiPath(state, locale)}
                  rows={data.items as AdminReplyRow[]}
                  deleted={deleted}
                />
              )}
              <p className="border-t border-border px-4 py-3 text-right text-sm text-body">
                {t("range", {
                  from: (state.page - 1) * data.pageSize + 1,
                  to: (state.page - 1) * data.pageSize + data.items.length,
                  total: data.total,
                })}
              </p>
            </>
          )}
        </section>
        {totalPages > 1 && (
          <nav aria-label={t("pagination")} className="flex items-center justify-center gap-3">
            {state.page > 1 && (
              <Link
                href={communityHref({ ...state, page: state.page - 1 })}
                className={buttonVariants({ variant: "outline" })}
              >
                {t("previous")}
              </Link>
            )}
            <span className="text-sm text-body">{t("pageOf", { page: state.page, total: totalPages })}</span>
            {state.page < totalPages && (
              <Link
                href={communityHref({ ...state, page: state.page + 1 })}
                className={buttonVariants({ variant: "outline" })}
              >
                {t("next")}
              </Link>
            )}
          </nav>
        )}
      </div>
    </>
  )
}
