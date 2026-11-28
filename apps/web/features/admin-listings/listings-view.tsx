import type { Metadata } from "next"
import { getLocale, getTranslations } from "next-intl/server"

import { AdminTopBar } from "@/components/layout/admin/admin-top-bar"
import { buttonVariants } from "@/components/ui/button"
import { Link } from "@/i18n/navigation"
import { requireAdmin } from "@/lib/admin"
import { apiServer } from "@/lib/server-api"
import { cn } from "@/lib/utils"

import { ListingsFilters } from "./listings-filters"
import { ListingsTable } from "./listings-table"
import { adminListingsHref, type AdminListingsState, parseAdminListingsQuery, toAdminListingsApiQuery } from "./query"
import type { AdminListingPage, ReasonOption } from "./types"

type SearchParams = Record<string, string | string[] | undefined>

/** Sekme başlığı: "İlanlar". */
export async function adminListingsMetadata(): Promise<Metadata> {
  const t = await getTranslations("AdminListings")
  return { title: t("title") }
}

/**
 * Admin › İlanlar (tasarım yok — admin blog listesi düzeninde): durum sekmeleri (sayılarıyla; taslaklar yok —
 * karar), arama + tür + sıralama, tablo / mobil kartlar, sayfalama. Süzgeçler adreste (`durum`, `tur`, `ara`,
 * `sirala`, `sayfa`). Oturum ve adres okuduğu için <Suspense> içinde.
 */
export async function AdminListingsView({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdmin()
  const locale = await getLocale()
  const state = parseAdminListingsQuery(await searchParams)
  const [t, tl, data, reasons] = await Promise.all([
    getTranslations("AdminListings"),
    getTranslations("Listing"),
    apiServer<AdminListingPage>(`/admin/listings?${toAdminListingsApiQuery(state, locale)}`),
    apiServer<ReasonOption[]>(`/admin/listings/rejection-reasons?locale=${locale}`),
  ])
  if (!data || !reasons) throw new Error("Admin ilan listesi okunamadı")
  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize))
  const filtered = Boolean(state.status || state.type || state.q)
  const tabs: Array<{ key: AdminListingsState["status"]; label: string; count: number }> = [
    { key: null, label: t("all"), count: data.counts.all },
    ...(["pending", "active", "changes_requested", "rejected", "adopted", "closed"] as const).map((key) => ({
      key,
      label: tl(`status.${key}`),
      count: data.counts[key],
    })),
  ]

  return (
    <>
      <AdminTopBar title={t("title")} crumbs={[{ label: t("title") }]} />
      <div className="grid gap-5 px-4 py-5 lg:px-7 lg:py-6">
        <section
          aria-labelledby="admin-listings-title"
          className="overflow-hidden rounded-card border border-border bg-background"
        >
          <h2 id="admin-listings-title" className="sr-only">
            {t("title")}
          </h2>
          <nav aria-label={t("statusFilter")} className="overflow-x-auto border-b border-border">
            <ul className="flex min-w-max gap-1 px-3">
              {tabs.map((tab) => {
                const active = state.status === tab.key
                return (
                  <li key={tab.key ?? "all"}>
                    <Link
                      href={adminListingsHref({ ...state, status: tab.key, page: 1 })}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "inline-flex min-h-13 items-center gap-1.5 border-b-3 px-3 font-extrabold whitespace-nowrap",
                        active ? "border-primary text-primary" : "border-transparent text-heading hover:text-primary"
                      )}
                    >
                      {tab.label}
                      <span className={active ? undefined : "text-body"}>{tab.count}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>
          <ListingsFilters state={state} />
          {data.items.length === 0 ? (
            <div className="grid justify-items-center gap-3 border-t border-border px-6 py-12 text-center">
              <p className="text-lg font-extrabold text-heading">{filtered ? t("emptyFiltered") : t("empty")}</p>
              {filtered && (
                <Link href="/admin/listings" className={buttonVariants({ variant: "outline" })}>
                  {t("clearFilters")}
                </Link>
              )}
            </div>
          ) : (
            <>
              <ListingsTable key={toAdminListingsApiQuery(state, locale)} rows={data.items} reasons={reasons} />
              <p className="border-t border-border px-4 py-3 text-right text-sm text-body">
                {t("range", {
                  from: (state.page - 1) * data.pageSize + 1,
                  to: (state.page - 1) * data.pageSize + data.items.length,
                  total: data.total,
                })}
              </p>
            </>
          )}
        </section>
        {totalPages > 1 && (
          <nav aria-label={t("pagination")} className="flex items-center justify-center gap-3">
            {state.page > 1 && (
              <Link
                href={adminListingsHref({ ...state, page: state.page - 1 })}
                className={buttonVariants({ variant: "outline" })}
              >
                {t("previous")}
              </Link>
            )}
            <span className="text-sm text-body">{t("pageOf", { page: state.page, total: totalPages })}</span>
            {state.page < totalPages && (
              <Link
                href={adminListingsHref({ ...state, page: state.page + 1 })}
                className={buttonVariants({ variant: "outline" })}
              >
                {t("next")}
              </Link>
            )}
          </nav>
        )}
      </div>
    </>
  )
}
