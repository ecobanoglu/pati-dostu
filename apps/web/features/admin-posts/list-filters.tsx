"use client"

import { Search } from "lucide-react"
import { useTranslations } from "next-intl"
import { type FormEvent, useState } from "react"

import { Select } from "@/components/form/input"
import { useRouter } from "@/i18n/navigation"
import { cn } from "@/lib/utils"

import { type AdminPostsState, adminPostsHref } from "./query"
import type { AdminPostOptions } from "./types"

/**
 * Liste süzgeçleri (tasarım 07-admin/08): başlıkta arama (Enter ile), kategori ve sıralama. Seçim adresi değiştirir
 * (sayfa sunucuda yeniden üretilir), sayfa 1'e döner. Tür seçiliyse yalnız o türün kategorileri listelenir.
 */
export function ListFilters({
  state,
  categories,
}: {
  state: AdminPostsState
  categories: AdminPostOptions["categories"]
}) {
  const t = useTranslations("AdminPosts")
  const router = useRouter()
  const [q, setQ] = useState(state.q)

  /** Yeni süzgeçle listeye gider. */
  const go = (next: Partial<AdminPostsState>) => router.push(adminPostsHref({ ...state, ...next, page: 1 }))

  /** Arama formu gönderildi. */
  const onSearch = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    go({ q: q.trim() })
  }

  const visible = state.type ? categories.filter((c) => c.type === state.type) : categories
  const groups = (["blog", "news"] as const)
    .map((type) => ({ type, items: visible.filter((c) => c.type === type) }))
    .filter((g) => g.items.length > 0)

  return (
    <div className="grid gap-2 p-4 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
      <form role="search" onSubmit={onSearch} className="relative">
        <label htmlFor="admin-posts-q" className="sr-only">
          {t("searchLabel")}
        </label>
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-body"
        />
        <input
          id="admin-posts-q"
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
        <label htmlFor="admin-posts-category" className="sr-only">
          {t("categoryFilter")}
        </label>
        <Select
          id="admin-posts-category"
          value={state.category ?? ""}
          onChange={(e) => go({ category: e.target.value || null })}
          className="bg-smoke sm:w-52"
        >
          <option value="">{t("allCategories")}</option>
          {groups.map((g) => (
            <optgroup key={g.type} label={t(`type.${g.type}`)}>
              {g.items.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </optgroup>
          ))}
        </Select>
      </div>
      <div>
        <label htmlFor="admin-posts-sort" className="sr-only">
          {t("sortLabel")}
        </label>
        <Select
          id="admin-posts-sort"
          value={state.sort}
          onChange={(e) => go({ sort: e.target.value as AdminPostsState["sort"] })}
          className="bg-smoke sm:w-40"
        >
          <option value="new">{t("sort.new")}</option>
          <option value="old">{t("sort.old")}</option>
          <option value="views">{t("sort.views")}</option>
        </Select>
      </div>
    </div>
  )
}
