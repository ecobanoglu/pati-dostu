import { ArrowLeft, ArrowRight, X } from "lucide-react"
import type { Metadata } from "next"
import { getFormatter, getTranslations } from "next-intl/server"

import { AdminTopBar } from "@/components/layout/admin/admin-top-bar"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Link } from "@/i18n/navigation"
import { requireAdmin } from "@/lib/admin"
import { apiServer } from "@/lib/server-api"
import { cn } from "@/lib/utils"

import { parseUsersQuery, toUsersApiQuery, usersHref, type UsersState } from "./query"
import type { AdminUserDetail, AdminUserPage, AdminUserRow } from "./types"
import { UserActions } from "./user-actions"
import { UsersFilters } from "./users-filters"

type SearchParams = Record<string, string | string[] | undefined>

const ROLE_BADGE = { user: "neutral", clinic: "soft", shelter: "notice", admin: "default" } as const

/** Sekme başlığı: "Kullanıcılar". */
export async function usersMetadata(): Promise<Metadata> {
  const t = await getTranslations("AdminUsers")
  return { title: t("title") }
}

/**
 * Admin › Kullanıcılar (tasarım 07-admin/03; sağdaki kurum başvuruları 6. adımda). Tablo: kullanıcı (baş harf, ad,
 * e-posta), rol, şehir, ilan, şikâyet, kayıt, durum, "İşlemler"; seçilen kullanıcının ayrıntısı sağda (mobilde ayrı
 * ekran): üyelik, iletişim, ilanlar, şikâyetler, uyarılar, yaptırım geçmişi ve işlemler. Süzgeçler ve seçim adreste.
 * Oturum ve adres okuduğu için <Suspense> içinde.
 */
export async function UsersView({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const me = await requireAdmin()
  const state = parseUsersQuery(await searchParams)
  const [t, format, page, detail] = await Promise.all([
    getTranslations("AdminUsers"),
    getFormatter(),
    apiServer<AdminUserPage>(`/admin/users?${toUsersApiQuery(state)}`),
    state.selected ? apiServer<AdminUserDetail>(`/admin/users/${encodeURIComponent(state.selected)}`) : null,
  ])
  if (!page) throw new Error("Kullanıcı listesi okunamadı")
  const totalPages = Math.max(1, Math.ceil(page.total / page.pageSize))
  const from = page.items.length ? (state.page - 1) * page.pageSize + 1 : 0

  return (
    <>
      <AdminTopBar title={t("title")} crumbs={[{ label: t("title") }]} />
      <div
        className={cn(
          "grid grid-cols-[minmax(0,1fr)] items-start gap-5 px-4 py-5 lg:px-7 lg:py-6",
          state.selected && "xl:grid-cols-[minmax(0,1fr)_420px]"
        )}
      >
        <section
          aria-labelledby="users-title"
          className={cn(
            "overflow-hidden rounded-card border border-border bg-background",
            state.selected && "max-xl:hidden"
          )}
        >
          <h2 id="users-title" className="sr-only">
            {t("title")}
          </h2>
          <UsersFilters state={state} />
          {page.items.length === 0 ? (
            <p className="px-6 py-12 text-center text-lg font-extrabold text-heading">{t("empty")}</p>
          ) : (
            <UsersTable rows={page.items} state={state} />
          )}
          <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
            <p className="text-sm text-body">
              {t("range", { from, to: from + page.items.length - (page.items.length ? 1 : 0), total: page.total })}
            </p>
            <nav aria-label={t("pagination")} className="flex gap-2">
              {state.page > 1 && (
                <Link
                  href={usersHref({ ...state, page: state.page - 1, selected: null })}
                  aria-label={t("previous")}
                  className={buttonVariants({ variant: "outline", size: "icon" })}
                >
                  <ArrowLeft aria-hidden="true" />
                </Link>
              )}
              {state.page < totalPages && (
                <Link
                  href={usersHref({ ...state, page: state.page + 1, selected: null })}
                  aria-label={t("next")}
                  className={buttonVariants({ variant: "outline", size: "icon" })}
                >
                  <ArrowRight aria-hidden="true" />
                </Link>
              )}
            </nav>
          </div>
        </section>

        {state.selected && (
          <aside
            aria-labelledby="user-detail-title"
            className="grid gap-4 rounded-card border border-border bg-background p-5 xl:sticky xl:top-24"
          >
            {detail ? (
              <UserDetail user={detail} state={state} meId={me.id} format={format} />
            ) : (
              <p className="text-body">{t("notFound")}</p>
            )}
          </aside>
        )}
      </div>
    </>
  )
}

/** Kullanıcı tablosu (masaüstü) ve kartları (mobil); satır seçimi ayrıntıyı açar. */
async function UsersTable({ rows, state }: { rows: AdminUserRow[]; state: UsersState }) {
  const [t, format] = await Promise.all([getTranslations("AdminUsers"), getFormatter()])
  const status = (u: AdminUserRow) => (u.deleted ? "deleted" : u.banned ? "banned" : "active")
  const dot = { active: "bg-success", banned: "bg-danger", deleted: "bg-body" }
  const statusLabel = (u: AdminUserRow) => (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-extrabold",
        u.banned && !u.deleted ? "text-danger" : u.deleted ? "text-body" : "text-success-text"
      )}
    >
      <span aria-hidden="true" className={cn("size-2 rounded-full", dot[status(u)])} />
      {t(`status.${status(u)}`)}
    </span>
  )
  const avatar = (u: AdminUserRow) => (
    <span
      aria-hidden="true"
      className="flex size-10 shrink-0 items-center justify-center rounded-full bg-smoke text-lg font-extrabold text-primary"
    >
      {u.name.trim()[0]?.toLocaleUpperCase("tr") ?? "?"}
    </span>
  )
  const open = (u: AdminUserRow) => usersHref({ ...state, selected: u.id })
  return (
    <>
      <table className="w-full text-left text-[15px] max-lg:hidden">
        <caption className="sr-only">{t("tableCaption")}</caption>
        <thead className="bg-canvas text-[13px] font-extrabold text-body">
          <tr>
            <th scope="col" className="py-3 pr-4 pl-4">
              {t("colUser")}
            </th>
            <th scope="col" className="py-3 pr-4">
              {t("colRole")}
            </th>
            <th scope="col" className="py-3 pr-4">
              {t("colCity")}
            </th>
            <th scope="col" className="py-3 pr-4 text-right">
              {t("colListings")}
            </th>
            <th scope="col" className="py-3 pr-4 text-right">
              {t("colReports")}
            </th>
            <th scope="col" className="py-3 pr-4">
              {t("colCreated")}
            </th>
            <th scope="col" className="py-3 pr-4">
              {t("colStatus")}
            </th>
            <th scope="col" className="py-3 pr-4">
              <span className="sr-only">{t("colActions")}</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((u) => (
            <tr key={u.id} className={cn(state.selected === u.id && "bg-smoke/60")}>
              <td className="py-3 pr-4 pl-4">
                <div className="flex items-center gap-3">
                  {avatar(u)}
                  <div className="min-w-0">
                    <p className="font-extrabold text-heading">{u.name}</p>
                    <p className="max-w-56 truncate text-[13px] text-body">{u.email}</p>
                  </div>
                </div>
              </td>
              <td className="py-3 pr-4">
                <Badge variant={ROLE_BADGE[u.role]} size="sm">
                  {t(`role.${u.role}`)}
                </Badge>
              </td>
              <td className="py-3 pr-4 text-body">{u.city ?? "—"}</td>
              <td className="py-3 pr-4 text-right tabular-nums text-body">{u.listings}</td>
              <td
                className={cn(
                  "py-3 pr-4 text-right tabular-nums",
                  u.reports >= 3 ? "font-extrabold text-danger" : "text-body"
                )}
              >
                {u.reports}
              </td>
              <td className="py-3 pr-4 whitespace-nowrap text-body">
                {format.dateTime(new Date(u.createdAt), { dateStyle: "medium" })}
              </td>
              <td className="py-3 pr-4">{statusLabel(u)}</td>
              <td className="py-3 pr-4 text-right">
                <Link
                  href={open(u)}
                  scroll={false}
                  aria-label={t("openRow", { name: u.name })}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  {t("actions")}
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="divide-y divide-border lg:hidden">
        {rows.map((u) => (
          <li key={u.id} className="relative flex items-center gap-3 p-4">
            {avatar(u)}
            <div className="grid min-w-0 flex-1 gap-1">
              <Link
                href={open(u)}
                className="font-extrabold text-heading after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-[-2px] focus-visible:after:outline-ring"
              >
                {u.name}
              </Link>
              <p className="truncate text-sm text-body">{u.email}</p>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge variant={ROLE_BADGE[u.role]} size="sm">
                  {t(`role.${u.role}`)}
                </Badge>
                {statusLabel(u)}
                <span className="text-body">{t("countsShort", { listings: u.listings, reports: u.reports })}</span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}

/** Kullanıcı ayrıntısı: başlık, durum, iletişim, ilanlar, şikâyetler, uyarılar, geçmiş ve işlemler. */
async function UserDetail({
  user,
  state,
  meId,
  format,
}: {
  user: AdminUserDetail
  state: UsersState
  meId: string
  format: Awaited<ReturnType<typeof getFormatter>>
}) {
  const [t, tl, tr] = await Promise.all([
    getTranslations("AdminUsers"),
    getTranslations("Listing"),
    getTranslations("Reports"),
  ])
  const date = (iso: string) => format.dateTime(new Date(iso), { dateStyle: "medium" })
  const statuses = Object.entries(user.listingsByStatus)
  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="grid gap-1">
          <h2 id="user-detail-title" className="text-xl font-extrabold text-heading">
            {user.name}
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={ROLE_BADGE[user.role]} size="sm">
              {t(`role.${user.role}`)}
            </Badge>
            {user.deleted && (
              <Badge variant="neutral" size="sm">
                {t("status.deleted")}
              </Badge>
            )}
            {user.banned && (
              <Badge variant="danger" size="sm">
                {user.banExpires ? t("bannedUntil", { date: date(user.banExpires) }) : t("bannedPermanent")}
              </Badge>
            )}
          </div>
        </div>
        <Link
          href={usersHref({ ...state, selected: null })}
          scroll={false}
          aria-label={t("closeDetail")}
          className={buttonVariants({ variant: "ghost", size: "icon" })}
        >
          <X aria-hidden="true" />
        </Link>
      </div>
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-[15px]">
        <dt className="text-body">{t("email")}</dt>
        <dd className="break-all text-heading">
          {user.email} · {user.emailVerified ? t("verified") : t("unverified")}
        </dd>
        <dt className="text-body">{t("phone")}</dt>
        <dd className="text-heading">{user.phone ?? "—"}</dd>
        <dt className="text-body">{t("colCity")}</dt>
        <dd className="text-heading">{user.city ?? "—"}</dd>
        <dt className="text-body">{t("memberSince")}</dt>
        <dd className="text-heading">{date(user.createdAt)}</dd>
        <dt className="text-body">{t("lastSeen")}</dt>
        <dd className="text-heading">{user.lastSeenAt ? date(user.lastSeenAt) : "—"}</dd>
        {user.organization && (
          <>
            <dt className="text-body">{t("organization")}</dt>
            <dd className="text-heading">{user.organization.name}</dd>
          </>
        )}
        {user.banned && user.banReason && (
          <>
            <dt className="text-body">{t("banReasonLabel")}</dt>
            <dd className="text-heading">{user.banReason}</dd>
          </>
        )}
      </dl>

      <section aria-labelledby="user-listings-title" className="grid gap-2 border-t border-border pt-4">
        <h3 id="user-listings-title" className="text-base font-extrabold text-heading">
          {t("listingsTitle", { count: user.listings })}
        </h3>
        {statuses.length > 0 && (
          <p className="text-sm text-body">
            {statuses.map(([s, n]) => `${tl(`status.${s as "active"}`)}: ${n}`).join(" · ")}
          </p>
        )}
        {user.recentListings.length > 0 ? (
          <ul className="grid gap-1">
            {user.recentListings.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-2 text-[15px]">
                <Link
                  href={{ pathname: "/admin/listings", query: { ara: `PD-${l.no}` } }}
                  className="min-w-0 truncate font-bold text-primary underline underline-offset-4"
                >
                  {l.title}
                </Link>
                <span className="shrink-0 text-[13px] text-body">{tl(`status.${l.status as "active"}`)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-body">{t("noListings")}</p>
        )}
      </section>

      <section aria-labelledby="user-reports-title" className="grid gap-2 border-t border-border pt-4">
        <h3 id="user-reports-title" className="text-base font-extrabold text-heading">
          {t("reportsTitle", { count: user.reports })}
        </h3>
        {user.warnings.length > 0 ? (
          <ul className="grid gap-1 text-[15px] text-body">
            {user.warnings.map((w, i) => (
              <li key={i}>
                {t("warningItem", { date: date(w.createdAt), reason: tr(`reasons.${w.reason as "spam"}`) })}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-body">{t("noWarnings")}</p>
        )}
      </section>

      {user.history.length > 0 && (
        <section aria-labelledby="user-history-title" className="grid gap-2 border-t border-border pt-4">
          <h3 id="user-history-title" className="text-base font-extrabold text-heading">
            {t("historyTitle")}
          </h3>
          <ul className="grid gap-1 text-sm text-body">
            {user.history.map((h, i) => (
              <li key={i}>
                {date(h.createdAt)} · {t(`history.${h.action.replace("user.", "") as "ban"}`)} · {h.actorName}
              </li>
            ))}
          </ul>
        </section>
      )}

      <UserActions user={user} meId={meId} />
    </>
  )
}
