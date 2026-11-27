import { Eye, Plus } from "lucide-react"
import type { Metadata } from "next"
import { getFormatter, getLocale, getTranslations } from "next-intl/server"
import { notFound } from "next/navigation"

import { ViewTracker } from "@/components/tracking/view-tracker"
import { buttonVariants } from "@/components/ui/button"
import { getPathname, Link, permanentRedirect } from "@/i18n/navigation"
import type { Locale } from "@/i18n/routing"
import { getSimilarTopics, getTopic, type SimilarTopicData } from "@/lib/forum"
import { apiServer } from "@/lib/server-api"
import { getCurrentUser } from "@/lib/session"
import { cn } from "@/lib/utils"

import { Markdown } from "./markdown"
import { displayName } from "./query"
import { TopicThread, type TopicViewer } from "./topic-thread"
import { TopicTopBar } from "./topic-top-bar"
import { TopicBadges } from "./topic-row"

type Params = Promise<{ category: string; slug: string }>

/** Sekme başlığı ve açıklaması: konu başlığı + ayrıntının ilk cümleleri. */
export async function topicMetadata(params: Params): Promise<Metadata> {
  const { slug } = await params
  const locale = (await getLocale()) as Locale
  const topic = await getTopic(decodeURIComponent(slug), locale).catch(() => null)
  if (!topic) return {}
  const t = await getTranslations("Community")
  return {
    title: t("metaTitleTopic", { title: topic.title }),
    description: topic.excerpt,
    openGraph: { title: topic.title, description: topic.excerpt, type: "article", images: topic.images.slice(0, 1) },
  }
}

/** Benzer konular listesi (masaüstünde sağ sütun, mobilde sayfa sonu). */
async function SimilarList({ items, className }: { items: SimilarTopicData[]; className?: string }) {
  const t = await getTranslations("Community")
  if (items.length === 0) return null
  return (
    <section aria-labelledby={`similar-${className ? "m" : "d"}`} className={className}>
      <h2 id={`similar-${className ? "m" : "d"}`} className="mb-2 text-xl font-extrabold text-heading">
        {t("similar")}
      </h2>
      <ul className="divide-y divide-border">
        {items.map((s) => (
          <li key={s.id} className="py-3">
            <Link
              href={{ pathname: "/community/[category]/[slug]", params: { category: s.category.slug, slug: s.slug } }}
              className="font-extrabold text-heading hover:text-primary focus-visible:outline-2 focus-visible:outline-ring"
            >
              {s.title}
            </Link>
            <p className="text-sm text-body">
              {s.category.name} · {t("answers", { count: s.answerCount })}
              {s.isSolved && ` · ${t("solved")}`}
            </p>
          </li>
        ))}
      </ul>
    </section>
  )
}

/**
 * Topluluk konusu (tasarım 01-sayfalar/08, 25): yol izi, konu kartı (rozetler, başlık, yazar, görüntülenme, biçimli
 * ayrıntı, fotoğraflar), etkileşimli kısım (`TopicThread`: eylemler, cevaplar, cevap formu), sağda benzer konular ve
 * "Aradığını bulamadın mı?". Mobilde kendi üst çubuğu, altta sabit cevap çubuğu, benzer konular sonda. Adres
 * `/topluluk/{kategori}/{konu}`; kategori yanlışsa doğru adrese kalıcı yönlendirilir. Konu verisi önbelleksiz okunur;
 * oturum açıksa konudaki durum (takip, beğeniler) sunucuda alınır. Oturuma baktığı için <Suspense> içinde render edilir.
 */
export async function TopicDetailView({ params }: { params: Params }) {
  const { category, slug } = await params
  const locale = (await getLocale()) as Locale
  const topic = await getTopic(decodeURIComponent(slug), locale)
  if (!topic) notFound()
  if (decodeURIComponent(category) !== topic.category.slug) {
    permanentRedirect({
      href: { pathname: "/community/[category]/[slug]", params: { category: topic.category.slug, slug: topic.slug } },
      locale,
    })
  }

  const user = await getCurrentUser()
  const [t, format, similar, state] = await Promise.all([
    getTranslations("Community"),
    getFormatter(),
    getSimilarTopics(topic.title, topic.categoryId, topic.id, locale),
    user
      ? apiServer<{ isAuthor: boolean; following: boolean; likedReplyIds: string[] }>(
          `/forum/topics/${topic.id}/viewer`
        )
      : Promise.resolve(null),
  ])
  const viewer: TopicViewer | null =
    user && state ? { id: user.id, role: user.role as TopicViewer["role"], ...state } : null
  const now = new Date()
  const self = {
    pathname: "/community/[category]/[slug]" as const,
    params: { category: topic.category.slug, slug: topic.slug },
  }
  const next = `${getPathname({ href: self, locale })}#reply`
  const author = displayName(topic.author.name, topic.author.role, locale)

  return (
    <>
      <TopicTopBar title={topic.title} category={topic.category.slug} />
      <ViewTracker storageKey={`topic:${topic.id}`} path={`/forum/topics/${topic.id}/views`} />

      <div className="mx-auto max-w-site px-4 pt-5 pb-32 lg:px-6 lg:py-8">
        <nav aria-label="breadcrumb" className="mb-4 text-sm max-lg:hidden">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link href="/" className="font-bold text-primary">
                {t("breadcrumbHome")}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href="/community" className="font-bold text-primary">
                {t("title")}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link
                href={{ pathname: "/community/[category]", params: { category: topic.category.slug } }}
                className="font-bold text-primary"
              >
                {topic.category.name}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="max-w-md truncate text-heading">
              {topic.title}
            </li>
          </ol>
        </nav>

        <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-8">
          <div className="min-w-0">
            <article className="lg:rounded-card lg:border lg:border-border lg:p-6">
              <TopicBadges topic={topic} />
              <h1 className="mt-2 text-h2 leading-tight font-extrabold text-heading lg:text-h1">{topic.title}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-body">
                <span
                  aria-hidden="true"
                  className="flex size-9 items-center justify-center rounded-full bg-smoke font-extrabold text-primary max-lg:hidden"
                >
                  {author.charAt(0).toLocaleUpperCase(locale)}
                </span>
                <span>
                  <span className="font-extrabold text-heading">{author}</span> ·{" "}
                  <time dateTime={topic.createdAt}>{format.relativeTime(new Date(topic.createdAt), now)}</time>
                  {topic.species && <> · {topic.species.name}</>}
                </span>
                <span className="flex items-center gap-1 lg:ml-auto">
                  <Eye aria-hidden="true" className="size-4 max-lg:hidden" />
                  <span className="lg:hidden">·</span>
                  {t("views", { count: topic.viewCount })}
                </span>
              </div>
              <Markdown text={topic.body} className="mt-4 text-base leading-relaxed text-heading" />
              {topic.images.length > 0 && (
                <div className={cn("mt-4 grid gap-3", topic.images.length > 1 && "sm:grid-cols-2")}>
                  {topic.images.map((src, i) => (
                    // eslint-disable-next-line @next/next/no-img-element -- depodaki konu fotoğrafı
                    <img
                      key={src}
                      src={src}
                      alt={t("imageAlt", { n: i + 1, title: topic.title })}
                      className="max-h-96 w-full rounded-2xl bg-smoke object-cover lg:max-w-md"
                      loading={i === 0 ? "eager" : "lazy"}
                    />
                  ))}
                </div>
              )}
            </article>
            <div className="mt-4">
              <TopicThread topic={topic} viewer={viewer} next={next} now={now.toISOString()} />
            </div>
            <SimilarList items={similar} className="mt-10 lg:hidden" />
          </div>

          <aside className="grid content-start gap-6 max-lg:hidden">
            <div className="rounded-card border border-border p-5">
              <SimilarList items={similar} />
              {similar.length === 0 && <p className="text-body">{t("noSimilar")}</p>}
            </div>
            <div className="rounded-card bg-smoke p-5">
              <h2 className="text-lg font-extrabold text-heading">{t("notFoundTitle")}</h2>
              <Link
                href={{ pathname: "/community/ask", query: { kategori: topic.category.slug } }}
                className={cn(buttonVariants(), "mt-3 w-full")}
              >
                <Plus aria-hidden="true" />
                {t("ask")}
              </Link>
              <p className="mt-3 text-sm text-heading">{t("emergencyNote")}</p>
            </div>
          </aside>
        </div>
      </div>
    </>
  )
}

/** Yüklenirken: başlık, kart ve cevap iskeletleri. */
export function TopicDetailFallback() {
  return (
    <div
      aria-hidden="true"
      className="mx-auto grid max-w-site gap-6 px-4 py-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:px-6"
    >
      <div className="grid content-start gap-4">
        <div className="h-64 animate-pulse rounded-card bg-smoke-2 motion-reduce:animate-none" />
        <div className="h-40 rounded-card bg-smoke-2" />
        <div className="h-40 rounded-card bg-smoke-2" />
      </div>
      <div className="h-72 rounded-card bg-smoke-2 max-lg:hidden" />
    </div>
  )
}
