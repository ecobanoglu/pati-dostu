import { ArrowRight, ExternalLink } from "lucide-react"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getFormatter, getLocale, getTranslations } from "next-intl/server"

import { PdMark } from "@/components/brand/logo"
import { extractToc, TiptapContent } from "@/components/content/tiptap"
import { ViewTracker } from "@/components/tracking/view-tracker"
import { Link, permanentRedirect } from "@/i18n/navigation"
import type { Locale } from "@/i18n/routing"
import { getPost, type PostDetailData } from "@/lib/posts"

import { BlogCard, CategoryBadge, PostCover, postHref, RegionLabel } from "./post-cards"
import { ShareBox } from "./share-box"
import { TableOfContents } from "./table-of-contents"

type PostType = "blog" | "news"
type Params = Promise<{ slug: string }>

/** Sekme başlığı, açıklama ve paylaşım kartı (başlık, özet, kapak). */
export async function postMetadata(type: PostType, params: Params): Promise<Metadata> {
  const { slug } = await params
  const locale = await getLocale()
  const post = await getPost(decodeURIComponent(slug), locale).catch(() => null)
  if (!post) return {}
  const t = await getTranslations("Posts")
  return {
    title: t(type === "blog" ? "metaTitleBlogPost" : "metaTitleNewsPost", { title: post.title }),
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt ?? undefined,
      type: "article",
      publishedTime: post.publishedAt,
      images: post.coverUrl ? [post.coverUrl] : [],
    },
  }
}

/** Yazarın küçük resmi: fotoğrafı yoksa marka işareti (yazıları editör hesabı yayınlar). */
function AuthorAvatar({ author }: { author: PostDetailData["author"] }) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary"
    >
      {author.image ? (
        // eslint-disable-next-line @next/next/no-img-element -- depo adresi (avatars/)
        <img src={author.image} alt="" className="size-full object-cover" />
      ) : (
        <PdMark tone="dark" className="size-7" />
      )}
    </span>
  )
}

/**
 * Blog yazısı / haber detayı (tasarım 03-icerik/02, 04, 11, 13): yol izi, rozetler, başlık, yazar · tarih · okuma
 * süresi, kapak, Tiptap içeriği; masaüstünde sağda İçindekiler + Paylaş + "Hazır mısınız?" (blog) ya da "Diğer
 * haberler" (haber), mobilde İçindekiler içeriğin üstünde açılır kutu. Blogda etiketler (yalnız gösterim — karar) ve
 * "İlgili yazılar"; haberde "Kaynak" bağlantısı. Yanlış türün adresinden gelinirse doğru adrese kalıcı yönlendirir.
 */
export async function PostDetailView({ type, params }: { type: PostType; params: Params }) {
  const { slug } = await params
  const locale = (await getLocale()) as Locale
  const post = await getPost(decodeURIComponent(slug), locale)
  if (!post) notFound()
  if (post.type !== type) permanentRedirect({ href: postHref(post), locale })

  const [t, format] = await Promise.all([getTranslations("Posts"), getFormatter()])
  const toc = type === "blog" ? extractToc(post.content) : []
  const date = format.dateTime(new Date(post.publishedAt), { dateStyle: "long" })
  const isBlog = type === "blog"

  const crumbLast = isBlog
    ? post.category && {
        label: post.category.name,
        href: { pathname: "/blog" as const, query: { kategori: post.category.slug } },
      }
    : post.region && {
        label: t(`region.${post.region}`),
        href: { pathname: "/news" as const, query: { bolge: post.region === "tr" ? "turkiye" : "dunya" } },
      }

  return (
    <>
      <ViewTracker storageKey={`post:${post.id}`} path={`/posts/${post.id}/views`} />
      {/* Mobilde site şeridi: "Blog" / "Haberler" (tasarım 11, 13) — bölüme dönüş bağlantısı */}
      <div className="bg-smoke lg:hidden">
        <Link
          href={isBlog ? "/blog" : "/news"}
          className="mx-auto block max-w-site px-4 py-5 text-h2 font-extrabold text-heading"
        >
          {isBlog ? t("blogTitle") : t("newsTitle")}
        </Link>
      </div>
      <article className="mx-auto max-w-site px-4 pt-5 pb-12 lg:px-6 lg:pt-8">
        <nav aria-label="breadcrumb" className="text-sm max-lg:hidden">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link href="/" className="font-bold text-primary">
                {t("breadcrumbHome")}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href={isBlog ? "/blog" : "/news"} className="font-bold text-primary">
                {isBlog ? t("blogTitle") : t("newsTitle")}
              </Link>
            </li>
            {crumbLast && (
              <>
                <li aria-hidden="true">/</li>
                <li>
                  <Link href={crumbLast.href} className="text-heading hover:text-primary">
                    {crumbLast.label}
                  </Link>
                </li>
              </>
            )}
          </ol>
        </nav>

        <header className="mt-0 grid max-w-4xl justify-items-start gap-3 lg:mt-3">
          <p className="flex flex-wrap items-center gap-2">
            {post.region && <RegionLabel region={post.region} />}
            {post.category && <CategoryBadge name={post.category.name} className="px-2.5 py-0.5" />}
          </p>
          <h1 className="text-h2 leading-tight font-extrabold text-heading lg:text-[46px]">{post.title}</h1>
          <p className="flex flex-wrap items-center gap-x-1 gap-y-1 text-sm text-body">
            {isBlog && <AuthorAvatar author={post.author} />}
            <span className={isBlog ? "ml-2 font-extrabold text-heading" : undefined}>
              {isBlog ? post.author.name : date}
            </span>
            <span aria-hidden="true">·</span>
            <span>{isBlog ? date : post.author.name}</span>
            {post.readingTime && (
              <>
                <span aria-hidden="true">·</span>
                <span>{t("readingTime", { minutes: post.readingTime })}</span>
              </>
            )}
          </p>
        </header>

        <PostCover
          post={post}
          className="mt-5 aspect-[16/9] w-full rounded-card object-[50%_30%] lg:mt-7 lg:aspect-[12/5]"
        />

        <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-8 lg:mt-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-12">
          <div className="grid content-start gap-6">
            {toc.length > 0 && (
              <div className="lg:hidden">
                <TableOfContents items={toc} variant="mobile" />
              </div>
            )}
            <TiptapContent doc={post.content} lead />

            {!isBlog && post.sourceName && (
              <p>
                {post.sourceUrl ? (
                  <a
                    href={post.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="inline-flex min-h-13 items-center gap-2 rounded-card border border-border px-5 font-extrabold text-heading hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring max-sm:w-full"
                  >
                    <ExternalLink aria-hidden="true" className="size-4" />
                    {t("source", { name: post.sourceName })}
                    <span className="sr-only">{t("opensNewTab")}</span>
                  </a>
                ) : (
                  <span className="inline-flex min-h-13 items-center gap-2 rounded-card border border-border px-5 font-extrabold text-heading max-sm:w-full">
                    <ExternalLink aria-hidden="true" className="size-4" />
                    {t("source", { name: post.sourceName })}
                  </span>
                )}
              </p>
            )}

            {post.tags.length > 0 && (
              <ul aria-label={t("tags")} className="flex flex-wrap gap-2 border-t border-border pt-5">
                {post.tags.map((tag) => (
                  <li
                    key={tag.slug}
                    className="rounded-full bg-smoke-2 px-3 py-1.5 text-sm font-extrabold text-heading"
                  >
                    #{tag.name}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <aside className="grid content-start gap-5">
            {toc.length > 0 && (
              <div className="max-lg:hidden">
                <TableOfContents items={toc} variant="desktop" />
              </div>
            )}
            {isBlog ? (
              <>
                <ShareBox title={post.title} />
                <Link
                  href="/listings"
                  className="group grid gap-1 rounded-card bg-primary px-5 py-4 text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <span className="text-lg font-extrabold">{t("ctaTitle")}</span>
                  <span className="flex items-center gap-1 text-sm">
                    {t("ctaText")}
                    <ArrowRight
                      aria-hidden="true"
                      className="size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
                    />
                  </span>
                </Link>
              </>
            ) : (
              <>
                {post.related.length > 0 && (
                  <section aria-labelledby="other-news" className="rounded-card border border-border p-5">
                    <h2 id="other-news" className="border-b border-border pb-2 text-lg font-extrabold text-heading">
                      {t("otherNews")}
                    </h2>
                    <ul className="divide-y divide-border">
                      {post.related.map((r) => (
                        <li key={r.id} className="py-3">
                          <p className="text-xs text-primary">
                            {[
                              r.region && t(`region.${r.region}`),
                              format.dateTime(new Date(r.publishedAt), { dateStyle: "long" }),
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                          <Link href={postHref(r)} className="mt-1 block font-extrabold text-title hover:text-primary">
                            {r.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
                <ShareBox title={post.title} />
              </>
            )}
          </aside>
        </div>

        {isBlog && post.related.length > 0 && (
          <section aria-labelledby="related-title" className="mt-10 border-t border-border pt-8">
            <h2 id="related-title" className="text-h3 font-extrabold text-heading">
              {t("related")}
            </h2>
            <ul className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
              {post.related.map((r) => (
                <li key={r.id} className="grid">
                  <BlogCard post={r} headingLevel={3} />
                </li>
              ))}
            </ul>
          </section>
        )}
      </article>
    </>
  )
}

/** Yüklenirken: başlık, kapak ve metin iskeleti. */
export function PostDetailFallback() {
  return (
    <div aria-hidden="true" className="mx-auto grid max-w-site gap-5 px-4 py-8 lg:px-6">
      <div className="h-12 w-3/4 rounded-lg bg-smoke-2" />
      <div className="aspect-[16/9] animate-pulse rounded-card bg-smoke-2 motion-reduce:animate-none lg:aspect-[12/5]" />
      <div className="h-40 rounded-lg bg-smoke-2" />
    </div>
  )
}
