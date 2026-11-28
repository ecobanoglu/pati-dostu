import type { Metadata } from "next"
import { getLocale, getTranslations } from "next-intl/server"

import { AdminTopBar } from "@/components/layout/admin/admin-top-bar"
import { buttonVariants } from "@/components/ui/button"
import { Link } from "@/i18n/navigation"
import { requireAdmin } from "@/lib/admin"
import { apiServer } from "@/lib/server-api"
import { cn } from "@/lib/utils"

import { ListFilters } from "./list-filters"
import { PostsTable } from "./posts-table"
import { adminPostsHref, parseAdminPostsQuery, toAdminPostsApiQuery } from "./query"
import type { AdminPostOptions, AdminPostPage } from "./types"

type SearchParams = Record<string, string | string[] | undefined>

/** Sekme başlığı: "Blog ve haberler". */
export async function adminPostsMetadata(): Promise<Metadata> {
  const t = await getTranslations("AdminPosts")
  return { title: t("listTitle") }
}

/**
 * Admin blog ve haber listesi (tasarım 07-admin/08): tür çipleri (Tümü / Blog / Haber, sayılarıyla), "+ Yeni yazı",
 * durum sekmeleri (Tümü / Yayında / Planlandı / Taslak), arama + kategori + sıralama, tablo ve toplu işlemler,
 * sayfalama. Süzgeçler adreste (`tur`, `durum`, `kategori`, `ara`, `sirala`, `sayfa`). Oturum ve adres okuduğu için
 * <Suspense> içinde.
 */
export async function AdminPostsView({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdmin()
  const locale = await getLocale()
  const state = parseAdminPostsQuery(await searchParams)
  const [t, data, options] = await Promise.all([
    getTranslations("AdminPosts"),
    apiServer<AdminPostPage>(`/admin/posts?${toAdminPostsApiQuery(state, locale)}`),
    apiServer<AdminPostOptions>(`/admin/posts/options?locale=${locale}`),
  ])
  if (!data || !options) throw new Error("Admin yazı listesi okunamadı")
  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize))
  const filtered = Boolean(state.status || state.category || state.q)

  const typeChips = [
    { key: null, label: t("all"), count: data.counts.all },
    { key: "blog" as const, label: t("type.blog"), count: data.counts.blog },
    { key: "news" as const, label: t("type.news"), count: data.counts.news },
  ]
  const statusTabs = [
    { key: null, label: t("all"), count: null },
    { key: "published" as const, label: t("status.published"), count: data.counts.published },
    { key: "scheduled" as const, label: t("status.scheduled"), count: data.counts.scheduled },
    { key: "draft" as const, label: t("status.draft"), count: data.counts.draft },
  ]

  return (
    <>
      <AdminTopBar title={t("listTitle")} crumbs={[{ label: t("listTitle") }]} />
      <div className="grid gap-5 px-4 py-5 lg:px-7 lg:py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <nav aria-label={t("typeFilter")}>
            <ul className="flex flex-wrap gap-2">
              {typeChips.map((chip) => {
                const active = state.type === chip.key
                return (
                  <li key={chip.key ?? "all"}>
                    <Link
                      href={adminPostsHref({ ...state, type: chip.key, category: null, page: 1 })}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "inline-flex min-h-tap items-center gap-1.5 rounded-full px-4 text-sm font-extrabold",
                        active ? "bg-primary text-primary-foreground" : "bg-background text-heading hover:bg-smoke"
                      )}
                    >
                      {chip.label}
                      <span className={active ? undefined : "text-body"}>{chip.count}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>
          <Link
            href={{ pathname: "/admin/posts/new", query: state.type === "news" ? { tur: "haber" } : {} }}
            className={buttonVariants({ size: "lg" })}
          >
            {t("newPost")}
          </Link>
        </div>

        <section
          aria-labelledby="admin-posts-list"
          className="overflow-hidden rounded-card border border-border bg-background"
        >
          <h2 id="admin-posts-list" className="sr-only">
            {t("listTitle")}
          </h2>
          <nav aria-label={t("statusFilter")} className="overflow-x-auto border-b border-border">
            <ul className="flex min-w-max gap-1 px-3">
              {statusTabs.map((tab) => {
                const active = state.status === tab.key
                return (
                  <li key={tab.key ?? "all"}>
                    <Link
                      href={adminPostsHref({ ...state, status: tab.key, page: 1 })}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "inline-flex min-h-13 items-center gap-1.5 border-b-3 px-3 font-extrabold",
                        active ? "border-primary text-primary" : "border-transparent text-heading hover:text-primary"
                      )}
                    >
                      {tab.label}
                      {tab.count !== null && <span className={active ? undefined : "text-body"}>{tab.count}</span>}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>

          <ListFilters state={state} categories={options.categories} />

          {data.items.length === 0 ? (
            <div className="grid justify-items-center gap-3 border-t border-border px-6 py-12 text-center">
              <p className="text-lg font-extrabold text-heading">{filtered ? t("emptyFiltered") : t("empty")}</p>
              {filtered ? (
                <Link
                  href={adminPostsHref({ ...state, status: null, category: null, q: "", page: 1 })}
                  className={buttonVariants({ variant: "outline" })}
                >
                  {t("clearFilters")}
                </Link>
              ) : (
                <Link href="/admin/posts/new" className={buttonVariants()}>
                  {t("newPost")}
                </Link>
              )}
            </div>
          ) : (
            <PostsTable
              key={toAdminPostsApiQuery(state, locale)}
              rows={data.items}
              total={data.total}
              from={(state.page - 1) * data.pageSize + 1}
            />
          )}
        </section>

        {totalPages > 1 && (
          <nav aria-label={t("pagination")} className="flex items-center justify-center gap-3">
            {state.page > 1 && (
              <Link
                href={adminPostsHref({ ...state, page: state.page - 1 })}
                className={buttonVariants({ variant: "outline" })}
              >
                {t("previous")}
              </Link>
            )}
            <span className="text-sm text-body">{t("pageOf", { page: state.page, total: totalPages })}</span>
            {state.page < totalPages && (
              <Link
                href={adminPostsHref({ ...state, page: state.page + 1 })}
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
