import { ArrowLeft, ArrowRight } from "lucide-react"
import { getTranslations } from "next-intl/server"
import type { ComponentProps, ReactNode } from "react"

import { Link } from "@/i18n/navigation"
import { cn } from "@/lib/utils"

type Href = ComponentProps<typeof Link>["href"]

/** Mor şerit: masaüstünde yol izi + başlık + açıklama, mobilde yalnız başlık (tasarım 03-icerik/01, 10). */
export async function PostsBand({ title, subtitle }: { title: string; subtitle: string }) {
  const t = await getTranslations("Posts")
  return (
    <div className="bg-smoke">
      <div className="mx-auto max-w-site px-4 py-5 lg:px-6 lg:py-8">
        <nav aria-label="breadcrumb" className="text-sm max-lg:hidden">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link href="/" className="font-bold text-primary">
                {t("breadcrumbHome")}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="text-heading">
              {title}
            </li>
          </ol>
        </nav>
        <h1 className="text-h2 font-extrabold text-heading lg:mt-2 lg:text-h1">{title}</h1>
        <p className="mt-1 text-body max-lg:hidden">{subtitle}</p>
      </div>
    </div>
  )
}

/** Süzgeç çipleri (seçili olan dolu mor); mobilde yatay kaydırılır. */
export function Chips({
  label,
  items,
}: {
  label: string
  items: { key: string; label: ReactNode; href: Href; active: boolean }[]
}) {
  return (
    <nav aria-label={label} className="min-w-0">
      <ul className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
        {items.map((c) => (
          <li key={c.key} className="shrink-0">
            <Link
              href={c.href}
              aria-current={c.active ? "page" : undefined}
              className={cn(
                "flex min-h-tap items-center rounded-full border px-4 text-[15px] font-extrabold whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                c.active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-heading hover:border-primary"
              )}
            >
              {c.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

/** Sayfa numaraları: önceki/sonraki ve bulunulan sayfa çevresi (JS'siz bağlantılar; mobilde de görünür). */
export async function PostsPagination({
  current,
  total,
  href,
}: {
  current: number
  total: number
  href: (page: number) => Href
}) {
  const t = await getTranslations("Posts")
  if (total <= 1) return null
  const pages = [...new Set([1, current - 1, current, current + 1, total])]
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b)
  const cell = "flex size-11 items-center justify-center rounded-lg border border-border font-extrabold"
  return (
    <nav aria-label={t("pagination")} className="flex justify-center">
      <ul className="flex flex-wrap items-center gap-2">
        {current > 1 && (
          <li>
            <Link href={href(current - 1)} aria-label={t("previous")} className={cn(cell, "hover:border-primary")}>
              <ArrowLeft aria-hidden="true" className="size-4" />
            </Link>
          </li>
        )}
        {pages.map((p, i) => (
          <li key={p} className="flex items-center gap-2">
            {i > 0 && p - (pages[i - 1] ?? p) > 1 && <span aria-hidden="true">…</span>}
            <Link
              href={href(p)}
              aria-label={t("pageLabel", { page: p })}
              aria-current={p === current ? "page" : undefined}
              className={cn(
                cell,
                p === current
                  ? "border-primary bg-primary text-primary-foreground"
                  : "text-heading hover:border-primary"
              )}
            >
              {p}
            </Link>
          </li>
        ))}
        {current < total && (
          <li>
            <Link href={href(current + 1)} aria-label={t("next")} className={cn(cell, "hover:border-primary")}>
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </li>
        )}
      </ul>
    </nav>
  )
}

/** Liste yüklenirken: şerit ve kart iskeletleri. */
export function PostsFallback() {
  return (
    <div aria-hidden="true">
      <div className="h-32 bg-smoke lg:h-40" />
      <div className="mx-auto grid max-w-site gap-6 px-4 py-8 sm:grid-cols-2 lg:grid-cols-3 lg:px-6">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-96 animate-pulse rounded-card bg-smoke-2 motion-reduce:animate-none" />
        ))}
      </div>
    </div>
  )
}
