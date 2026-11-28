"use client"

import { Search } from "lucide-react"
import { useTranslations } from "next-intl"
import { type FormEvent, useState } from "react"

import { Select } from "@/components/form/input"
import { useRouter } from "@/i18n/navigation"
import { cn } from "@/lib/utils"

import { communityHref, type CommunityState } from "./query"

/**
 * Topluluk süzgeçleri: arama (konu başlığı / metin, yazarın adı ya da e-postası — Enter ile), kategori ve (konular
 * sekmesinde) sıralama. Seçim adresi değiştirir, sayfa 1'e döner.
 */
export function CommunityFilters({
  state,
  categories,
}: {
  state: CommunityState
  categories: Array<{ slug: string; name: string }>
}) {
  const t = useTranslations("AdminCommunity")
  const router = useRouter()
  const [q, setQ] = useState(state.q)

  /** Yeni süzgeçle listeye gider. */
  const go = (next: Partial<CommunityState>) => router.push(communityHref({ ...state, ...next, page: 1 }))

  /** Arama formu gönderildi. */
  const onSearch = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    go({ q: q.trim() })
  }

  return (
    <div
      className={cn(
        "grid gap-2 p-4",
        state.tab === "topics" ? "sm:grid-cols-[minmax(0,1fr)_auto_auto]" : "sm:grid-cols-[minmax(0,1fr)_auto]"
      )}
    >
      <form role="search" onSubmit={onSearch} className="relative">
        <label htmlFor="admin-community-q" className="sr-only">
          {t("searchLabel")}
        </label>
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-body"
        />
        <input
          id="admin-community-q"
          type="search"
          value={q}
          maxLength={100}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className={cn(
            "h-12 w-full rounded-lg border border-input bg-background pr-4 pl-10 text-base text-heading placeholder:text-body/70",
            "focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-ring"
          )}
        />
      </form>
      <div>
        <label htmlFor="admin-community-category" className="sr-only">
          {t("categoryLabel")}
        </label>
        <Select
          id="admin-community-category"
          value={state.category ?? ""}
          onChange={(e) => go({ category: e.target.value || null })}
          className="bg-smoke sm:w-56"
        >
          <option value="">{t("allCategories")}</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>
      {state.tab === "topics" && (
        <div>
          <label htmlFor="admin-community-sort" className="sr-only">
            {t("sortLabel")}
          </label>
          <Select
            id="admin-community-sort"
            value={state.sort}
            onChange={(e) => go({ sort: e.target.value as CommunityState["sort"] })}
            className="bg-smoke sm:w-48"
          >
            <option value="new">{t("sort.new")}</option>
            <option value="old">{t("sort.old")}</option>
            <option value="replies">{t("sort.replies")}</option>
          </Select>
        </div>
      )}
    </div>
  )
}
