import { Check, Lock, MessageCircle, Pin } from "lucide-react"
import { useFormatter, useLocale, useTranslations } from "next-intl"

import { Link } from "@/i18n/navigation"
import type { TopicCardData } from "@/lib/forum"
import { cn } from "@/lib/utils"

import { displayName } from "./query"

/** Konu rozetleri: kategori adı, "Sabit", "Çözüldü", "Veteriner cevapladı", "Kilitli". */
export function TopicBadges({ topic, size = "md" }: { topic: TopicCardData; size?: "sm" | "md" }) {
  const t = useTranslations("Community")
  const badge = cn(
    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-extrabold",
    size === "sm" ? "text-[11px]" : "text-xs"
  )
  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className={cn("font-extrabold text-primary", size === "sm" ? "text-xs" : "text-[13px]")}>
        {topic.category.name}
      </span>
      {topic.isPinned && (
        <span className={cn(badge, "bg-notice-soft text-notice-text")}>
          <Pin aria-hidden="true" className="size-3" />
          {t("pinned")}
        </span>
      )}
      {topic.isSolved && (
        <span className={cn(badge, "bg-success-soft text-success-text")}>
          <Check aria-hidden="true" className="size-3" />
          {t("solved")}
        </span>
      )}
      {topic.vetAnswered && <span className={cn(badge, "bg-smoke text-primary")}>{t("vetAnswered")}</span>}
      {topic.isLocked && (
        <span className={cn(badge, "bg-muted text-heading")}>
          <Lock aria-hidden="true" className="size-3" />
          {t("locked")}
        </span>
      )}
    </span>
  )
}

/**
 * Topluluk listesindeki konu satırı (tasarım 01-sayfalar/07, 24). Masaüstü: yazarın baş harfi, rozetler, başlık
 * (bağlantı), özet, "Ad · zaman", sağda cevap ve görüntülenme sayısı (cevapsızsa bordo "cevapsız"). Mobil: özet ve
 * görüntülenme yok; sağda yorum ikonu + sayı ya da "Cevapsız". Başlık bağlantısı satırın tamamını kaplar.
 */
export function TopicRow({ topic, now }: { topic: TopicCardData; now: Date }) {
  const t = useTranslations("Community")
  const format = useFormatter()
  const locale = useLocale()
  const name = displayName(topic.author.name, topic.author.role, locale)
  const time = format.relativeTime(new Date(topic.createdAt), now)
  const unanswered = topic.answerCount === 0

  return (
    <li className="relative flex gap-4 px-4 py-4 hover:bg-smoke-2/50 lg:px-5 lg:py-5">
      <span
        aria-hidden="true"
        className="hidden size-11 shrink-0 items-center justify-center rounded-full bg-smoke text-base font-extrabold text-primary lg:flex"
      >
        {name.charAt(0).toLocaleUpperCase(locale)}
      </span>
      <div className="min-w-0 flex-1">
        <TopicBadges topic={topic} />
        <h3 className="mt-1 text-[17px] leading-snug font-extrabold text-heading lg:text-lg">
          <Link
            href={{
              pathname: "/community/[category]/[slug]",
              params: { category: topic.category.slug, slug: topic.slug },
            }}
            className="text-heading after:absolute after:inset-0 hover:text-primary focus-visible:outline-none after:focus-visible:outline-2 after:focus-visible:-outline-offset-2 after:focus-visible:outline-ring"
          >
            {topic.title}
          </Link>
        </h3>
        <p className="mt-1 line-clamp-2 text-[15px] text-body max-lg:hidden">{topic.excerpt}</p>
        <p className="mt-1 flex items-center justify-between gap-3 text-sm text-body">
          <span>
            {name} · {time}
          </span>
          {/* Mobil: cevap sayısı ya da "Cevapsız" */}
          <span className="flex shrink-0 items-center gap-1 font-extrabold lg:hidden">
            {unanswered ? (
              <span className="flex items-center gap-1 text-destructive">
                <MessageCircle aria-hidden="true" className="size-4" />
                {t("unansweredLabel")}
              </span>
            ) : (
              <span className="flex items-center gap-1 text-heading">
                <MessageCircle aria-hidden="true" className="size-4" />
                <span className="sr-only">{t("answers", { count: topic.answerCount })}</span>
                <span aria-hidden="true">{format.number(topic.answerCount)}</span>
              </span>
            )}
          </span>
        </p>
      </div>
      {/* Masaüstü: sayılar */}
      <dl className="hidden shrink-0 gap-6 text-center lg:flex">
        <div className="w-14">
          <dt className="sr-only">{t("answersLabel")}</dt>
          <dd className={cn("text-lg font-extrabold", unanswered ? "text-destructive" : "text-heading")}>
            {format.number(topic.answerCount)}
          </dd>
          <dd aria-hidden="true" className={cn("text-xs", unanswered ? "text-destructive" : "text-body")}>
            {unanswered ? t("unansweredShort") : t("answersShort")}
          </dd>
        </div>
        <div className="w-20">
          <dt className="sr-only">{t("viewsLabel")}</dt>
          <dd className="text-lg font-extrabold text-heading">{format.number(topic.viewCount)}</dd>
          <dd aria-hidden="true" className="text-xs text-body">
            {t("viewsShort")}
          </dd>
        </div>
      </dl>
    </li>
  )
}
