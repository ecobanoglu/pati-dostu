import { AlertTriangle, ArrowRight, FilePen, MailWarning, Phone, Plus, type LucideIcon } from "lucide-react"
import { getFormatter, getLocale, getTranslations } from "next-intl/server"
import type { ComponentProps } from "react"

import { buttonVariants } from "@/components/ui/button"
import { getPathname, Link, redirect } from "@/i18n/navigation"
import type { Locale } from "@/i18n/routing"
import { apiServer } from "@/lib/server-api"
import { getCurrentUser } from "@/lib/session"
import { cn } from "@/lib/utils"

import { AccountPageHeader } from "./account-page-header"
import { ConversationItem } from "./messages/conversation-item"
import type { ConversationPage } from "./messages/types"

/** GET /me/summary yanıtı (apps/api › MeSummaryDto). */
type Summary = {
  listings: Record<"draft" | "pending" | "changes_requested" | "active" | "adopted" | "closed" | "rejected", number>
  favorites: number
  views: number
}

type Href = ComponentProps<typeof Link>["href"]

type Todo = {
  key: string
  icon: LucideIcon
  tone: "danger" | "primary"
  title: string
  text: string
  href: Href
  action: string
}

/** Özet kartı: etiket, büyük sayı ve altında bağlantı ya da açıklama. Bağlantı varsa kartın tamamı tıklanır. */
function StatCard({
  label,
  value,
  link,
  hint,
}: {
  label: string
  value: string
  link?: { href: Href; text: string }
  hint?: string
}) {
  return (
    <div
      className={cn(
        "relative grid content-start gap-1 rounded-card border border-border bg-background p-4 lg:p-5",
        link && "transition-shadow hover:shadow-pop"
      )}
    >
      <p className="text-sm font-bold text-body">{label}</p>
      <p className="text-[2rem] leading-tight font-extrabold text-heading">{value}</p>
      {link ? (
        <Link
          href={link.href}
          className="text-sm font-bold text-primary after:absolute after:inset-0 after:rounded-card focus-visible:outline-none after:focus-visible:outline-2 after:focus-visible:outline-ring"
        >
          {link.text}
        </Link>
      ) : (
        <p className="text-sm text-body">{hint}</p>
      )}
    </div>
  )
}

/**
 * Hesabım › Panel özeti (tasarım 02-hesabim/01, 08): selamlama, özet kartları (yayındaki ve onay bekleyen ilan,
 * okunmamış mesaj, favori), "Yapılacaklar" (reddedilen / düzeltme istenen / taslak ilan, e-posta doğrulama, telefon)
 * ve "Son mesajlar" (en son 3 konuşma). Kayıtlı aramalar v1.2'de.
 * Oturum yoksa girişe yönlendirir. cookies() okuduğu için <Suspense> içinde render edilir.
 */
export async function Dashboard() {
  const locale = (await getLocale()) as Locale
  const user = await getCurrentUser()
  if (!user) {
    return redirect({
      href: { pathname: "/sign-in", query: { next: getPathname({ href: "/account", locale }) } },
      locale,
    })
  }
  const [t, format, summary, recent, unread] = await Promise.all([
    getTranslations("Dashboard"),
    getFormatter(),
    apiServer<Summary>("/me/summary"),
    apiServer<ConversationPage>("/conversations?limit=3"),
    apiServer<{ count: number }>("/conversations/unread-count"),
  ])
  const now = new Date()
  const s = summary ?? {
    listings: { draft: 0, pending: 0, changes_requested: 0, active: 0, adopted: 0, closed: 0, rejected: 0 },
    favorites: 0,
    views: 0,
  }
  const n = (value: number) => format.number(value)
  const firstName = user.name.split(/\s+/)[0] ?? user.name

  const todos: Todo[] = []
  if (s.listings.rejected > 0) {
    todos.push({
      key: "rejected",
      icon: AlertTriangle,
      tone: "danger",
      title: t("todoRejected", { count: s.listings.rejected }),
      text: t("todoRejectedText"),
      href: "/account/listings",
      action: t("actionEdit"),
    })
  }
  if (s.listings.changes_requested > 0) {
    todos.push({
      key: "changes",
      icon: FilePen,
      tone: "danger",
      title: t("todoChanges", { count: s.listings.changes_requested }),
      text: t("todoChangesText"),
      href: "/account/listings",
      action: t("actionEdit"),
    })
  }
  if (s.listings.draft > 0) {
    todos.push({
      key: "drafts",
      icon: FilePen,
      tone: "primary",
      title: t("todoDrafts", { count: s.listings.draft }),
      text: t("todoDraftsText"),
      href: "/account/listings",
      action: t("actionContinue"),
    })
  }
  if (!user.emailVerified) {
    todos.push({
      key: "verify",
      icon: MailWarning,
      tone: "primary",
      title: t("todoVerify"),
      text: t("todoVerifyText"),
      href: { pathname: "/verify-email", query: { email: user.email } },
      action: t("actionVerify"),
    })
  }
  if (!user.phone) {
    todos.push({
      key: "phone",
      icon: Phone,
      tone: "primary",
      title: t("todoPhone"),
      text: t("todoPhoneText"),
      href: "/account/settings",
      action: t("actionPhone"),
    })
  }

  return (
    <>
      <AccountPageHeader
        title={t("greeting", { name: firstName })}
        crumb={t("crumb")}
        back="/"
        action={
          <Link href="/post-listing" className={cn(buttonVariants({ variant: "secondary" }), "max-lg:hidden")}>
            <Plus aria-hidden="true" />
            {t("newListing")}
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <StatCard
          label={t("statActive")}
          value={n(s.listings.active)}
          link={{ href: "/account/listings", text: t("goListings") }}
        />
        <StatCard label={t("statPending")} value={n(s.listings.pending)} hint={t("pendingHint")} />
        <StatCard
          label={t("statMessages")}
          value={n(unread?.count ?? 0)}
          link={{ href: "/account/messages", text: t("goMessages") }}
        />
        <StatCard
          label={t("statFavorites")}
          value={n(s.favorites)}
          link={{ href: "/account/favorites", text: t("goFavorites") }}
        />
      </div>

      <section
        aria-labelledby="todo-title"
        className="mt-4 rounded-card border border-border bg-background p-4 lg:mt-6 lg:p-6"
      >
        <h2 id="todo-title" className="border-b border-border pb-3 text-xl font-extrabold text-heading">
          {t("todoTitle")}
        </h2>
        {todos.length === 0 ? (
          <p className="pt-4 text-body">{t("todoEmpty")}</p>
        ) : (
          <ul className="divide-y divide-border">
            {todos.map(({ key, icon: Icon, tone, title, text, href, action }) => (
              <li key={key} className="flex flex-wrap items-center gap-x-4 gap-y-3 py-4 last:pb-0">
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-full",
                    tone === "danger" ? "bg-danger-soft text-danger" : "bg-smoke text-primary"
                  )}
                >
                  <Icon className="size-5" />
                </span>
                <div className="min-w-0 flex-1 basis-56">
                  <p className="font-extrabold text-heading">{title}</p>
                  <p className="text-sm text-body">{text}</p>
                </div>
                <Link
                  href={href}
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), "min-h-tap max-sm:ml-14")}
                >
                  {action}
                  <ArrowRight aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section
        aria-labelledby="recent-title"
        className="mt-4 overflow-hidden rounded-card border border-border bg-background lg:mt-6"
      >
        <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-3 lg:px-5">
          <h2 id="recent-title" className="text-xl font-extrabold text-heading">
            {t("recentTitle")}
          </h2>
          {(recent?.items.length ?? 0) > 0 && (
            <Link
              href="/account/messages"
              className="inline-flex min-h-tap items-center text-sm font-extrabold text-primary underline underline-offset-4"
            >
              {t("recentAll")}
            </Link>
          )}
        </div>
        {recent && recent.items.length > 0 ? (
          <ul className="divide-y divide-border border-t border-border">
            {recent.items.map((c) => (
              <li key={c.id}>
                <ConversationItem conversation={c} now={now} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-4 pb-5 text-body lg:px-5">{t("recentEmpty")}</p>
        )}
      </section>
    </>
  )
}

/** Panel özeti yüklenirken: kart ve liste iskeletleri. */
export function DashboardFallback() {
  return (
    <div aria-hidden="true">
      <div className="mb-6 h-12 w-64 rounded bg-smoke-2" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-card bg-smoke-2 motion-reduce:animate-none" />
        ))}
      </div>
      <div className="mt-6 h-64 rounded-card bg-smoke-2" />
    </div>
  )
}
