"use client"

import { useTranslations } from "next-intl"
import { useMemo, useState } from "react"

import { apiFetch } from "@/lib/api-browser"
import type { TopicCardData, TopicPageData } from "@/lib/forum"
import { cn } from "@/lib/utils"

import { TopicRow } from "./topic-row"

/**
 * Mobilde "Daha fazla konu yükle" (tasarım 24): sonraki sayfaları tarayıcıda getirip listenin altına ekler.
 * Masaüstünde sayfa numaraları kullanılır; bu bileşen orada görünmez. Liste durumu (kategori, arama, sıralama)
 * değişince sayfa yeniden üretildiği için bileşen de sıfırlanır (`key`).
 */
export function MoreTopics({
  apiQuery,
  page,
  totalPages,
  now: nowIso,
}: {
  /** Sayfa numarası olmadan API sorgusu (sort, category, q, locale). */
  apiQuery: string
  page: number
  totalPages: number
  now: string
}) {
  const t = useTranslations("Community")
  const now = useMemo(() => new Date(nowIso), [nowIso])
  const [items, setItems] = useState<TopicCardData[]>([])
  const [current, setCurrent] = useState(page)
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)

  /** Sonraki sayfayı getirir. */
  async function load() {
    setLoading(true)
    setFailed(false)
    const { data } = await apiFetch<TopicPageData>(`/forum/topics?${apiQuery}&page=${current + 1}`)
    setLoading(false)
    if (!data) return setFailed(true)
    setItems((list) => [...list, ...data.items.filter((x) => !list.some((y) => y.id === x.id))])
    setCurrent(current + 1)
  }

  return (
    <div className="lg:hidden">
      {items.length > 0 && (
        <ul className="divide-y divide-border border-t border-border">
          {items.map((topic) => (
            <TopicRow key={topic.id} topic={topic} now={now} />
          ))}
        </ul>
      )}
      {current < totalPages && (
        <div className="border-t border-border p-4">
          <button
            type="button"
            onClick={load}
            disabled={loading}
            aria-busy={loading}
            className={cn(
              "min-h-tap w-full rounded-xl border-2 border-primary px-4 font-extrabold text-primary",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60"
            )}
          >
            {loading ? t("loading") : t("loadMore")}
          </button>
          <p role="status" className="mt-2 text-center text-sm font-bold text-destructive empty:hidden">
            {failed ? t("loadFailed") : ""}
          </p>
        </div>
      )}
    </div>
  )
}
