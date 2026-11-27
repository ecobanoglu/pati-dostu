"use client"

import { MAX_IMAGE_SOURCE_BYTES, MAX_LISTING_IMAGES } from "@pati-dostu/validators"
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  ImageUp,
  LoaderCircle,
  MoreHorizontal,
  Star,
  Trash2,
  X,
} from "lucide-react"
import { useTranslations } from "next-intl"
import { type DragEvent, useCallback, useEffect, useId, useRef, useState } from "react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { apiFetch } from "@/lib/api-browser"
import { useErrorMessage } from "@/lib/errors"
import { cn } from "@/lib/utils"

import { ImageDecodeError, prepareImage, putWithProgress } from "./image-processing"

/** Seçilebilen dosya türleri (HEIC tarayıcıda JPEG'e çevrilir; açılamazsa hata gösterilir). */
const ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"

type Item = {
  id: string
  name: string
  previewUrl: string | null
  status: "processing" | "uploading" | "done" | "error"
  progress: number
  /** Depodaki geçici anahtar (yükleme bitince). */
  key?: string
  errorCode?: string
}

/** Forma bildirilen değer: sıralı depo anahtarları (ilk = kapak), devam eden yükleme var mı, kapak önizlemesi. */
export type ImageUploaderValue = { keys: string[]; busy: boolean; coverUrl: string | null }

type PresignResponse = { key: string; uploadUrl: string; headers: Record<string, string> }

/** Köşe butonu: 44 px dokunma alanı (erişilebilirlik), içinde 32 px görünür yuvarlak. */
const cornerButton = (position: string) =>
  cn(
    "group absolute flex size-11 items-center justify-center rounded-full text-heading",
    "focus-visible:outline-none [&:focus-visible>span]:outline-2 [&:focus-visible>span]:outline-offset-2 [&:focus-visible>span]:outline-ring",
    position
  )
const cornerDot = "flex size-8 items-center justify-center rounded-full border border-border bg-background shadow-sm"

/**
 * Fotoğraf yükleyici (ilan: 04-ilan-ver-yz-siz › Fotoğraflar; topluluk konusu da kullanır). En fazla `max` fotoğraf; seçerek veya
 * sürükle-bırakla eklenir, tarayıcıda küçültülüp imzalı URL ile doğrudan depoya yüklenir.
 * İlk fotoğraf kapaktır. Sıralama: fareyle sürükle-bırak; dokunmatik ve klavye için her fotoğrafın menüsü
 * (Kapak yap, Sola/Sağa taşı, Kaldır). Değişiklikler ekran okuyucuya duyurulur.
 */
export function ImageUploader({
  initial = [],
  onChange,
  describedBy,
  invalid,
  max = MAX_LISTING_IMAGES,
  uploadPath = "/uploads/listing-image",
}: {
  /** Düzenlemede ilanın mevcut fotoğrafları (anahtar + herkese açık adres), sırasıyla. */
  initial?: Array<{ key: string; url: string }>
  onChange: (value: ImageUploaderValue) => void
  /** Formdaki hata metninin id'si (aria-describedby). */
  describedBy?: string
  invalid?: boolean
  /** En fazla fotoğraf (ilan 5, topluluk konusu 3). */
  max?: number
  /** İmzalı yükleme adresini veren uç (ilan: /uploads/listing-image, konu: /uploads/topic-image). */
  uploadPath?: string
}) {
  const t = useTranslations("ImageUploader")
  const errorMessage = useErrorMessage()
  const inputId = useId()
  const [items, setItems] = useState<Item[]>(() =>
    initial.map((img) => ({
      id: img.key,
      name: img.key.split("/").pop() ?? img.key,
      previewUrl: img.url,
      status: "done",
      progress: 1,
      key: img.key,
    }))
  )
  const [announcement, setAnnouncement] = useState("")
  const [notice, setNotice] = useState<string | null>(null)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dropActive, setDropActive] = useState(false)

  // Forma güncel değeri bildir.
  useEffect(() => {
    const done = items.filter((i) => i.status === "done" && i.key)
    onChange({
      keys: done.map((i) => i.key as string),
      busy: items.some((i) => i.status === "processing" || i.status === "uploading"),
      coverUrl: done[0]?.previewUrl ?? null,
    })
  }, [items, onChange])

  // Bileşen kapanırken önizleme adreslerini serbest bırak.
  const itemsRef = useRef(items)
  useEffect(() => {
    itemsRef.current = items
  }, [items])
  useEffect(
    () => () => itemsRef.current.forEach((i) => i.previewUrl?.startsWith("blob:") && URL.revokeObjectURL(i.previewUrl)),
    []
  )

  /** Tek bir öğeyi günceller. */
  const patch = useCallback((id: string, changes: Partial<Item>) => {
    setItems((list) => list.map((i) => (i.id === id ? { ...i, ...changes } : i)))
  }, [])

  /** Dosyayı hazırlar ve yükler; her aşamada öğenin durumunu günceller. */
  const upload = useCallback(
    async (id: string, file: File) => {
      if (file.size > MAX_IMAGE_SOURCE_BYTES) return patch(id, { status: "error", errorCode: "IMAGE_TOO_LARGE" })
      let blob: Blob
      try {
        blob = await prepareImage(file)
      } catch (error) {
        return patch(id, {
          status: "error",
          errorCode: error instanceof ImageDecodeError ? "IMAGE_UNREADABLE" : "UNKNOWN",
        })
      }
      const previewUrl = URL.createObjectURL(blob)
      patch(id, { previewUrl, status: "uploading", progress: 0 })

      const { data, error } = await apiFetch<PresignResponse>(uploadPath, {
        method: "POST",
        body: JSON.stringify({ contentType: blob.type, size: blob.size }),
      })
      if (error) return patch(id, { status: "error", errorCode: error.code })
      try {
        await putWithProgress(data.uploadUrl, blob, data.headers, (progress) => patch(id, { progress }))
      } catch {
        return patch(id, { status: "error", errorCode: "UPLOAD_FAILED" })
      }
      patch(id, { status: "done", key: data.key, progress: 1 })
      setAnnouncement(t("uploaded", { name: file.name }))
    },
    [patch, t, uploadPath]
  )

  /** Seçilen/bırakılan dosyaları ekler; 5 sınırını aşanlar alınmaz ve kullanıcıya söylenir. */
  function addFiles(files: FileList | File[]) {
    setNotice(null)
    const room = max - items.length
    const list = Array.from(files)
    if (list.length > room) setNotice(errorMessage("TOO_MANY_IMAGES"))
    const accepted = list.slice(0, Math.max(0, room))
    const newItems: Item[] = accepted.map((file) => ({
      id: crypto.randomUUID(),
      name: file.name,
      previewUrl: null,
      status: "processing",
      progress: 0,
    }))
    setItems((current) => [...current, ...newItems])
    newItems.forEach((item, i) => void upload(item.id, accepted[i] as File))
  }

  /** Öğeyi yeni sıraya taşır (0 = kapak). */
  function move(from: number, to: number) {
    if (to < 0 || to >= items.length || from === to) return
    setItems((list) => {
      const next = [...list]
      const [moved] = next.splice(from, 1)
      if (moved) next.splice(to, 0, moved)
      return next
    })
    setAnnouncement(to === 0 ? t("madeCover") : t("moved", { position: to + 1 }))
  }

  /** Öğeyi kaldırır ve önizleme adresini serbest bırakır. Depodaki geçici dosya süre dolunca silinir. */
  function remove(index: number) {
    const item = items[index]
    if (item?.previewUrl?.startsWith("blob:")) URL.revokeObjectURL(item.previewUrl)
    setItems((list) => list.filter((_, i) => i !== index))
    setNotice(null)
    setAnnouncement(t("removed"))
  }

  /** Dışarıdan dosya sürüklenince (fotoğraf eklemek için) bırakma alanını vurgular. */
  function onDragOverZone(e: DragEvent) {
    if (!e.dataTransfer.types.includes("Files")) return
    e.preventDefault()
    setDropActive(true)
  }

  /** Bırakılan dosyaları ekler. */
  function onDropZone(e: DragEvent) {
    setDropActive(false)
    if (!e.dataTransfer.files.length) return
    e.preventDefault()
    addFiles(e.dataTransfer.files)
  }

  const doneCount = items.filter((i) => i.status === "done").length
  const errors = items.filter((i) => i.status === "error")

  return (
    <div
      onDragOver={onDragOverZone}
      onDragLeave={() => setDropActive(false)}
      onDrop={onDropZone}
      className={cn("rounded-2xl transition-colors", dropActive && "bg-smoke outline-2 outline-primary outline-dashed")}
    >
      <p className="text-sm text-body">{t("counter", { count: doneCount, max })}</p>

      <ul className="mt-3 flex flex-wrap gap-3" aria-describedby={describedBy}>
        {items.map((item, index) => (
          <li
            key={item.id}
            draggable={item.status === "done"}
            onDragStart={() => setDragIndex(index)}
            onDragEnd={() => setDragIndex(null)}
            onDragOver={(e) => dragIndex !== null && e.preventDefault()}
            onDrop={(e) => {
              if (dragIndex === null) return
              e.preventDefault()
              e.stopPropagation()
              move(dragIndex, index)
              setDragIndex(null)
            }}
            className={cn("relative size-28", dragIndex === index && "opacity-50")}
          >
            {/* Görsel yalnızca fareyle sürüklemek içindir; menü ayrı butonda (menü basılınca açıldığı için
                görselin kendisi menü olsaydı sürükleme başlamadan menü açılırdı). */}
            <div
              className={cn(
                "flex size-full items-center justify-center overflow-hidden rounded-2xl bg-smoke-2",
                item.status === "done" && "cursor-grab active:cursor-grabbing",
                item.status === "error" && "border-2 border-destructive"
              )}
            >
              {item.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- yerel blob önizlemesi; next/image gerekmez
                <img src={item.previewUrl} alt="" draggable={false} className="size-full object-cover" />
              ) : item.status === "error" ? (
                <AlertCircle aria-hidden="true" className="size-7 text-destructive" />
              ) : (
                <LoaderCircle aria-hidden="true" className="size-7 animate-spin text-primary" />
              )}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label={t("options", { position: index + 1 })}
                className={cornerButton("-right-2.5 -bottom-2.5")}
              >
                <span className={cornerDot}>
                  <MoreHorizontal aria-hidden="true" className="size-4" />
                </span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-52 rounded-xl p-1.5 shadow-pop">
                {index > 0 && item.status === "done" && (
                  <DropdownMenuItem className="min-h-11 gap-2 font-bold" onClick={() => move(index, 0)}>
                    <Star aria-hidden="true" />
                    {t("makeCover")}
                  </DropdownMenuItem>
                )}
                {index > 0 && (
                  <DropdownMenuItem className="min-h-11 gap-2 font-bold" onClick={() => move(index, index - 1)}>
                    <ArrowLeft aria-hidden="true" />
                    {t("moveLeft")}
                  </DropdownMenuItem>
                )}
                {index < items.length - 1 && (
                  <DropdownMenuItem className="min-h-11 gap-2 font-bold" onClick={() => move(index, index + 1)}>
                    <ArrowRight aria-hidden="true" />
                    {t("moveRight")}
                  </DropdownMenuItem>
                )}
                {items.length > 1 && <DropdownMenuSeparator />}
                <DropdownMenuItem className="min-h-11 gap-2 font-bold text-destructive" onClick={() => remove(index)}>
                  <Trash2 aria-hidden="true" />
                  {t("remove")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {index === 0 && item.status !== "error" && (
              <span className="pointer-events-none absolute bottom-2 left-2 rounded-full bg-primary px-2 py-0.5 text-xs font-extrabold text-primary-foreground">
                {t("cover")}
              </span>
            )}
            {item.status === "uploading" && (
              <span
                aria-hidden="true"
                className="absolute inset-x-2 top-2 h-1.5 overflow-hidden rounded-full bg-white/80"
              >
                <span
                  className="block h-full bg-primary transition-[width]"
                  style={{ width: `${item.progress * 100}%` }}
                />
              </span>
            )}
            <button
              type="button"
              onClick={() => remove(index)}
              aria-label={t("removeLabel", { position: index + 1 })}
              className={cornerButton("-top-2.5 -right-2.5 hover:text-destructive")}
            >
              <span className={cornerDot}>
                <X aria-hidden="true" className="size-4" />
              </span>
            </button>
          </li>
        ))}

        {items.length < max && (
          <li className="size-28">
            <label
              htmlFor={inputId}
              className={cn(
                "flex size-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-primary bg-smoke text-center text-sm font-extrabold text-primary",
                "hover:bg-smoke/70 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring",
                invalid && "border-destructive"
              )}
            >
              <ImageUp aria-hidden="true" className="size-6" />
              {t("add")}
              <input
                id={inputId}
                type="file"
                accept={ACCEPT}
                multiple
                className="sr-only"
                aria-describedby={describedBy}
                onChange={(e) => {
                  if (e.target.files?.length) addFiles(e.target.files)
                  e.target.value = ""
                }}
              />
            </label>
          </li>
        )}
      </ul>

      {(notice || errors.length > 0) && (
        <ul role="alert" className="mt-3 space-y-1 text-sm font-bold text-destructive">
          {notice && <li>{notice}</li>}
          {errors.map((item) => (
            <li key={item.id}>
              {item.name}: {errorMessage(item.errorCode)}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3 text-[13px] text-body">{t("hint", { max })}</p>
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  )
}
