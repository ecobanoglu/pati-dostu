import { ArrowLeft, ArrowRight, Plus, Search } from "lucide-react"
import type { Metadata } from "next"
import { getLocale, getTranslations } from "next-intl/server"

import { buttonVariants } from "@/components/ui/button"
import { notFound } from "next/navigation"

import { getPathname, Link } from "@/i18n/navigation"
import type { Locale } from "@/i18n/routing"
import { getForumCategories, getTopics } from "@/lib/forum"
import { cn } from "@/lib/utils"

import { MoreTopics } from "./more-topics"
import { type CommunityQuery, communityHref, parseCommunityQuery, toTopicsApiQuery } from "./query"
import { TopicRow } from "./topic-row"

type SearchParams = Record<string, string | string[] | undefined>

/** Sekme başlığı: "Topluluk" ya da "Beslenme · Topluluk". */
export async function communityMetadata(category: string | null): Promise<Metadata> {
  const locale = (await getLocale()) as Locale
  const [t, categories] = await Promise.all([getTranslations("Community"), getForumCategories(locale)])
  const c = categories.find((x) => x.slug === category)
  return {
    title: c ? t("metaTitleCategory", { category: c.name }) : t("metaTitle"),
    description: c?.description ?? t("metaDescription"),
  }
}

/**
 * Topluluk listesi (tasarım 01-sayfalar/07, 24): mor şerit (yol izi, başlık, açıklama, "Soru sor"), masaüstünde
 * solda kategoriler, sağda arama + En yeni / Popüler / Cevapsız sekmeleri + konu satırları + sayfa numaraları; mobilde
 * arama şeritte, kategoriler kaydırılan çipler, sayfalar "Daha fazla konu yükle" ile. Durum adreste (kategori yol
 * parçası; `ara`, `sirala`, `sayfa` sorgusu) — JS kapalıyken de çalışır. Adres okuduğu için <Suspense> içinde.
 */
export async function CommunityView({
  category,
  searchParams,
}: {
  category: string | null
  searchParams: Promise<SearchParams>
}) {
  const locale = (await getLocale()) as Locale
  const state = parseCommunityQuery(category, await searchParams)
  const [t, categories, page] = await Promise.all([
    getTranslations("Community"),
    getForumCategories(locale),
    getTopics(toTopicsApiQuery(state, locale)),
  ])
  const current = categories.find((c) => c.slug === category) ?? null
  // Olmayan kategori: sahte kategori sayfası olmasın (ilan listesindeki gibi yumuşak 404).
  if (category && categories.length > 0 && !current) notFound()
  const totalPages = Math.max(1, Math.ceil(page.total / page.pageSize))
  const now = new Date()
  const go = (changes: Partial<CommunityQuery>) => communityHref({ ...state, page: 1, ...changes })
  const searchAction = getPathname({ href: go({ q: null }), locale })

  const searchForm = (className: string) => (
    <form role="search" action={searchAction} method="get" className={className}>
      <label className="relative block">
        <span className="sr-only">{t("searchLabel")}</span>
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-body"
        />
        <input
          type="search"
          name="ara"
          defaultValue={state.q ?? ""}
          placeholder={t("searchLabel")}
          className="min-h-13 w-full rounded-2xl border border-border bg-background pr-4 pl-12 text-base text-heading placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
        />
      </label>
      {state.sort !== "new" && <input type="hidden" name="sirala" value={go({}).query.sirala} />}
    </form>
  )

  const tabs = (["new", "popular", "unanswered"] as const).map((sort) => ({
    sort,
    label: t(`sort.${sort}`),
    href: go({ sort }),
    active: state.sort === sort,
  }))

  return (
    <>
      <div className="bg-smoke">
        <div className="mx-auto max-w-site px-4 py-5 lg:px-6 lg:py-8">
          <nav aria-label="breadcrumb" className="text-sm max-lg:hidden">
            <ol className="flex flex-wrap items-center gap-2">
              <li>
                <Link href="/" className="font-bold text-primary">
                  {t("breadcrumbHome")}
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                {current ? (
                  <Link href="/community" className="font-bold text-primary">
                    {t("title")}
                  </Link>
                ) : (
                  <span aria-current="page" className="text-heading">
                    {t("title")}
                  </span>
                )}
              </li>
              {current && (
                <>
                  <li aria-hidden="true">/</li>
                  <li aria-current="page" className="text-heading">
                    {current.name}
                  </li>
                </>
              )}
            </ol>
          </nav>
          <div className="flex items-center justify-between gap-4 lg:mt-2 lg:items-end">
            <div>
              <h1 className="text-h2 font-extrabold text-heading lg:text-h1">{current ? current.name : t("title")}</h1>
              <p className="mt-1 text-body max-lg:hidden">{current?.description ?? t("subtitle")}</p>
            </div>
            <Link
              href={{ pathname: "/community/ask", query: category ? { kategori: category } : {} }}
              className={cn(buttonVariants({ size: "lg" }), "shrink-0")}
            >
              <Plus aria-hidden="true" />
              {t("ask")}
            </Link>
          </div>
          {searchForm("mt-4 lg:hidden")}
        </div>
      </div>

      <div className="mx-auto grid max-w-site grid-cols-[minmax(0,1fr)] gap-6 pb-10 lg:grid-cols-[240px_minmax(0,1fr)] lg:px-6 lg:py-8">
        {/* Kategoriler: masaüstünde sol kutu, mobilde kaydırılan çipler */}
        <nav aria-label={t("categoriesLabel")} className="lg:self-start">
          <div className="rounded-card border border-border p-3 max-lg:hidden">
            <h2 className="px-3 pt-2 pb-3 text-xl font-extrabold text-heading">{t("categories")}</h2>
            <ul className="grid gap-1">
              {[{ slug: null, name: t("allTopics") }, ...categories].map((c) => {
                const active = (c.slug ?? null) === category
                return (
                  <li key={c.slug ?? "all"}>
                    <Link
                      href={communityHref({ category: c.slug, q: null, sort: state.sort, page: 1 })}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex min-h-tap items-center rounded-xl px-3 text-[15px] font-bold focus-visible:outline-2 focus-visible:outline-ring",
                        active ? "bg-smoke text-primary" : "text-heading hover:bg-smoke-2"
                      )}
                    >
                      {c.name}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
          <ul className="flex gap-2 overflow-x-auto px-4 pt-4 pb-1 [scrollbar-width:none] lg:hidden">
            {[{ slug: null, name: t("allTopics") }, ...categories].map((c) => {
              const active = (c.slug ?? null) === category
              return (
                <li key={c.slug ?? "all"} className="shrink-0">
                  <Link
                    href={communityHref({ category: c.slug, q: null, sort: state.sort, page: 1 })}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex min-h-tap items-center rounded-full border px-4 text-[15px] font-extrabold whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-heading"
                    )}
                  >
                    {c.name}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="grid grid-cols-[minmax(0,1fr)] content-start gap-4">
          {searchForm("max-lg:hidden")}
          {state.q && (
            <p className="flex flex-wrap items-center gap-2 px-4 text-body lg:px-0">
              {t("searchResults", { q: state.q, count: page.total })}
              <Link href={go({ q: null })} className="font-extrabold text-primary underline underline-offset-4">
                {t("clearSearch")}
              </Link>
            </p>
          )}

          <section
            aria-labelledby="topics-title"
            className="lg:overflow-hidden lg:rounded-card lg:border lg:border-border"
          >
            <h2 id="topics-title" className="sr-only">
              {t("topicsLabel")}
            </h2>
            <nav aria-label={t("sortLabel")} className="border-b border-border">
              <ul className="grid grid-cols-3 lg:flex lg:gap-1 lg:px-3">
                {tabs.map((tab) => (
                  <li key={tab.sort} className="flex">
                    <Link
                      href={tab.href}
                      aria-current={tab.active ? "page" : undefined}
                      className={cn(
                        "-mb-px flex min-h-13 flex-1 items-center justify-center border-b-[3px] px-4 text-[15px] font-extrabold",
                        "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
                        tab.active
                          ? "border-primary text-primary"
                          : "border-transparent text-heading hover:text-primary"
                      )}
                    >
                      {tab.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            {page.items.length === 0 ? (
              <div className="grid justify-items-center gap-3 px-6 py-12 text-center">
                <p className="text-lg font-extrabold text-heading">
                  {state.q ? t("emptySearch") : state.sort === "unanswered" ? t("emptyUnanswered") : t("empty")}
                </p>
                {!state.q && state.sort !== "unanswered" && (
                  <Link
                    href={{ pathname: "/community/ask", query: category ? { kategori: category } : {} }}
                    className={buttonVariants()}
                  >
                    <Plus aria-hidden="true" />
                    {t("ask")}
                  </Link>
                )}
              </div>
            ) : (
              <>
                <ul className="divide-y divide-border">
                  {page.items.map((topic) => (
                    <TopicRow key={topic.id} topic={topic} now={now} />
                  ))}
                </ul>
                <MoreTopics
                  key={JSON.stringify(state)}
                  apiQuery={toTopicsApiQuery(state, locale).replace(/(^|&)page=\d+/, "")}
                  page={state.page}
                  totalPages={totalPages}
                  now={now.toISOString()}
                />
              </>
            )}
          </section>

          {totalPages > 1 && <Pagination state={state} total={totalPages} label={t("pagination")} />}
        </div>
      </div>
    </>
  )
}

/** Sayfa numaraları (masaüstü): önceki/sonraki ve bulunulan sayfa çevresi. */
async function Pagination({ state, total, label }: { state: CommunityQuery; total: number; label: string }) {
  const t = await getTranslations("Community")
  const current = state.page
  const pages = [...new Set([1, current - 1, current, current + 1, total])]
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b)
  const cell = "flex size-11 items-center justify-center rounded-lg border border-border font-extrabold"
  const href = (page: number) => communityHref({ ...state, page })
  return (
    <nav aria-label={label} className="hidden justify-center lg:flex">
      <ul className="flex items-center gap-2">
        {current > 1 && (
          <li>
            <Link href={href(current - 1)} aria-label={t("previous")} className={cn(cell, "hover:border-primary")}>
              <ArrowLeft aria-hidden="true" className="size-4" />
            </Link>
          </li>
        )}
        {pages.map((p, i) => (
          <li key={p} className="flex items-center gap-2">
            {i > 0 && p - (pages[i - 1] ?? p) > 1 && <span aria-hidden="true">…</span>}
            <Link
              href={href(p)}
              aria-label={t("pageLabel", { page: p })}
              aria-current={p === current ? "page" : undefined}
              className={cn(
                cell,
                p === current
                  ? "border-primary bg-primary text-primary-foreground"
                  : "text-heading hover:border-primary"
              )}
            >
              {p}
            </Link>
          </li>
        ))}
        {current < total && (
          <li>
            <Link href={href(current + 1)} aria-label={t("next")} className={cn(cell, "hover:border-primary")}>
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </li>
        )}
      </ul>
    </nav>
  )
}

/** Yüklenirken: şerit, sekme ve satır iskeletleri. */
export function CommunityFallback() {
  return (
    <div aria-hidden="true">
      <div className="h-44 bg-smoke" />
      <div className="mx-auto grid max-w-site gap-6 px-4 py-8 lg:grid-cols-[240px_minmax(0,1fr)] lg:px-6">
        <div className="h-96 rounded-card bg-smoke-2 max-lg:hidden" />
        <div className="grid content-start gap-3">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-card bg-smoke-2 motion-reduce:animate-none" />
          ))}
        </div>
      </div>
    </div>
  )
}
