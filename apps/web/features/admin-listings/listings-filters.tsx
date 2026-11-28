"use client"

import { listingTypes } from "@pati-dostu/validators"
import { Search } from "lucide-react"
import { useTranslations } from "next-intl"
import { type FormEvent, useState } from "react"

import { Select } from "@/components/form/input"
import { useRouter } from "@/i18n/navigation"
import { cn } from "@/lib/utils"

import { adminListingsHref, type AdminListingsState } from "./query"

/**
 * İlan süzgeçleri: arama (ilan no "PD-104611", başlık, sahibin adı ya da e-postası — Enter ile), tür ve sıralama.
 * Seçim adresi değiştirir, sayfa 1'e döner.
 */
export function ListingsFilters({ state }: { state: AdminListingsState }) {
  const t = useTranslations("AdminListings")
  const tl = useTranslations("Listing")
  const router = useRouter()
  const [q, setQ] = useState(state.q)

  /** Yeni süzgeçle listeye gider. */
  const go = (next: Partial<AdminListingsState>) => router.push(adminListingsHref({ ...state, ...next, page: 1 }))

  /** Arama formu gönderildi. */
  const onSearch = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    go({ q: q.trim() })
  }

  return (
    <div className="grid gap-2 p-4 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
      <form role="search" onSubmit={onSearch} className="relative">
        <label htmlFor="admin-listings-q" className="sr-only">
          {t("searchLabel")}
        </label>
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-body"
        />
        <input
          id="admin-listings-q"
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
        <label htmlFor="admin-listings-type" className="sr-only">
          {t("typeLabel")}
        </label>
        <Select
          id="admin-listings-type"
          value={state.type ?? ""}
          onChange={(e) => go({ type: (e.target.value || null) as AdminListingsState["type"] })}
          className="bg-smoke sm:w-48"
        >
          <option value="">{t("allTypes")}</option>
          {listingTypes.map((type) => (
            <option key={type} value={type}>
              {tl(`type.${type}`)}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <label htmlFor="admin-listings-sort" className="sr-only">
          {t("sortLabel")}
        </label>
        <Select
          id="admin-listings-sort"
          value={state.sort}
          onChange={(e) => go({ sort: e.target.value as AdminListingsState["sort"] })}
          className="bg-smoke sm:w-44"
        >
          <option value="new">{t("sort.new")}</option>
          <option value="old">{t("sort.old")}</option>
          <option value="views">{t("sort.views")}</option>
        </Select>
      </div>
    </div>
  )
}
