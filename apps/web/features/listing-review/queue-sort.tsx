"use client"

import { useTranslations } from "next-intl"

import { useRouter } from "@/i18n/navigation"

import { reviewHref, type ReviewState } from "./query"

/** Kuyruk sıralaması (En eski önce / En yeni önce): seçim adresi değiştirir, seçili ilan sıfırlanır. */
export function QueueSort({ state }: { state: ReviewState }) {
  const t = useTranslations("AdminReview")
  const router = useRouter()
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="queue-sort" className="text-sm font-bold text-heading">
        {t("sortLabel")}
      </label>
      <select
        id="queue-sort"
        value={state.sort}
        onChange={(e) =>
          router.push(reviewHref({ ...state, sort: e.target.value as ReviewState["sort"], listingNo: null }))
        }
        className="h-10 rounded-lg border border-input bg-smoke px-2 text-sm text-heading focus-visible:outline-2 focus-visible:outline-ring"
      >
        <option value="oldest">{t("sort.oldest")}</option>
        <option value="newest">{t("sort.newest")}</option>
      </select>
    </div>
  )
}
