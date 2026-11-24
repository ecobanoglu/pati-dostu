"use client"

import { useTranslations } from "next-intl"
import { useState } from "react"

import { PdMark } from "@/components/brand/logo"
import { ListingCard } from "@/components/listing/listing-card"
import { buttonVariants } from "@/components/ui/button"
import { Link } from "@/i18n/navigation"
import type { ListingCardData } from "@/lib/listings"
import { cn } from "@/lib/utils"

type Tab = "all" | "active" | "inactive"

/**
 * Favori ilanlar (tasarım: 02-hesabim-favoriler, 09-mobil-favoriler): Tümü / Yayında / Yayında değil sekmeleri ve
 * kartlar. Yayından kalkan ilan (sahiplendirildi, kapatıldı) soluk ve bağlantısız gösterilir. Kalbe basılarak
 * favoriden çıkarılan ilan listeden hemen kalkar.
 */
export function FavoritesList({ initial }: { initial: ListingCardData[] }) {
  const t = useTranslations("Favorites")
  const tl = useTranslations("Listing")
  const [items, setItems] = useState(initial)
  const [tab, setTab] = useState<Tab>("all")

  const active = items.filter((item) => item.status === "active")
  const counts: Record<Tab, number> = {
    all: items.length,
    active: active.length,
    inactive: items.length - active.length,
  }
  const shown = tab === "all" ? items : items.filter((item) => (item.status === "active") === (tab === "active"))

  if (items.length === 0) {
    return (
      <div className="mt-6 flex flex-col items-center gap-3 rounded-card border border-border bg-background px-6 py-14 text-center">
        <PdMark className="size-16 opacity-30 grayscale" />
        <h2 className="text-xl font-extrabold text-heading">{t("emptyTitle")}</h2>
        <p className="max-w-sm text-body">{t("emptyText")}</p>
        <Link href="/listings" className={cn(buttonVariants(), "mt-2")}>
          {t("emptyCta")}
        </Link>
      </div>
    )
  }

  return (
    <>
      <div role="group" aria-label={t("tabsLabel")} className="mt-4 flex flex-wrap gap-2">
        {(["all", "active", "inactive"] as const).map((key) => (
          <button
            key={key}
            type="button"
            aria-pressed={tab === key}
            onClick={() => setTab(key)}
            className={cn(
              "min-h-tap rounded-full border px-4 text-sm font-extrabold transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              tab === key
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-heading hover:bg-smoke-2"
            )}
          >
            {t(key === "all" ? "tabAll" : key === "active" ? "tabActive" : "tabInactive")} {counts[key]}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="mt-6 text-body">{t("emptyFilter")}</p>
      ) : (
        <ul className="mt-5 grid gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
          {shown.map((item, i) => (
            <li key={item.id}>
              <ListingCard
                listing={item}
                priority={i < 3}
                inactiveNote={
                  item.status === "active" ? undefined : t("inactive", { status: tl(`status.${item.status}` as never) })
                }
                onFavoriteChange={(favorite) => {
                  if (!favorite) setItems((list) => list.filter((x) => x.id !== item.id))
                }}
              />
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
