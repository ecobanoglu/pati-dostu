"use client"

import { Search } from "lucide-react"
import { useTranslations } from "next-intl"
import { type FormEvent, useState } from "react"

import { useRouter } from "@/i18n/navigation"

/**
 * Admin üst çubuğundaki genel arama (tasarım: "İlan no, kullanıcı, e-posta"). İlan numarası ("104611" ya da
 * "PD-104611") İlanlar sayfasında, diğer her şey (ad, e-posta, telefon) Kullanıcılar sayfasında aranır.
 */
export function AdminSearch() {
  const t = useTranslations("Admin")
  const router = useRouter()
  const [q, setQ] = useState("")

  /** Aramayı ilgili sayfaya yönlendirir. */
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const term = q.trim()
    if (!term) return
    if (/^(pd-?)?\d+$/i.test(term)) router.push({ pathname: "/admin/listings", query: { ara: term } })
    else router.push({ pathname: "/admin/users", query: { ara: term } })
  }

  return (
    <form role="search" onSubmit={submit} className="relative w-80">
      <label htmlFor="admin-global-search" className="sr-only">
        {t("searchLabel")}
      </label>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-body"
      />
      <input
        id="admin-global-search"
        type="search"
        value={q}
        maxLength={100}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t("searchPlaceholder")}
        className="h-12 w-full rounded-lg border border-input bg-background pr-4 pl-10 text-[15px] text-heading placeholder:text-body/70 focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-ring"
      />
    </form>
  )
}
