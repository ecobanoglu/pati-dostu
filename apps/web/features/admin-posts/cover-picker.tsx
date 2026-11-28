"use client"

import { ImageUp, LoaderCircle } from "lucide-react"
import { useTranslations } from "next-intl"
import { useId, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { useErrorMessage } from "@/lib/errors"
import { cn } from "@/lib/utils"

import { IMAGE_ACCEPT, UploadError, uploadPostImage } from "./upload"

export type Cover = { key: string; url: string }

/**
 * Kapak görseli (tasarım 07-admin/06: kesikli çerçeveli "Kapak görseli ekle · 1600×900 önerilir"). Seçilen dosya
 * tarayıcıda küçültülüp doğrudan depoya yüklenir; yüklenince önizleme + "Değiştir" / "Kaldır". Kapak isteğe bağlıdır
 * (yoksa kartlarda marka işaretli yer tutucu görünür).
 */
export function CoverPicker({ value, onChange }: { value: Cover | null; onChange: (cover: Cover | null) => void }) {
  const t = useTranslations("AdminPosts")
  const errorMessage = useErrorMessage()
  const inputId = useId()
  const hintId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  /** Seçilen dosyayı yükler; bitince kapağı değiştirir. */
  const pick = async (file: File | undefined) => {
    if (!file) return
    setError(null)
    setProgress(0)
    try {
      onChange(await uploadPostImage(file, setProgress))
    } catch (e) {
      setError(errorMessage(e instanceof UploadError ? e.code : "UPLOAD_FAILED"))
    } finally {
      setProgress(null)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  const busy = progress !== null
  return (
    <div className="grid gap-2">
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={IMAGE_ACCEPT}
        className="peer sr-only"
        aria-describedby={hintId}
        disabled={busy}
        onChange={(e) => void pick(e.target.files?.[0])}
      />
      {value ? (
        <div className="grid gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- depo adresi (posts/) */}
          <img src={value.url} alt={t("coverPreview")} className="aspect-[12/5] w-full rounded-card object-cover" />
          <div className="flex flex-wrap items-center gap-2">
            <label
              htmlFor={inputId}
              className={cn(
                "inline-flex min-h-tap cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-4 font-extrabold text-heading",
                "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring hover:border-primary",
                busy && "pointer-events-none opacity-60"
              )}
            >
              {busy ? (
                <LoaderCircle aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />
              ) : (
                <ImageUp aria-hidden="true" className="size-4" />
              )}
              {t("coverChange")}
            </label>
            <Button type="button" variant="ghost" className="text-destructive" onClick={() => onChange(null)}>
              {t("coverRemove")}
            </Button>
            <span id={hintId} className="text-[13px] text-body">
              {t("coverHint")}
            </span>
          </div>
        </div>
      ) : (
        <label
          htmlFor={inputId}
          className={cn(
            "flex min-h-40 cursor-pointer flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-card border-2 border-dashed border-border bg-background px-4 py-8 text-center lg:min-h-44",
            "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring hover:border-primary",
            busy && "pointer-events-none"
          )}
        >
          {busy ? (
            <LoaderCircle aria-hidden="true" className="size-6 animate-spin text-primary motion-reduce:animate-none" />
          ) : (
            <ImageUp aria-hidden="true" className="size-6 text-primary" />
          )}
          <span className="text-lg font-extrabold text-primary">{busy ? t("uploading") : t("coverAdd")}</span>
          <span id={hintId} className="text-[13px] text-body">
            {t("coverHint")}
          </span>
        </label>
      )}
      {busy && (
        <div
          role="progressbar"
          aria-label={t("uploading")}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round((progress ?? 0) * 100)}
          className="h-2 overflow-hidden rounded-full bg-smoke"
        >
          <div className="h-full bg-primary transition-[width]" style={{ width: `${(progress ?? 0) * 100}%` }} />
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm font-bold text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
