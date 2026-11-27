import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getLocale, getTranslations } from "next-intl/server"

import { buttonVariants } from "@/components/ui/button"
import { Link } from "@/i18n/navigation"
import { getPosts } from "@/lib/posts"

import { BlogCard, FeaturedCard } from "./post-cards"
import { Chips, PostsBand, PostsPagination } from "./posts-shared"
import { parsePostsQuery, postsHref, toPostsApiQuery } from "./query"

type SearchParams = Record<string, string | string[] | undefined>

/** Sekme başlığı ve açıklaması: "Blog". */
export async function blogMetadata(): Promise<Metadata> {
  const t = await getTranslations("Posts")
  return { title: t("blogTitle"), description: t("blogSubtitle") }
}

/**
 * Blog listesi (tasarım 03-icerik/01, 10): mor şerit, kategori çipleri (`?kategori=`), ilk sayfada "Öne çıkan" yazı,
 * 3 sütunlu kartlar ve sayfa numaraları (`?sayfa=`). Adres okuduğu için <Suspense> içinde; JS'siz çalışır.
 */
export async function BlogView({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const locale = await getLocale()
  const state = parsePostsQuery("blog", await searchParams)
  const [t, data] = await Promise.all([getTranslations("Posts"), getPosts(toPostsApiQuery("blog", state, locale))])
  // Olmayan kategori: yumuşak 404 (topluluk ve ilan listesiyle aynı).
  if (state.category && data.categories.length > 0 && !data.categories.some((c) => c.slug === state.category))
    notFound()
  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize))
  const empty = data.items.length === 0 && !data.featured

  return (
    <>
      <PostsBand title={t("blogTitle")} subtitle={t("blogSubtitle")} />
      <div className="mx-auto grid max-w-site grid-cols-[minmax(0,1fr)] gap-6 px-4 pt-5 pb-12 lg:gap-7 lg:px-6 lg:pt-8">
        <Chips
          label={t("categoriesLabel")}
          items={[{ slug: null, name: t("all") }, ...data.categories].map((c) => ({
            key: c.slug ?? "all",
            label: c.name,
            href: postsHref("blog", { category: c.slug, region: null, page: 1 }),
            active: (c.slug ?? null) === state.category,
          }))}
        />
        {empty ? (
          <div className="grid justify-items-center gap-3 rounded-card border border-border px-6 py-12 text-center">
            <p className="text-lg font-extrabold text-heading">{t("emptyBlog")}</p>
            {state.category && (
              <Link href="/blog" className={buttonVariants({ variant: "outline" })}>
                {t("showAll")}
              </Link>
            )}
          </div>
        ) : (
          <>
            {data.featured && <FeaturedCard post={data.featured} />}
            {data.items.length > 0 && (
              <section aria-label={t("postsLabel")}>
                <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
                  {data.items.map((post) => (
                    <li key={post.id} className="grid">
                      <BlogCard post={post} />
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <PostsPagination
              current={state.page}
              total={totalPages}
              href={(page) => postsHref("blog", { ...state, page })}
            />
          </>
        )}
      </div>
    </>
  )
}
