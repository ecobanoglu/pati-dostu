import { MessageCircle } from "lucide-react"
import { getLocale, getTranslations } from "next-intl/server"

import { PdMark } from "@/components/brand/logo"
import { Link } from "@/i18n/navigation"
import { getTopics, type TopicCardData } from "@/lib/forum"
import { cn } from "@/lib/utils"

import { SectionHeader } from "./section-header"

/** Anasayfada gösterilen konu sayısı. */
const COUNT = 3

/** Konu görseli; yoksa açık mor zeminde marka işareti (tasarım "Konu görseli"). */
function TopicCover({ topic, className }: { topic: TopicCardData; className?: string }) {
  if (!topic.coverUrl)
    return (
      <div aria-hidden="true" className={cn("flex items-center justify-center bg-smoke", className)}>
        <PdMark className="size-10 opacity-30 grayscale lg:size-14" />
      </div>
    )
  return (
    // eslint-disable-next-line @next/next/no-img-element -- depo adresi (forum/); next/image uzak yükleyici yayına çıkarken ayarlanacak
    <img src={topic.coverUrl} alt="" loading="lazy" className={cn("bg-smoke object-cover", className)} />
  )
}

/**
 * "Topluluktan sorular" (tasarım 01, 16): en yeni 3 konu (karar). Masaüstünde görselli 3 sütun kart (kategori, başlık,
 * kısa açıklama, cevap sayısı); mobilde solda küçük görsel, yanda kategori + başlık + cevap sayısı. Kartın tamamı
 * konuya bağlantı. Veri `getTopics` (60 sn önbellek, `forum` etiketi).
 */
export async function CommunityQuestions() {
  const locale = await getLocale()
  const [t, page] = await Promise.all([
    getTranslations("HomePage"),
    getTopics(new URLSearchParams({ sort: "new", page: "1", locale }).toString()),
  ])
  const topics = page.items.slice(0, COUNT)

  return (
    <section aria-labelledby="community-home-title" className="mx-auto max-w-site px-4 py-6 lg:px-6 lg:py-10">
      <SectionHeader
        id="community-home-title"
        title={t("communityTitle")}
        href="/community"
        linkShort={t("allListingsShort")}
        linkLong={t("toCommunity")}
      />
      {topics.length === 0 ? (
        <p className="rounded-card border border-border p-6 text-body">
          {t("communityEmpty")}{" "}
          <Link href="/community/ask" className="font-extrabold text-primary">
            {t("askQuestion")}
          </Link>
        </p>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-3 lg:gap-6">
          {topics.map((topic) => (
            <li key={topic.id}>
              <article className="relative grid h-full grid-cols-[72px_minmax(0,1fr)] items-start gap-3 overflow-hidden rounded-card border border-border bg-background p-3 transition-shadow hover:shadow-pop lg:grid-cols-1 lg:content-start lg:gap-0 lg:p-0">
                <TopicCover
                  topic={topic}
                  className="aspect-square w-full rounded-xl lg:aspect-[12/5] lg:rounded-none"
                />
                <div className="grid gap-1 lg:gap-2 lg:p-5">
                  <p className="text-[13px] font-extrabold text-primary">{topic.category.name}</p>
                  <h3 className="text-[17px] leading-snug font-extrabold text-heading lg:text-lg">
                    <Link
                      href={{
                        pathname: "/community/[category]/[slug]",
                        params: { category: topic.category.slug, slug: topic.slug },
                      }}
                      className="text-title after:absolute after:inset-0 after:rounded-card hover:text-primary focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-ring"
                    >
                      {topic.title}
                    </Link>
                  </h3>
                  {topic.excerpt && <p className="line-clamp-2 text-[15px] text-body max-lg:hidden">{topic.excerpt}</p>}
                  <p className="flex items-center gap-1.5 text-sm font-extrabold text-heading lg:mt-1">
                    <MessageCircle aria-hidden="true" className="size-4" />
                    {t("answers", { count: topic.answerCount })}
                  </p>
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
export function CommunityQuestionsFallback() {
  return (
    <div aria-hidden="true" className="mx-auto max-w-site px-4 py-6 lg:px-6 lg:py-10">
      <div className="mb-5 h-9 w-56 rounded bg-smoke-2 lg:mb-7" />
      <div className="grid gap-3 lg:grid-cols-3 lg:gap-6">
        {Array.from({ length: COUNT }, (_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-card bg-smoke-2 motion-reduce:animate-none lg:h-80" />
        ))}
      </div>
    </div>
  )
}
