"use client"

import { ChevronLeft, ChevronRight, X } from "lucide-react"
import { useTranslations } from "next-intl"
import { useEffect, useRef, useState } from "react"

import { PdMark } from "@/components/brand/logo"
import { cn } from "@/lib/utils"

/**
 * İlan fotoğraf galerisi (tasarım: 03-ilan-detay, 19-mobil-ilan-detay).
 * Masaüstü: büyük fotoğraf + önceki/sonraki + küçük resimler. Mobil: yatay kaydırmalı galeri, sayaç ve noktalar.
 * Fotoğrafa tıklayınca büyük görünüm (yerel <dialog>: odak hapsi ve Esc tarayıcıdan; ← → tuşlarıyla gezilir).
 */
export function Gallery({ images, title }: { images: Array<{ url: string }>; title: string }) {
  const t = useTranslations("ListingDetail")
  const [index, setIndex] = useState(0)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const stripRef = useRef<HTMLDivElement>(null)
  const total = images.length

  /** Bulunulan fotoğrafı değiştirir (başa/sona dolanır). */
  const go = (next: number) => setIndex(((next % total) + total) % total)

  // Mobil: kaydırınca sayaç ve noktalar güncellensin.
  useEffect(() => {
    const strip = stripRef.current
    if (!strip) return
    const onScroll = () => setIndex(Math.round(strip.scrollLeft / strip.clientWidth))
    strip.addEventListener("scroll", onScroll, { passive: true })
    return () => strip.removeEventListener("scroll", onScroll)
  }, [])

  /** Büyük görünümü açar. */
  const open = (i: number) => {
    setIndex(i)
    dialogRef.current?.showModal()
  }

  if (total === 0) {
    return (
      <div className="flex aspect-[4/3] flex-col items-center justify-center gap-2 bg-smoke-2 text-sm font-bold text-body lg:rounded-dialog">
        <PdMark className="size-16 opacity-30 grayscale" />
        {t("noPhoto")}
      </div>
    )
  }

  const alt = (i: number) => `${title} – ${t("photoOf", { current: i + 1, total })}`

  return (
    <section aria-label={t("gallery")}>
      {/* Mobil: kaydırmalı galeri */}
      <div className="relative lg:hidden">
        <div ref={stripRef} className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none]">
          {images.map((img, i) => (
            <button
              key={img.url}
              type="button"
              onClick={() => open(i)}
              aria-label={`${t("openLightbox")}: ${t("photoOf", { current: i + 1, total })}`}
              className="aspect-[4/3] w-full shrink-0 snap-center bg-smoke-2"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- depo adresi */}
              <img src={img.url} alt={alt(i)} loading={i === 0 ? "eager" : "lazy"} className="size-full object-cover" />
            </button>
          ))}
        </div>
        {total > 1 && (
          <>
            <span
              aria-live="polite"
              className="absolute top-3 right-3 rounded-full bg-heading/80 px-2.5 py-1 text-xs font-extrabold text-white"
            >
              {index + 1} / {total}
            </span>
            <span aria-hidden="true" className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
              {images.map((img, i) => (
                <span
                  key={img.url}
                  className={cn("h-2 rounded-full transition-all", i === index ? "w-6 bg-primary" : "w-2 bg-white/80")}
                />
              ))}
            </span>
          </>
        )}
      </div>

      {/* Masaüstü: büyük fotoğraf + küçük resimler */}
      <div className="hidden lg:block">
        <div className="group relative overflow-hidden rounded-dialog bg-smoke-2">
          <button
            type="button"
            onClick={() => open(index)}
            aria-label={t("openLightbox")}
            className="block aspect-[4/3] w-full"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- depo adresi */}
            <img src={images[index]?.url} alt={alt(index)} className="size-full object-cover" />
          </button>
          {total > 1 && (
            <>
              <ArrowButton side="left" label={t("previousPhoto")} onClick={() => go(index - 1)} />
              <ArrowButton side="right" label={t("nextPhoto")} onClick={() => go(index + 1)} />
            </>
          )}
        </div>
        {total > 1 && (
          <ul className="mt-3 grid grid-cols-5 gap-3">
            {images.map((img, i) => (
              <li key={img.url}>
                <button
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={t("showPhoto", { current: i + 1 })}
                  aria-current={i === index ? "true" : undefined}
                  className={cn(
                    "block aspect-[4/3] w-full overflow-hidden rounded-xl border-2 bg-smoke-2",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                    i === index ? "border-primary" : "border-transparent opacity-80 hover:opacity-100"
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- depo adresi */}
                  <img src={img.url} alt="" loading="lazy" className="size-full object-cover" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Büyük görünüm */}
      <dialog
        ref={dialogRef}
        aria-label={t("gallery")}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") go(index - 1)
          if (e.key === "ArrowRight") go(index + 1)
        }}
        onClick={(e) => e.target === e.currentTarget && dialogRef.current?.close()}
        className="m-0 h-dvh max-h-none w-screen max-w-none bg-transparent p-0 backdrop:bg-black/90"
      >
        <div className="flex size-full items-center justify-center p-4 sm:p-12">
          {/* eslint-disable-next-line @next/next/no-img-element -- depo adresi */}
          <img src={images[index]?.url} alt={alt(index)} className="max-h-full max-w-full rounded-lg object-contain" />
        </div>
        <p
          aria-live="polite"
          className="absolute top-4 left-4 rounded-full bg-black/60 px-3 py-1 text-sm font-bold text-white"
        >
          {t("photoOf", { current: index + 1, total })}
        </p>
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          aria-label={t("closeLightbox")}
          autoFocus
          className="absolute top-3 right-3 flex size-tap items-center justify-center rounded-full bg-black/60 text-white focus-visible:outline-2 focus-visible:outline-white"
        >
          <X aria-hidden="true" className="size-6" />
        </button>
        {total > 1 && (
          <>
            <ArrowButton side="left" label={t("previousPhoto")} onClick={() => go(index - 1)} dark />
            <ArrowButton side="right" label={t("nextPhoto")} onClick={() => go(index + 1)} dark />
          </>
        )}
      </dialog>
    </section>
  )
}

/** Önceki/sonraki fotoğraf butonu (44 px). */
function ArrowButton({
  side,
  label,
  onClick,
  dark,
}: {
  side: "left" | "right"
  label: string
  onClick: () => void
  dark?: boolean
}) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "absolute top-1/2 flex size-tap -translate-y-1/2 items-center justify-center rounded-full shadow-sm",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        side === "left" ? "left-3" : "right-3",
        dark ? "bg-black/60 text-white" : "bg-background/90 text-heading hover:bg-background"
      )}
    >
      <Icon aria-hidden="true" className="size-6" />
    </button>
  )
}
