import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getLocale, getTranslations } from "next-intl/server"
import { Suspense } from "react"

import { buttonVariants } from "@/components/ui/button"
import { Link } from "@/i18n/navigation"
import { getPosts } from "@/lib/posts"

import { NewsletterBox, SuggestNewsBox } from "./newsletter"
import { NewsRow } from "./post-cards"
import { Chips, PostsBand, PostsPagination } from "./posts-shared"
import { parsePostsQuery, postsHref, toPostsApiQuery } from "./query"

type SearchParams = Record<string, string | string[] | undefined>

/** Sekme başlığı ve açıklaması: "Haberler". */
export async function newsMetadata(): Promise<Metadata> {
  const t = await getTranslations("Posts")
  return { title: t("newsTitle"), description: t("newsSubtitle") }
}

/**
 * Haber listesi (tasarım 03-icerik/03, 12): mor şerit, bölge çipleri (Tümü / Türkiye / Dünya — `?bolge=`), tür
 * çipleri (Hepsi / Haber / Duyuru / Etkinlik — `?tur=`), haber satırları, sayfa numaraları; masaüstünde sağda
 * "Haftalık bülten" ve "Haber önerin" (mobilde liste sonunda). Adres okuduğu için <Suspense> içinde.
 */
export async function NewsView({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const locale = await getLocale()
  const state = parsePostsQuery("news", await searchParams)
  const [t, data] = await Promise.all([getTranslations("Posts"), getPosts(toPostsApiQuery("news", state, locale))])
  if (state.category && data.categories.length > 0 && !data.categories.some((c) => c.slug === state.category))
    notFound()
  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize))
  const filtered = Boolean(state.category || state.region)

  return (
    <>
      <PostsBand title={t("newsTitle")} subtitle={t("newsSubtitle")} />
      <div className="mx-auto grid max-w-site grid-cols-[minmax(0,1fr)] gap-6 px-4 pt-5 pb-12 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-8 lg:px-6 lg:pt-8">
        <div className="flex flex-col gap-3 lg:col-span-2 lg:flex-row lg:items-center lg:justify-between">
          <Chips
            label={t("regionLabel")}
            items={([null, "tr", "world"] as const).map((region) => ({
              key: region ?? "all",
              label: region ? t(`region.${region}`) : t("all"),
              href: postsHref("news", { ...state, region, page: 1 }),
              active: state.region === region,
            }))}
          />
          <Chips
            label={t("newsTypeLabel")}
            items={[{ slug: null, name: t("allTypes") }, ...data.categories].map((c) => ({
              key: c.slug ?? "all",
              label: c.name,
              href: postsHref("news", { ...state, category: c.slug, page: 1 }),
              active: (c.slug ?? null) === state.category,
            }))}
          />
        </div>

        <div className="grid content-start gap-6">
          {data.items.length === 0 ? (
            <div className="grid justify-items-center gap-3 rounded-card border border-border px-6 py-12 text-center">
              <p className="text-lg font-extrabold text-heading">{t("emptyNews")}</p>
              {filtered && (
                <Link href="/news" className={buttonVariants({ variant: "outline" })}>
                  {t("showAll")}
                </Link>
              )}
            </div>
          ) : (
            <section aria-label={t("newsLabel")}>
              <ul className="divide-y divide-border border-b border-border">
                {data.items.map((post) => (
                  <li key={post.id}>
                    <NewsRow post={post} />
                  </li>
                ))}
              </ul>
            </section>
          )}
          <PostsPagination
            current={state.page}
            total={totalPages}
            href={(page) => postsHref("news", { ...state, page })}
          />
        </div>

        <aside className="grid content-start gap-4">
          <Suspense fallback={<div className="h-52 rounded-card bg-smoke" />}>
            <NewsletterBox />
          </Suspense>
          <SuggestNewsBox />
        </aside>
      </div>
    </>
  )
}
