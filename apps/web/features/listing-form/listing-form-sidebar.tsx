"use client"

import { Calendar, Check, Heart, MapPin } from "lucide-react"
import { useTranslations } from "next-intl"

import { PdMark } from "@/components/brand/logo"
import { ListingTypeBadge } from "@/components/listing/listing-type-badge"
import { cn } from "@/lib/utils"

import type { SectionKey } from "./model"

const sectionLabel = {
  type: "sectionType",
  animal: "sectionAnimal",
  location: "sectionLocation",
  photos: "sectionPhotos",
  description: "sectionDescription",
  features: "sectionFeatures",
  contact: "sectionContact",
} as const satisfies Record<SectionKey, string>

/**
 * Masaüstü sağ sütunu (tasarım: 04-ilan-ver-yz-siz): bölümlerin tamamlanma durumu, ilanın listede nasıl
 * görüneceğinin önizlemesi ve onay süreci bilgisi. Bölüm adları bağlantıdır; tıklayınca o bölüme kayar.
 */
export function ListingFormSidebar({
  completed,
  preview,
}: {
  completed: Record<SectionKey, boolean>
  preview: {
    type: "adoption" | "foster" | "lost" | "found"
    title: string
    coverUrl: string | null
    place: string | null
  }
}) {
  const t = useTranslations("ListingForm")
  const sections = Object.keys(sectionLabel) as SectionKey[]
  const done = sections.filter((s) => completed[s]).length

  return (
    <aside className="sticky top-24 hidden flex-col gap-5 self-start lg:flex">
      <nav aria-labelledby="progress-title" className="rounded-card border border-border bg-background p-5">
        <h2 id="progress-title" className="text-h5 text-heading">
          {t("progress")}
        </h2>
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={sections.length}
          aria-valuenow={done}
          aria-labelledby="progress-title"
          className="mt-3 h-1.5 overflow-hidden rounded-full bg-smoke-2"
        >
          <div
            className="h-full bg-primary transition-[width]"
            style={{ width: `${(done / sections.length) * 100}%` }}
          />
        </div>
        <ol className="mt-4 space-y-1">
          {sections.map((key) => (
            <li key={key}>
              <a
                href={`#section-${key}`}
                className="flex min-h-9 items-center gap-2.5 rounded-md text-sm font-bold text-heading hover:text-primary"
              >
                <span
                  className={cn(
                    "flex size-5 items-center justify-center rounded-full border-2",
                    completed[key] ? "border-success bg-success text-white" : "border-border"
                  )}
                >
                  {completed[key] && <Check aria-hidden="true" className="size-3" strokeWidth={3} />}
                </span>
                {t(sectionLabel[key])}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <section aria-labelledby="preview-title" className="rounded-card border border-border bg-background p-5">
        <h2 id="preview-title" className="text-h5 text-heading">
          {t("preview")}
        </h2>
        <div aria-hidden="true" className="mt-3 overflow-hidden rounded-2xl border border-border">
          <div className="relative flex aspect-[4/3] items-center justify-center bg-smoke-2">
            {preview.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- yerel önizleme
              <img src={preview.coverUrl} alt="" className="size-full object-cover" />
            ) : (
              <span className="flex flex-col items-center gap-1 text-xs font-bold text-body">
                <PdMark className="size-10 opacity-30 grayscale" />
                {t("previewPhoto")}
              </span>
            )}
            <ListingTypeBadge type={preview.type} className="absolute top-2.5 left-2.5 py-1 text-[11px] font-bold" />
            <span className="absolute top-2.5 right-2.5 flex size-8 items-center justify-center rounded-full bg-background text-primary">
              <Heart className="size-4" />
            </span>
          </div>
          <div className="space-y-1 p-3.5">
            <p className="line-clamp-2 font-extrabold text-title">{preview.title || t("previewTitle")}</p>
            {preview.place && (
              <p className="flex items-center gap-1.5 text-xs text-body">
                <MapPin className="size-3.5" />
                {preview.place}
              </p>
            )}
            <p className="flex items-center gap-1.5 text-xs text-body">
              <Calendar className="size-3.5" />
              {t("previewToday")}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-card bg-smoke p-5">
        <h2 className="text-h5 text-heading">{t("approvalTitle")}</h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-body">{t("approvalText")}</p>
      </section>
    </aside>
  )
}
