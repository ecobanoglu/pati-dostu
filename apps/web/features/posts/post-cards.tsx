import { ArrowRight, Globe } from "lucide-react"
import { useFormatter, useTranslations } from "next-intl"

import { PdMark } from "@/components/brand/logo"
import { Link } from "@/i18n/navigation"
import type { PostCardData } from "@/lib/posts"
import { cn } from "@/lib/utils"

/** Yazının adresi: blogda /blog/{slug}, haberde /haberler/{slug}. */
export function postHref(post: Pick<PostCardData, "type" | "slug">) {
  return post.type === "blog"
    ? ({ pathname: "/blog/[slug]", params: { slug: post.slug } } as const)
    : ({ pathname: "/news/[slug]", params: { slug: post.slug } } as const)
}

/** Kapak görseli; yoksa marka işaretli gri yer tutucu. */
export function PostCover({ post, className }: { post: PostCardData; className?: string }) {
  if (!post.coverUrl)
    return (
      <div aria-hidden="true" className={cn("flex items-center justify-center bg-smoke-2", className)}>
        <PdMark className="size-16 opacity-30 grayscale" />
      </div>
    )
  return (
    // eslint-disable-next-line @next/next/no-img-element -- depo adresi (R2/RustFS); next/image uzak yükleyici yayına çıkarken ayarlanacak
    <img src={post.coverUrl} alt="" loading="lazy" className={cn("bg-smoke-2 object-cover", className)} />
  )
}

/** Açık mor kategori / tür rozeti. */
export function CategoryBadge({ name, className }: { name: string; className?: string }) {
  return (
    <span
      className={cn("inline-flex rounded-full bg-smoke px-3 py-1 text-[13px] font-extrabold text-primary", className)}
    >
      {name}
    </span>
  )
}

/** Haber bölgesi: dünya ikonu + "Türkiye" / "Dünya". */
export function RegionLabel({ region }: { region: "tr" | "world" }) {
  const t = useTranslations("Posts")
  return (
    <span className="inline-flex items-center gap-1 text-[13px] font-extrabold text-heading">
      <Globe aria-hidden="true" className="size-3.5" />
      {t(`region.${region}`)}
    </span>
  )
}

/**
 * Blog kartı (tasarım 03-icerik/01, 10): kapak, kategori rozeti, başlık, özet ve "Devamını oku". Başlık bağlantısı
 * kartın tamamını kaplar (kart başına tek bağlantı; "Devamını oku" görsel ipucu).
 */
export function BlogCard({ post, headingLevel = 2 }: { post: PostCardData; headingLevel?: 2 | 3 }) {
  const t = useTranslations("Posts")
  const Heading = headingLevel === 2 ? "h2" : "h3"
  return (
    <article className="relative flex flex-col overflow-hidden rounded-card border border-border bg-background focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring hover:border-primary">
      <PostCover post={post} className="aspect-[16/9] w-full" />
      <div className="flex flex-1 flex-col items-start gap-3 p-5">
        {post.category && <CategoryBadge name={post.category.name} />}
        <Heading className="text-xl leading-snug font-extrabold text-title">
          <Link href={postHref(post)} className="text-title outline-none after:absolute after:inset-0">
            {post.title}
          </Link>
        </Heading>
        {post.excerpt && <p className="line-clamp-3 text-[15px] text-body">{post.excerpt}</p>}
        <span
          aria-hidden="true"
          className="mt-auto inline-flex min-h-tap items-center gap-2 rounded-xl border-2 border-primary px-5 font-extrabold text-primary"
        >
          {t("readMore")}
          <ArrowRight className="size-4" />
        </span>
      </div>
    </article>
  )
}

/** Öne çıkan yazı (blog ilk sayfası, masaüstünde iki sütun): "Öne çıkan" rozeti, kategori · okuma süresi, yazar · tarih. */
export function FeaturedCard({ post }: { post: PostCardData }) {
  const t = useTranslations("Posts")
  const format = useFormatter()
  return (
    <article className="relative grid overflow-hidden rounded-card border border-border bg-background focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring hover:border-primary lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <PostCover post={post} className="aspect-[16/9] w-full lg:aspect-auto lg:h-full lg:min-h-80" />
      <div className="flex flex-col items-start justify-center gap-3 p-5 lg:p-8">
        <span className="rounded-full bg-secondary px-3 py-1 text-[13px] font-extrabold text-heading">
          {t("featured")}
        </span>
        <p className="text-sm font-extrabold text-primary">
          {[post.category?.name, post.readingTime ? t("readingTime", { minutes: post.readingTime }) : null]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <h2 className="text-h3 leading-tight font-extrabold text-title lg:text-[30px]">
          <Link href={postHref(post)} className="text-title outline-none after:absolute after:inset-0">
            {post.title}
          </Link>
        </h2>
        {post.excerpt && <p className="text-base text-primary">{post.excerpt}</p>}
        <p className="text-[13px] text-primary">
          {post.author.name} · {format.dateTime(new Date(post.publishedAt), { dateStyle: "long" })}
        </p>
      </div>
    </article>
  )
}

/**
 * Haber satırı (tasarım 03-icerik/03, 12): masaüstünde solda görsel, sağda bölge + tür + tarih · kaynak, başlık, özet;
 * mobilde görsel üstte. Başlık bağlantısı satırın tamamını kaplar.
 */
export function NewsRow({ post }: { post: PostCardData }) {
  const t = useTranslations("Posts")
  const format = useFormatter()
  return (
    <article className="relative grid gap-4 py-5 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring sm:grid-cols-[260px_minmax(0,1fr)] sm:gap-5">
      <PostCover post={post} className="aspect-[16/9] w-full rounded-card sm:aspect-[26/17]" />
      <div className="grid content-start gap-2">
        <p className="flex flex-wrap items-center gap-2">
          {post.region && <RegionLabel region={post.region} />}
          {post.category && <CategoryBadge name={post.category.name} className="px-2 py-0.5 text-xs" />}
          <span className="text-[13px] text-primary">
            {format.dateTime(new Date(post.publishedAt), { dateStyle: "long" })}
            {post.sourceName && ` · ${t("source", { name: post.sourceName })}`}
          </span>
        </p>
        <h2 className="text-xl leading-snug font-extrabold text-title lg:text-[22px]">
          <Link href={postHref(post)} className="text-title outline-none after:absolute after:inset-0">
            {post.title}
          </Link>
        </h2>
        {post.excerpt && <p className="text-[15px] text-primary">{post.excerpt}</p>}
      </div>
    </article>
  )
}
