import { ArrowRight } from "lucide-react"
import { getLocale, getTranslations } from "next-intl/server"

import { PdMark } from "@/components/brand/logo"
import { Link } from "@/i18n/navigation"
import { getPosts, type PostCardData } from "@/lib/posts"
import { cn } from "@/lib/utils"

import { SectionHeader } from "./section-header"

/** Anasayfada gösterilen yazı sayısı. */
const COUNT = 3

/** Kapak görseli; yoksa gri zeminde marka işareti. */
function Cover({ post }: { post: PostCardData }) {
  const className = "aspect-[16/10] w-full lg:aspect-[16/9]"
  if (!post.coverUrl)
    return (
      <div aria-hidden="true" className={cn("flex items-center justify-center bg-smoke-2", className)}>
        <PdMark className="size-14 opacity-30 grayscale" />
      </div>
    )
  return (
    // eslint-disable-next-line @next/next/no-img-element -- depo adresi (posts/); next/image uzak yükleyici yayına çıkarken ayarlanacak
    <img src={post.coverUrl} alt="" loading="lazy" className={cn("bg-smoke-2 object-cover", className)} />
  )
}

/**
 * "Blogdan son yazılar" (tasarım 01, 16): en yeni 3 blog yazısı (öne çıkan dahil, yayın tarihine göre). Kart: kapak,
 * kategori rozeti, başlık, kısa açıklama (masaüstü), "Devamını oku" (masaüstünde çerçeveli düğme görünümü, mobilde
 * metin). Masaüstünde 3 sütun, mobilde yatay kaydırılan şerit. Kartın tamamı yazıya bağlantı; "Devamını oku" yalnız
 * görsel ipucu (ekran okuyucuda tekrar edilmez). Veri `getPosts` (5 dk önbellek, `posts` etiketi — editör kaydedince
 * yenilenir).
 */
export async function BlogHighlights() {
  const locale = await getLocale()
  const [t, page] = await Promise.all([
    getTranslations("HomePage"),
    getPosts(new URLSearchParams({ type: "blog", page: "1", locale }).toString()),
  ])
  const posts = [...(page.featured ? [page.featured] : []), ...page.items]
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, COUNT)

  return (
    <section aria-labelledby="blog-home-title" className="mx-auto max-w-site px-4 pt-6 pb-12 lg:px-6 lg:pt-10 lg:pb-20">
      <SectionHeader
        id="blog-home-title"
        title={t("blogTitle")}
        href="/blog"
        linkShort={t("allListingsShort")}
        linkLong={t("allPosts")}
      />
      {posts.length === 0 ? (
        <p className="rounded-card border border-border p-6 text-body">{t("blogEmpty")}</p>
      ) : (
        <ul className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 lg:mx-0 lg:grid lg:grid-cols-3 lg:gap-6 lg:overflow-visible lg:px-0 lg:pb-0">
          {posts.map((post) => (
            <li key={post.id} className="w-[78%] max-w-80 shrink-0 snap-start lg:w-auto lg:max-w-none">
              <article className="relative flex h-full flex-col overflow-hidden rounded-card border border-border bg-background transition-shadow hover:shadow-pop">
                <Cover post={post} />
                <div className="flex flex-1 flex-col items-start gap-2 p-4 lg:p-5">
                  {post.category && (
                    <span className="inline-flex rounded-full bg-smoke px-3 py-1 text-[13px] font-extrabold text-primary">
                      {post.category.name}
                    </span>
                  )}
                  <h3 className="text-lg leading-snug font-extrabold text-heading lg:text-xl">
                    <Link
                      href={{ pathname: "/blog/[slug]", params: { slug: post.slug } }}
                      className="text-title after:absolute after:inset-0 after:rounded-card hover:text-primary focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-ring"
                    >
                      {post.title}
                    </Link>
                  </h3>
                  {post.excerpt && <p className="line-clamp-2 text-[15px] text-body max-lg:hidden">{post.excerpt}</p>}
                  <span
                    aria-hidden="true"
                    className="mt-auto inline-flex items-center gap-1.5 pt-1 font-extrabold text-primary lg:min-h-11 lg:rounded-lg lg:border-2 lg:border-primary lg:px-4 lg:pt-0"
                  >
                    {t("readMore")}
                    <ArrowRight className="size-4" />
                  </span>
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/** Yüklenirken: başlık ve 3 kart iskeleti. */
export function BlogHighlightsFallback() {
  return (
    <div aria-hidden="true" className="mx-auto max-w-site px-4 pt-6 pb-12 lg:px-6 lg:pt-10 lg:pb-20">
      <div className="mb-5 h-9 w-56 rounded bg-smoke-2 lg:mb-7" />
      <div className="flex gap-3 overflow-hidden lg:grid lg:grid-cols-3 lg:gap-6">
        {Array.from({ length: COUNT }, (_, i) => (
          <div
            key={i}
            className="h-96 w-[78%] shrink-0 animate-pulse rounded-card bg-smoke-2 motion-reduce:animate-none lg:w-auto"
          />
        ))}
      </div>
    </div>
  )
}
