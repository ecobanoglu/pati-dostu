"use client"

import { ChevronDown } from "lucide-react"
import { useTranslations } from "next-intl"
import { useEffect, useState } from "react"

import type { TocItem } from "@/components/content/tiptap"
import { cn } from "@/lib/utils"

/**
 * Okunan bölümü izler: ekranın üst kısmını geçen son başlık "etkin" olur (IntersectionObserver yerine kaydırma +
 * requestAnimationFrame — başlıklar arası uzun bölümlerde de doğru sonuç verir).
 */
function useActiveHeading(ids: string[]): string | null {
  const [active, setActive] = useState<string | null>(ids[0] ?? null)
  useEffect(() => {
    let frame = 0
    /** Kaydırma konumuna göre etkin başlığı bulur. */
    const update = () => {
      frame = 0
      let current = ids[0] ?? null
      for (const id of ids) {
        const el = document.getElementById(id)
        if (el && el.getBoundingClientRect().top <= 120) current = id
      }
      setActive(current)
    }
    /** Kaydırmayı kare başına bir kez işler. */
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    onScroll()
    return () => {
      window.removeEventListener("scroll", onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [ids])
  return active
}

/** Başlık bağlantıları (etkin olan mor çizgili). */
function TocLinks({ items, active }: { items: TocItem[]; active: string | null }) {
  return (
    <ol className="grid border-l-2 border-border">
      {items.map((item) => (
        <li key={item.id}>
          <a
            href={`#${item.id}`}
            aria-current={item.id === active ? "location" : undefined}
            className={cn(
              "-ml-0.5 flex min-h-9 items-center border-l-2 py-1 pr-2 text-[15px] font-bold focus-visible:outline-2 focus-visible:outline-ring",
              item.level === 3 ? "pl-7" : "pl-4",
              item.id === active ? "border-primary text-primary" : "border-transparent text-heading hover:text-primary"
            )}
          >
            {item.text}
          </a>
        </li>
      ))}
    </ol>
  )
}

/**
 * İçindekiler (tasarım 03-icerik/02, 11): masaüstünde yan sütunda kutu (okunan bölüm vurgulu), mobilde içeriğin
 * üstünde açılır-kapanır `<details>` (JS'siz de çalışır). Başlık yoksa hiç gösterilmez.
 */
export function TableOfContents({ items, variant }: { items: TocItem[]; variant: "desktop" | "mobile" }) {
  const t = useTranslations("Posts")
  const [ids] = useState(() => items.map((i) => i.id))
  const active = useActiveHeading(ids)
  if (items.length === 0) return null
  if (variant === "mobile")
    return (
      <details className="group rounded-card border border-border">
        <summary className="flex min-h-13 cursor-pointer list-none items-center justify-between gap-2 px-4 font-extrabold text-heading focus-visible:outline-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
          {t("toc")}
          <ChevronDown
            aria-hidden="true"
            className="size-5 transition-transform group-open:rotate-180 motion-reduce:transition-none"
          />
        </summary>
        <nav aria-label={t("toc")} className="px-4 pb-4">
          <TocLinks items={items} active={active} />
        </nav>
      </details>
    )
  return (
    <nav aria-labelledby="toc-title" className="grid gap-3 rounded-card border border-border p-5">
      <h2 id="toc-title" className="text-lg font-extrabold text-heading">
        {t("toc")}
      </h2>
      <TocLinks items={items} active={active} />
    </nav>
  )
}
