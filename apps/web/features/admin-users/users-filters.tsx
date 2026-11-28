"use client"

import { adminUserStatuses, userRoles } from "@pati-dostu/validators"
import { Download, Search } from "lucide-react"
import { useTranslations } from "next-intl"
import { type FormEvent, useState } from "react"

import { Select } from "@/components/form/input"
import { buttonVariants } from "@/components/ui/button"
import { useRouter } from "@/i18n/navigation"
import { PUBLIC_API_URL } from "@/lib/api"
import { cn } from "@/lib/utils"

import { toUsersApiQuery, usersHref, type UsersState } from "./query"

/**
 * Kullanıcı süzgeçleri (tasarım 07-admin/03): arama (ad, e-posta, telefon — Enter ile), rol, durum ve "CSV indir"
 * (geçerli süzgeçlerle; dosya doğrudan API'den, oturum cookie'siyle). Seçim adresi değiştirir, sayfa 1'e döner.
 */
export function UsersFilters({ state }: { state: UsersState }) {
  const t = useTranslations("AdminUsers")
  const router = useRouter()
  const [q, setQ] = useState(state.q)

  /** Yeni süzgeçle listeye gider (seçili kullanıcı kapanır). */
  const go = (next: Partial<UsersState>) => router.push(usersHref({ ...state, ...next, page: 1, selected: null }))

  /** Arama formu gönderildi. */
  const onSearch = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    go({ q: q.trim() })
  }

  const csv = `${PUBLIC_API_URL}/api/v1/admin/users/export.csv?${toUsersApiQuery(state, false)}`
  return (
    <div className="grid gap-2 border-b border-border p-4 md:grid-cols-[minmax(0,1fr)_auto_auto_auto] md:items-center">
      <form role="search" onSubmit={onSearch} className="relative">
        <label htmlFor="admin-users-q" className="sr-only">
          {t("searchLabel")}
        </label>
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-body"
        />
        <input
          id="admin-users-q"
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
      <div className="flex items-center gap-2">
        <label htmlFor="admin-users-role" className="text-sm font-extrabold text-heading">
          {t("roleLabel")}
        </label>
        <Select
          id="admin-users-role"
          value={state.role ?? ""}
          onChange={(e) => go({ role: (e.target.value || null) as UsersState["role"] })}
          className="w-auto bg-smoke"
        >
          <option value="">{t("all")}</option>
          {userRoles.map((r) => (
            <option key={r} value={r}>
              {t(`role.${r}`)}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex items-center gap-2">
        <label htmlFor="admin-users-status" className="text-sm font-extrabold text-heading">
          {t("statusLabel")}
        </label>
        <Select
          id="admin-users-status"
          value={state.status ?? ""}
          onChange={(e) => go({ status: (e.target.value || null) as UsersState["status"] })}
          className="w-auto bg-smoke"
        >
          <option value="">{t("allNotDeleted")}</option>
          {adminUserStatuses.map((s) => (
            <option key={s} value={s}>
              {t(`status.${s}`)}
            </option>
          ))}
        </Select>
      </div>
      <a href={csv} download className={cn(buttonVariants({ variant: "outline" }), "gap-1.5")}>
        <Download aria-hidden="true" className="size-4" />
        {t("csv")}
      </a>
    </div>
  )
}
