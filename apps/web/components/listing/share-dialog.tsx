"use client"

import { Download, ImageIcon, Link2, LoaderCircle, Share2, X } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { useId, useRef, useState } from "react"

import { Checkbox } from "@/components/form/checkbox"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  defaultTemplate,
  SHARE_TEMPLATES,
  shareImagePath,
  type ShareFormat,
  type ShareTemplate,
} from "@/lib/share-image"
import { getPathname } from "@/i18n/navigation"
import { cn } from "@/lib/utils"

type Props = {
  listingNo: number
  title: string
  /** İlan türü: kayıp/bulunanda "Afiş" varsayılan seçilir. */
  type: string
  /**
   * full: çerçeveli "Paylaş" butonu (detay kartı) · icon: mobil üst çubuktaki ikon · image: "Paylaşım görseli"
   * butonu (İlanlarım).
   */
  variant: "full" | "icon" | "image"
  /**
   * İlan adresinin kısa adı ({slug}-{no}). Verilirse bağlantı kopyala / WhatsApp / X ilanın adresini paylaşır;
   * verilmezse bulunulan sayfanın adresi (ilan detayı) kullanılır.
   */
  slug?: string
}

/**
 * "Paylaş" butonu ve paylaşım görseli penceresi (tasarım: 05-ilanlarim-paylasim-gorseli, 13-mobil-…).
 * Masaüstünde ortada pencere, mobilde alttan açılan pencere (yerel <dialog>: odak hapsi ve Esc tarayıcıdan).
 * İçerik: büyük önizleme, 6 şablon, gönderi/hikâye, "Özellikleri göster", PNG indir, bağlantıyı kopyala,
 * WhatsApp, Instagram (dosya paylaşımı destekleniyorsa sistem penceresi, değilse indirir), X.
 * Görsel /api/og/listing/{no} adresinden gelir; telefon numarası görselde yer almaz.
 */
export function ShareDialog({ listingNo, title, type, variant, slug }: Props) {
  const t = useTranslations("ShareDialog")
  const locale = useLocale()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const [open, setOpen] = useState(false)
  const [template, setTemplate] = useState<ShareTemplate>(defaultTemplate(type))
  const [format, setFormat] = useState<ShareFormat>("post")
  const [features, setFeatures] = useState(false)
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<{ text: string; error?: boolean } | null>(null)

  const src = shareImagePath(listingNo, { template, format, features, locale })
  const loading = loadedSrc !== src && !failed

  /** Pencereyi açar (içerik ve küçük görseller ancak açılınca yüklenir). */
  function show() {
    setOpen(true)
    setNotice(null)
    dialogRef.current?.showModal()
  }

  /** Şablon/boyut/özellik değişince önizleme yeniden yüklenir. */
  function change(next: () => void) {
    setFailed(false)
    setNotice(null)
    next()
  }

  /** Görseli PNG dosyası olarak alır (indirme ve Instagram paylaşımı için). */
  async function fetchFile(): Promise<File | null> {
    const res = await fetch(src).catch(() => null)
    if (!res?.ok) return null
    const blob = await res.blob()
    return new File([blob], `pati-dostu-PD-${listingNo}-${template}-${format}.png`, { type: "image/png" })
  }

  /** Dosyayı tarayıcının indirme mekanizmasıyla kaydeder. */
  function save(file: File) {
    const href = URL.createObjectURL(file)
    const a = document.createElement("a")
    a.href = href
    a.download = file.name
    a.click()
    setTimeout(() => URL.revokeObjectURL(href), 1000)
  }

  /** "Görseli indir (PNG)". */
  async function download() {
    setBusy(true)
    const file = await fetchFile()
    setBusy(false)
    if (file) save(file)
    else setNotice({ text: t("loadFailed"), error: true })
  }

  /** Instagram: telefonda sistemin paylaşım penceresi (dosyayla); desteklenmiyorsa indirir ve yol gösterir. */
  async function instagram() {
    setBusy(true)
    const file = await fetchFile()
    setBusy(false)
    if (!file) return setNotice({ text: t("loadFailed"), error: true })
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title })
      } catch {
        // Kullanıcı vazgeçti.
      }
      return
    }
    save(file)
    setNotice({ text: t("instagramHint") })
  }

  /** Sayfanın adresini panoya kopyalar. */
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(pageUrl)
      setNotice({ text: t("copied") })
    } catch {
      // Pano izni yok.
    }
  }

  const pageUrl =
    typeof window === "undefined"
      ? ""
      : slug
        ? window.location.origin + getPathname({ href: { pathname: "/listing/[slug]", params: { slug } }, locale })
        : window.location.href
  const text = t("shareText", { title })
  const formatLabel = format === "post" ? t("formatPost") : t("formatStory")

  return (
    <>
      {variant === "full" ? (
        <Button variant="outline" size="sm" onClick={show}>
          <Share2 aria-hidden="true" />
          {t("open")}
        </Button>
      ) : variant === "image" ? (
        <Button variant="outline" size="sm" onClick={show}>
          <ImageIcon aria-hidden="true" />
          {t("title")}
        </Button>
      ) : (
        <Button variant="ghost" size="icon" onClick={show} aria-label={t("open")}>
          <Share2 aria-hidden="true" />
        </Button>
      )}

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        onClose={() => setOpen(false)}
        onClick={(e) => e.target === e.currentTarget && dialogRef.current?.close()}
        className={cn(
          "m-0 w-full max-w-none overflow-y-auto bg-background p-0 text-heading backdrop:bg-heading/60",
          "max-lg:top-auto max-lg:bottom-0 max-lg:max-h-[92dvh] max-lg:rounded-t-dialog",
          "lg:m-auto lg:max-h-[90dvh] lg:max-w-[920px] lg:rounded-dialog"
        )}
      >
        {open && (
          <div className="p-5 lg:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id={titleId} className="text-xl font-extrabold text-heading lg:text-h3">
                  {t("title")}
                </h2>
                <p className="text-sm text-body">{title}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => dialogRef.current?.close()}
                aria-label={t("close")}
                className="bg-smoke-2"
              >
                <X aria-hidden="true" />
              </Button>
            </div>

            <div className="mt-5 grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:gap-8">
              {/* Önizleme + boyut */}
              <div className="grid grid-cols-[minmax(0,1fr)] content-start gap-4">
                <div
                  className={cn(
                    "relative mx-auto w-full overflow-hidden rounded-card bg-smoke-2 shadow-pop",
                    format === "post" ? "aspect-square max-w-[380px]" : "aspect-[9/16] max-w-[260px]"
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- üretilen PNG */}
                  <img
                    key={src}
                    src={src}
                    alt={t("preview", { template: t(`templates.${template}`), format: formatLabel })}
                    onLoad={() => setLoadedSrc(src)}
                    onError={() => setFailed(true)}
                    className={cn("size-full object-cover transition-opacity", loading && "opacity-40")}
                  />
                  {loading && (
                    <span
                      role="status"
                      className="absolute inset-0 flex items-center justify-center gap-2 text-sm font-bold"
                    >
                      <LoaderCircle aria-hidden="true" className="size-5 animate-spin motion-reduce:animate-none" />
                      {t("loading")}
                    </span>
                  )}
                  {failed && (
                    <p
                      role="alert"
                      className="absolute inset-x-3 bottom-3 rounded-md bg-background p-2 text-sm font-bold text-danger"
                    >
                      {t("loadFailed")}
                    </p>
                  )}
                </div>
                <div role="group" aria-label={t("format")} className="flex justify-center lg:justify-start">
                  {(["post", "story"] as const).map((key, i) => (
                    <button
                      key={key}
                      type="button"
                      aria-pressed={format === key}
                      onClick={() => change(() => setFormat(key))}
                      className={cn(
                        "min-h-tap border border-border px-4 text-sm font-extrabold",
                        "focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                        i === 0 ? "rounded-l-xl" : "-ml-px rounded-r-xl",
                        format === key ? "border-primary bg-primary text-primary-foreground" : "bg-background"
                      )}
                    >
                      {key === "post" ? t("formatPost") : t("formatStory")}
                    </button>
                  ))}
                </div>
              </div>

              {/* Şablonlar + seçenekler + eylemler */}
              <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-4">
                <div>
                  <p id={`${titleId}-templates`} className="mb-2 font-extrabold">
                    {t("template")}
                  </p>
                  <ul
                    role="group"
                    aria-labelledby={`${titleId}-templates`}
                    className="-mx-5 flex gap-2.5 overflow-x-auto px-5 pb-1 [scrollbar-width:none] lg:mx-0 lg:grid lg:grid-cols-3 lg:px-0"
                  >
                    {SHARE_TEMPLATES.map((key) => (
                      <li key={key} className="w-28 shrink-0 lg:w-auto">
                        <button
                          type="button"
                          aria-pressed={template === key}
                          onClick={() => change(() => setTemplate(key))}
                          className={cn(
                            "grid w-full gap-1.5 rounded-xl border-2 p-2 text-sm font-extrabold",
                            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                            template === key ? "border-primary bg-accent text-primary" : "border-border bg-background"
                          )}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element -- üretilen PNG (küçük önizleme) */}
                          <img
                            src={shareImagePath(listingNo, { template: key, format: "post", features, locale })}
                            alt=""
                            loading="lazy"
                            className="aspect-square w-full rounded-md bg-smoke-2 object-cover"
                          />
                          {t(`templates.${key}`)}
                        </button>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-sm text-body">{t("posterHint")}</p>
                </div>

                <Checkbox
                  id={`${titleId}-features`}
                  label={t("showFeatures")}
                  checked={features}
                  onChange={(e) => change(() => setFeatures(e.target.checked))}
                />

                <Button size="lg" onClick={download} disabled={busy}>
                  {busy ? (
                    <LoaderCircle aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
                  ) : (
                    <Download aria-hidden="true" />
                  )}
                  {busy ? t("downloading") : t("download")}
                </Button>

                <div className="flex flex-wrap gap-2.5">
                  <Button variant="outline" size="sm" onClick={copyLink} className="min-h-tap">
                    <Link2 aria-hidden="true" />
                    {t("copyLink")}
                  </Button>
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(`${text} ${pageUrl}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }), "min-h-tap")}
                  >
                    {t("whatsapp")}
                  </a>
                  <Button variant="outline" size="sm" onClick={instagram} disabled={busy} className="min-h-tap">
                    {t("instagram")}
                  </Button>
                  <a
                    href={`https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(pageUrl)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }), "min-h-tap")}
                  >
                    {t("x")}
                  </a>
                </div>
                <p
                  role="status"
                  className={cn("text-sm font-bold empty:hidden", notice?.error ? "text-danger" : "text-success-text")}
                >
                  {notice?.text}
                </p>
                <p className="text-sm text-body">{t("note")}</p>
              </div>
            </div>
          </div>
        )}
      </dialog>
    </>
  )
}
