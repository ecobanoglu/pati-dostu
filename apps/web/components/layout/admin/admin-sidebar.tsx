"use client"

import {
  ArrowLeft,
  BookOpen,
  Building2,
  Flag,
  LayoutGrid,
  type LucideIcon,
  Newspaper,
  ShieldCheck,
  Users,
} from "lucide-react"
import { useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { Suspense } from "react"

import { Logo } from "@/components/brand/logo"
import { Link, usePathname } from "@/i18n/navigation"
import { type AdminCounts, useAdminCounts } from "@/lib/use-admin-counts"
import { cn } from "@/lib/utils"

type NavItem = {
  key: "listingReview" | "listings" | "users" | "applications" | "reports" | "blog" | "news"
  href: {
    pathname:
      | "/admin/listing-review"
      | "/admin/listings"
      | "/admin/users"
      | "/admin/organization-applications"
      | "/admin/reports"
      | "/admin/posts"
    query?: Record<string, string>
  }
  icon: LucideIcon
  /** Rozet sayısı (kenar çubuğu); `urgent` turuncu, diğerleri gri. */
  count?: keyof AdminCounts
  urgent?: boolean
  /** Bu öğe şu adres ve sorguda etkin mi. */
  isActive: (pathname: string, params: URLSearchParams) => boolean
}

const isPosts = (p: string) => p === "/admin/posts" || p.startsWith("/admin/posts/")

/**
 * Admin menüsü (tasarım 07-admin/*). Karar: yalnız yapılmış sayfalar görünür; 5. aşamanın her adımında yeni öğe
 * eklenir (Dashboard, İlan onayı, İlanlar, Kullanıcılar, Kurum başvuruları, Topluluk, Şikayetler, Sözlük, Raporlar).
 */
const NAV: NavItem[] = [
  {
    key: "listingReview",
    href: { pathname: "/admin/listing-review" },
    icon: ShieldCheck,
    count: "pendingListings",
    urgent: true,
    isActive: (p) => p === "/admin/listing-review",
  },
  {
    key: "listings",
    href: { pathname: "/admin/listings" },
    icon: LayoutGrid,
    isActive: (p) => p === "/admin/listings",
  },
  {
    key: "users",
    href: { pathname: "/admin/users" },
    icon: Users,
    isActive: (p) => p === "/admin/users",
  },
  {
    key: "applications",
    href: { pathname: "/admin/organization-applications" },
    icon: Building2,
    count: "pendingApplications",
    isActive: (p) => p === "/admin/organization-applications",
  },
  {
    key: "reports",
    href: { pathname: "/admin/reports" },
    icon: Flag,
    count: "openReports",
    isActive: (p) => p === "/admin/reports",
  },
  {
    key: "blog",
    href: { pathname: "/admin/posts", query: { tur: "blog" } },
    icon: BookOpen,
    isActive: (p, q) => isPosts(p) && q.get("tur") !== "haber",
  },
  {
    key: "news",
    href: { pathname: "/admin/posts", query: { tur: "haber" } },
    icon: Newspaper,
    isActive: (p, q) => isPosts(p) && q.get("tur") === "haber",
  },
]

/** Menü bağlantıları; etkin öğe adresten (sorgu dahil) belirlenir. */
function NavLinks({ onNavigate, active }: { onNavigate?: () => void; active: (item: NavItem) => boolean }) {
  const t = useTranslations("Admin")
  const counts = useAdminCounts()
  return (
    <ul className="grid gap-1">
      {NAV.map((item) => {
        const current = active(item)
        const count = item.count ? counts[item.count] : 0
        const Icon = item.icon
        return (
          <li key={item.key}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={current ? "page" : undefined}
              className={cn(
                "flex min-h-tap items-center gap-3 rounded-xl px-3 text-[15px] font-extrabold transition-colors",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring",
                current
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent"
              )}
            >
              <Icon aria-hidden="true" className="size-5 shrink-0" />
              <span className="flex-1">{t(`nav.${item.key}`)}</span>
              {count > 0 && (
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-extrabold",
                    item.urgent ? "bg-secondary text-secondary-foreground" : "bg-sidebar-accent text-sidebar-foreground"
                  )}
                >
                  {count}
                  <span className="sr-only"> {t("pending")}</span>
                </span>
              )}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

/** Adresi ve sorguyu okuyan menü (Suspense içinde — Cache Components). */
function NavWithQuery({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const params = useSearchParams()
  return <NavLinks onNavigate={onNavigate} active={(item) => item.isActive(pathname, params)} />
}

/** Adres okunmadan önceki menü (dinamik sayfalarda ilk çizim): etkin öğe işaretlenmez. */
function NavStatic() {
  return <NavLinks active={() => false} />
}

/**
 * Admin kenar çubuğu (koyu): logo + "Admin" rozeti, menü (rozet sayılarıyla), altta "Siteye dön". Masaüstünde sabit
 * sol sütun, mobilde hamburger menünün içi (`onNavigate` bağlantıya basınca paneli kapatır).
 */
export function AdminSidebar({ onNavigate, className }: { onNavigate?: () => void; className?: string }) {
  const t = useTranslations("Admin")
  return (
    <div className={cn("flex h-full flex-col gap-6 bg-sidebar px-3.5 py-5 text-sidebar-foreground", className)}>
      <div className="flex items-center gap-2 px-2">
        <Logo tone="dark" className="text-xl" />
        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-extrabold text-secondary-foreground">
          {t("badge")}
        </span>
      </div>
      <nav aria-label={t("navLabel")} className="flex-1 overflow-y-auto">
        <Suspense fallback={<NavStatic />}>
          <NavWithQuery onNavigate={onNavigate} />
        </Suspense>
      </nav>
      <Link
        href="/"
        onClick={onNavigate}
        className="flex min-h-tap items-center gap-3 rounded-xl px-3 text-[15px] font-bold text-sidebar-foreground hover:bg-sidebar-accent focus-visible:outline-2 focus-visible:outline-sidebar-ring"
      >
        <ArrowLeft aria-hidden="true" className="size-5" />
        {t("backToSite")}
      </Link>
    </div>
  )
}
