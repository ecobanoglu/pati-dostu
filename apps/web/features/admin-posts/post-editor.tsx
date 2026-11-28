"use client"

import {
  countryCodes,
  type EditablePostStatus,
  POST_EXCERPT_MAX,
  POST_SLUG_PATTERN,
  POST_TITLE_MAX,
  postTypes,
  type PostType,
  postWordCount,
  readingMinutes,
  savePostSchema,
  slugifyTitle,
} from "@pati-dostu/validators"
import type { JSONContent } from "@tiptap/react"
import { ExternalLink, LoaderCircle } from "lucide-react"
import { useFormatter, useLocale, useTranslations } from "next-intl"
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react"

import { TiptapContent } from "@/components/content/tiptap"
import { ConfirmDialog } from "@/components/dialog/confirm-dialog"
import { Checkbox } from "@/components/form/checkbox"
import { Field } from "@/components/form/field"
import { Input, Select, Textarea } from "@/components/form/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getPathname, Link, useRouter } from "@/i18n/navigation"
import { apiFetch } from "@/lib/api-browser"
import { useErrorMessage } from "@/lib/errors"
import { site } from "@/lib/site"
import { cn } from "@/lib/utils"

import { refreshPublicPosts } from "./actions"
import { type Cover, CoverPicker } from "./cover-picker"
import { istanbulLocalToIso, isoToIstanbulLocal } from "./datetime"
import { RichTextEditor } from "./rich-text-editor"
import { TagInput } from "./tag-input"
import type { AdminPostDetail, AdminPostOptions } from "./types"

/** Formun alanları (kaydedilmemiş hâl). `scheduledAt` İstanbul saatiyle datetime-local değeri. */
type Fields = {
  type: PostType
  status: EditablePostStatus
  title: string
  slug: string
  /** Adres parçası elle mi verildi (değilse API başlıktan üretir). */
  slugManual: boolean
  excerpt: string
  cover: Cover | null
  categoryId: string
  tags: string[]
  featured: boolean
  country: string
  sourceName: string
  sourceUrl: string
  scheduledAt: string
}

/** Sunucudaki son kayıt (durum, adres, yayın bilgisi). */
type Saved = Pick<AdminPostDetail, "id" | "status" | "everPublished" | "slug" | "publishedAt" | "title">

type SaveState =
  | { kind: "idle" }
  | { kind: "saving"; auto: boolean }
  | { kind: "saved"; at: Date; auto: boolean; message: string | null }
  | { kind: "error"; auto: boolean }

/** Alan → hata kodu (Errors çevirisi). */
type FieldErrors = Partial<Record<string, string>>

/** Hata alanının odaklanacak öğesi; sıra sayfadaki sıradır (ilk hatalıya odaklanılır). */
const FIELD_IDS: Record<string, string> = {
  title: "post-title",
  slug: "post-slug-edit",
  content: "post-body",
  publishedAt: "post-scheduled",
  categoryId: "post-category",
  country: "post-country",
  sourceName: "post-source-name",
  sourceUrl: "post-source-url",
  tags: "post-tags",
  excerpt: "post-excerpt",
}

/** useSyncExternalStore için boş abonelik (yalnız "hidrasyon bitti mi" bilgisi). */
const noopSubscribe = () => () => {}

/** Otomatik kayıt gecikmesi (son değişiklikten sonra). */
const AUTOSAVE_MS = 3000

/** Adres parçası başlıktan otomatik mi üretilmiş (ör. "baslik" ya da çakışmada "baslik-2"). */
function isAutoSlug(slug: string, title: string): boolean {
  const base = slugifyTitle(title) || "yazi"
  return slug === base || new RegExp(`^${base}-\\d+$`).test(slug)
}

/** Yarın 09:00 (İstanbul) — "Planlandı" ilk seçildiğinde önerilen saat. */
function tomorrowMorning(): string {
  return `${isoToIstanbulLocal(new Date(Date.now() + 86_400_000)).slice(0, 10)}T09:00`
}

/** Sunucu kaydından form alanları (yeni yazıda boş form). */
function toFields(post: AdminPostDetail | null, type: PostType): Fields {
  return {
    type: post?.type ?? type,
    status: post?.status ?? "draft",
    title: post?.title ?? "",
    slug: post?.slug ?? "",
    slugManual: post ? post.everPublished || !isAutoSlug(post.slug, post.title) : false,
    excerpt: post?.excerpt ?? "",
    cover: post?.cover ?? null,
    categoryId: post?.categoryId ?? "",
    tags: post?.tags ?? [],
    featured: post?.featured ?? false,
    country: post?.country ?? (type === "news" ? "TR" : ""),
    sourceName: post?.sourceName ?? "",
    sourceUrl: post?.sourceUrl ?? "",
    scheduledAt: post?.status === "scheduled" && post.publishedAt ? isoToIstanbulLocal(post.publishedAt) : "",
  }
}

/** Sağ sütun kartı (Yayın, Sınıflandırma, Arama görünümü). */
function Card({ title, children }: { title: string; children: ReactNode }) {
  const id = `card-${title.replace(/\s+/g, "-")}`
  return (
    <section aria-labelledby={id} className="grid gap-4 rounded-card border border-border bg-background p-5 lg:p-6">
      <h2 id={id} className="text-lg font-extrabold text-heading">
        {title}
      </h2>
      {children}
    </section>
  )
}

/**
 * Blog / haber editörü (tasarım 07-admin/06). Solda tür (Blog yazısı / Haber-duyuru), kapak, başlık, adres parçası
 * ve Tiptap metni; sağda Yayın (durum, planlı saat, Önizle, Taslak kaydet, ana eylem), Sınıflandırma (kategori,
 * öne çıkan / ülke + kaynak, etiketler, özet) ve Arama görünümü. Kurallar `savePostSchema` ile tarayıcıda da denetlenir;
 * hatalar alanın altında (`aria-invalid`) ve ilk hatalı alana odaklanılır.
 * Otomatik kayıt (karar): yalnız taslakta, son değişiklikten 3 sn sonra; yayındaki/planlı yazıda değişiklikler ana
 * eylemle kaydedilir, kaydedilmemiş değişiklik varken sayfadan çıkarken tarayıcı uyarır. Kayıttan sonra herkese açık
 * blog/haber önbelleği temizlenir.
 */
export function PostEditor({
  initial,
  options,
  defaultType,
}: {
  initial: AdminPostDetail | null
  options: AdminPostOptions
  defaultType: PostType
}) {
  const t = useTranslations("AdminPosts")
  const tc = useTranslations("Common")
  const errorMessage = useErrorMessage()
  const format = useFormatter()
  const locale = useLocale()
  const router = useRouter()

  const [fields, setFields] = useState<Fields>(() => toFields(initial, defaultType))
  const [saved, setSaved] = useState<Saved | null>(initial)
  // Editörün ilk belgesi (sabit) ve güncel belge (önizleme, kelime sayısı, kayıt).
  const [initialDoc] = useState<JSONContent>(() => (initial?.content as JSONContent) ?? { type: "doc", content: [] })
  const [doc, setDoc] = useState<JSONContent>(initialDoc)
  const words = useMemo(() => postWordCount(doc), [doc])
  // Değişiklik sayacı: kaydedilen sürümden farklıysa kaydedilmemiş değişiklik var.
  const [version, setVersion] = useState(0)
  const [savedVersion, setSavedVersion] = useState(0)
  const versionRef = useRef(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const [saveState, setSaveState] = useState<SaveState>({ kind: "idle" })
  const [errors, setErrors] = useState<FieldErrors>({})
  const [generalError, setGeneralError] = useState<string | null>(null)
  const [editingSlug, setEditingSlug] = useState(false)
  const [slugDraft, setSlugDraft] = useState(fields.slug)
  const [preview, setPreview] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const dirty = version !== savedVersion
  const saving = saveState.kind === "saving"
  const isBlog = fields.type === "blog"

  /** Bir değişikliği işaretler (otomatik kayıt ve çıkış uyarısı için). */
  const touch = useCallback(() => {
    versionRef.current += 1
    setVersion(versionRef.current)
  }, [])

  /** Alanları günceller, ilgili hatayı siler. */
  const set = useCallback(
    <K extends keyof Fields>(key: K, value: Fields[K]) => {
      setFields((f) => ({ ...f, [key]: value }))
      setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e))
      touch()
    },
    [touch]
  )

  /** Editör belgesi değişti. */
  const onContent = useCallback(
    (next: JSONContent) => {
      setDoc(next)
      setErrors((e) => (e.content ? { ...e, content: undefined } : e))
      touch()
    },
    [touch]
  )

  const categories = options.categories.filter((c) => c.type === fields.type)
  // Ülke adları tarayıcıda üretilir (sunucunun ICU'su farklı ad/sıra verebilir → hidrasyon uyuşmazlığı); ilk
  // çizimde yalnız seçili ülkenin kodu listelenir.
  const hydrated = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  )
  const countries = useMemo(() => {
    if (!hydrated) return fields.country ? [{ code: fields.country, name: fields.country }] : []
    const names = new Intl.DisplayNames([locale], { type: "region" })
    return countryCodes
      .map((code) => ({ code, name: names.of(code) ?? code }))
      .sort((a, b) => (a.code === "TR" ? -1 : b.code === "TR" ? 1 : a.name.localeCompare(b.name, locale)))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seçili ülke yalnız ilk çizim için
  }, [locale, hydrated])

  // Adres önizlemesi: elle verilmişse o; yayına girmişse kayıtlı adres; yoksa başlıktan (kayıtta çakışırsa "-2" eklenir).
  const displaySlug = fields.slugManual
    ? fields.slug
    : saved && (saved.everPublished || saved.title === fields.title.trim())
      ? saved.slug
      : slugifyTitle(fields.title)
  const postPath = displaySlug
    ? getPathname({
        href: { pathname: isBlog ? "/blog/[slug]" : "/news/[slug]", params: { slug: displaySlug } },
        locale,
      })
    : getPathname({ href: isBlog ? "/blog" : "/news", locale })
  const sectionPath = getPathname({ href: isBlog ? "/blog" : "/news", locale }).replace(/^\//, "")

  /** Gövdeyi kurar (türe özgü alanlar yalnız o türde gönderilir). */
  const payload = (status: EditablePostStatus) => ({
    type: fields.type,
    status,
    title: fields.title.trim(),
    slug: fields.slugManual ? fields.slug : null,
    excerpt: fields.excerpt.trim(),
    content: doc as Record<string, unknown>,
    coverKey: fields.cover?.key ?? null,
    categoryId: fields.categoryId || null,
    tags: fields.tags,
    featured: isBlog && fields.featured,
    country: isBlog ? null : fields.country || null,
    sourceName: isBlog ? null : fields.sourceName.trim() || null,
    sourceUrl: isBlog ? null : fields.sourceUrl.trim() || null,
    publishedAt: status === "scheduled" ? istanbulLocalToIso(fields.scheduledAt) : null,
  })

  /** İlk hatalı alana odaklanır (sırası formdaki gibi). */
  const focusFirst = (errs: FieldErrors) => {
    const first = Object.keys(FIELD_IDS).find((k) => errs[k])
    if (!first) return
    if (first === "slug") {
      setSlugDraft(fields.slug)
      setEditingSlug(true)
    }
    requestAnimationFrame(() => {
      // Kapla sınırlı: Next önceki sayfayı gizli tutabilir, aynı id orada da olabilir.
      const el = rootRef.current?.querySelector<HTMLElement>(`#${FIELD_IDS[first]}`)
      const target = first === "content" ? el?.querySelector<HTMLElement>("[contenteditable]") : el
      target?.focus()
    })
  }

  /**
   * Kaydeder: tarayıcıda doğrular, POST (yeni) / PATCH (var olan). Otomatik kayıtta hata gösterilmez (yalnız alt
   * satırda "kaydedilemedi"); elle kayıtta alan hataları ve genel hata gösterilir. Yeni yazı ilk kayıtta adresi
   * /admin/yazilar/{id} olur (sayfa yenilenmeden).
   */
  const save = async (status: EditablePostStatus, auto = false) => {
    const body = payload(status)
    const errs: FieldErrors = {}
    const parsed = savePostSchema.safeParse(body)
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "")
        if (key && !errs[key]) errs[key] = issue.message
      }
    }
    if (status === "scheduled" && body.publishedAt && Date.parse(body.publishedAt) <= Date.now())
      errs.publishedAt ??= "SCHEDULE_IN_PAST"
    if (Object.keys(errs).length > 0) {
      if (auto) return
      setErrors(errs)
      setGeneralError(t("fixErrors"))
      focusFirst(errs)
      return
    }

    const startVersion = versionRef.current
    const wasPublic = saved ? saved.status !== "draft" : false
    setSaveState({ kind: "saving", auto })
    if (!auto) setGeneralError(null)
    const { data, error } = saved
      ? await apiFetch<AdminPostDetail>(`/admin/posts/${saved.id}`, { method: "PATCH", body: JSON.stringify(body) })
      : await apiFetch<AdminPostDetail>("/admin/posts", { method: "POST", body: JSON.stringify(body) })
    if (error) {
      setSaveState({ kind: "error", auto })
      if (auto) return
      const field = typeof error.details?.field === "string" ? error.details.field : null
      const message = errorMessage(error.code, error.details)
      if (field && FIELD_IDS[field]) {
        const next = { [field]: error.code }
        setErrors(next)
        focusFirst(next)
        setGeneralError(t("fixErrors"))
      } else setGeneralError(message)
      return
    }

    if (!saved) {
      window.history.replaceState(
        null,
        "",
        getPathname({ href: { pathname: "/admin/posts/[id]", params: { id: data.id } }, locale })
      )
    }
    setSaved(data)
    setSavedVersion(startVersion)
    setFields((f) => ({
      ...f,
      status: data.status,
      slug: f.slugManual ? f.slug : data.slug,
      slugManual: f.slugManual || data.everPublished,
    }))
    setErrors({})
    const message = auto
      ? null
      : data.status === "scheduled" && data.publishedAt
        ? t("savedScheduled", {
            date: format.dateTime(new Date(data.publishedAt), { dateStyle: "medium", timeStyle: "short" }),
          })
        : data.status === "published"
          ? t(wasPublic ? "savedUpdated" : "savedPublished")
          : t("savedDraft")
    setSaveState({ kind: "saved", at: new Date(), auto, message })
    if (!auto && (wasPublic || data.status !== "draft")) await refreshPublicPosts()
  }

  // Otomatik kayıt: yalnız taslakta (kayıtlı durumu da taslaksa), başlık varken, son değişiklikten 3 sn sonra.
  const autosave = fields.status === "draft" && (!saved || saved.status === "draft") && fields.title.trim().length > 0
  useEffect(() => {
    if (!autosave || !dirty || saving) return
    const timer = setTimeout(() => void save("draft", true), AUTOSAVE_MS)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- save her çizimde yeni; tetikleyici sürüm değişimi
  }, [autosave, dirty, saving, version])

  // Kaydedilmemiş değişiklik varken sayfadan çıkarken tarayıcı uyarısı.
  useEffect(() => {
    if (!dirty) return
    /** Tarayıcının "sayfadan ayrıl?" sorusunu açar. */
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener("beforeunload", onBeforeUnload)
    return () => window.removeEventListener("beforeunload", onBeforeUnload)
  }, [dirty])

  /** Yazıyı siler, listeye döner. */
  const remove = async () => {
    if (!saved) return
    setDeleting(true)
    const { error } = await apiFetch(`/admin/posts/${saved.id}`, { method: "DELETE" })
    if (error) {
      setDeleting(false)
      setConfirmDelete(false)
      setGeneralError(errorMessage(error.code))
      return
    }
    if (saved.status !== "draft") await refreshPublicPosts()
    setSavedVersion(versionRef.current)
    router.push("/admin/posts")
  }

  /** Tür değişince öbür türün kategorisi ve alanları temizlenir. */
  const changeType = (type: PostType) => {
    setFields((f) => ({
      ...f,
      type,
      categoryId: options.categories.some((c) => c.id === f.categoryId && c.type === type) ? f.categoryId : "",
      country: type === "news" && !f.country ? "TR" : f.country,
    }))
    touch()
  }

  /** Durum seçimi; "Planlandı" ilk seçildiğinde yarın 09:00 önerilir. */
  const changeStatus = (status: EditablePostStatus) => {
    setFields((f) => ({
      ...f,
      status,
      scheduledAt: status === "scheduled" && !f.scheduledAt ? tomorrowMorning() : f.scheduledAt,
    }))
    setErrors((e) => ({ ...e, publishedAt: undefined }))
    setGeneralError(null)
  }

  /** Adres parçası düzenlemesini uygular (biçim hatalıysa alanın altında). */
  const applySlug = () => {
    const value = slugDraft.trim()
    if (!value || !POST_SLUG_PATTERN.test(value)) {
      setErrors((e) => ({ ...e, slug: "SLUG_INVALID" }))
      return
    }
    setFields((f) => ({ ...f, slug: value, slugManual: true }))
    setErrors((e) => ({ ...e, slug: undefined }))
    setEditingSlug(false)
    touch()
  }

  const scheduledIso = istanbulLocalToIso(fields.scheduledAt)
  const primaryLabel =
    fields.status === "scheduled"
      ? scheduledIso
        ? t("schedule", {
            date: format.dateTime(new Date(scheduledIso), {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            }),
          })
        : t("scheduleNoDate")
      : fields.status === "published"
        ? saved?.status === "published"
          ? t("update")
          : t("publish")
        : t("saveDraftPrimary")
  const showDraftButton = fields.status !== "draft" && (!saved || saved.status === "draft")
  const errorText = (key: string) => (errors[key] ? errorMessage(errors[key]) : undefined)

  const footerStatus = (() => {
    if (saveState.kind === "saving") return t("saving")
    if (saveState.kind === "error" && saveState.auto) return t("autoSaveFailed")
    if (dirty) return autosave ? t("unsavedAuto") : t("unsaved")
    if (saveState.kind === "saved")
      return t(saveState.auto ? "autoSavedAt" : "savedAt", {
        time: format.dateTime(saveState.at, { hour: "2-digit", minute: "2-digit" }),
      })
    return null
  })()

  return (
    <div ref={rootRef} className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      {/* --- Sol: içerik --- */}
      <div className="grid gap-4">
        <fieldset className="flex flex-wrap items-center gap-3">
          <legend className="sr-only">{t("typeLabel")}</legend>
          <div className="inline-flex rounded-lg border border-border bg-background">
            {postTypes.map((type) => (
              <label
                key={type}
                className={cn(
                  "inline-flex min-h-tap cursor-pointer items-center px-4 text-[15px] font-extrabold text-heading first:rounded-l-lg last:rounded-r-lg",
                  "has-checked:bg-primary has-checked:text-primary-foreground has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring"
                )}
              >
                <input
                  type="radio"
                  name="post-type"
                  value={type}
                  checked={fields.type === type}
                  onChange={() => changeType(type)}
                  className="sr-only"
                />
                {t(`typeToggle.${type}`)}
              </label>
            ))}
          </div>
          {preview && <Badge variant="soft">{t("previewMode")}</Badge>}
        </fieldset>

        {preview && (
          <PostPreview
            fields={fields}
            doc={doc}
            categoryName={categories.find((c) => c.id === fields.categoryId)?.name ?? null}
            onBack={() => setPreview(false)}
          />
        )}

        <div className="grid gap-4" hidden={preview}>
          <CoverPicker value={fields.cover} onChange={(cover) => set("cover", cover)} />

          <div className="grid gap-1">
            <label htmlFor="post-title" className="text-sm font-extrabold text-body">
              {t("titleLabel")}
            </label>
            <textarea
              id="post-title"
              rows={1}
              value={fields.title}
              maxLength={POST_TITLE_MAX}
              placeholder={t("titlePlaceholder")}
              aria-invalid={Boolean(errors.title)}
              aria-describedby={errors.title ? "post-title-error" : undefined}
              onChange={(e) => set("title", e.target.value.replace(/\n/g, " "))}
              onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
              className="field-sizing-content min-h-12 w-full resize-none rounded-lg bg-transparent px-1 text-[28px] leading-tight font-extrabold text-heading placeholder:text-body/60 focus-visible:outline-2 focus-visible:outline-ring aria-invalid:outline-2 aria-invalid:outline-destructive lg:text-h1"
            />
            {errors.title && (
              <p id="post-title-error" className="text-sm font-bold text-destructive">
                {errorText("title")}
              </p>
            )}
            {editingSlug ? (
              <div className="mt-1 grid gap-2 rounded-lg border border-border bg-background p-3">
                <Field
                  id="post-slug-edit"
                  label={t("slugLabel")}
                  description={saved?.everPublished ? t("slugLiveWarning") : t("slugHint")}
                  error={errorText("slug")}
                >
                  {(control) => (
                    <Input
                      {...control}
                      value={slugDraft}
                      autoComplete="off"
                      spellCheck={false}
                      onChange={(e) => setSlugDraft(e.target.value.toLowerCase())}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          applySlug()
                        }
                      }}
                    />
                  )}
                </Field>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" onClick={applySlug}>
                    {t("slugApply")}
                  </Button>
                  {!saved?.everPublished && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setFields((f) => ({ ...f, slugManual: false }))
                        setErrors((e) => ({ ...e, slug: undefined }))
                        setEditingSlug(false)
                        touch()
                      }}
                    >
                      {t("slugAuto")}
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditingSlug(false)
                      setErrors((e) => ({ ...e, slug: undefined }))
                    }}
                  >
                    {t("cancel")}
                  </Button>
                </div>
              </div>
            ) : (
              <p className="px-1 text-sm break-all text-body">
                {site.host}
                {postPath.replace(displaySlug, "")}
                <strong className="font-extrabold text-heading">{displaySlug}</strong>
                {" · "}
                <button
                  type="button"
                  onClick={() => {
                    setSlugDraft(displaySlug)
                    setEditingSlug(true)
                  }}
                  aria-label={t("slugEditLabel")}
                  className="inline-flex min-h-tap items-center font-bold text-primary underline underline-offset-4 hover:no-underline"
                >
                  {t("slugEdit")}
                </button>
              </p>
            )}
          </div>

          <div id="post-body" className="grid gap-1">
            <span id="post-body-label" className="px-1 text-sm font-extrabold text-body">
              {t("bodyLabel")}
            </span>
            <RichTextEditor
              initial={initialDoc}
              onChange={onContent}
              labelId="post-body-label"
              describedBy={errors.content ? "post-body-error" : undefined}
              invalid={Boolean(errors.content)}
              footer={
                <>
                  <span>{t("wordCount", { words, minutes: readingMinutes(words) })}</span>
                  <span aria-live="polite">{footerStatus}</span>
                </>
              }
            />
            {errors.content && (
              <p id="post-body-error" className="text-sm font-bold text-destructive">
                {errorText("content")}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* --- Sağ: yayın ve sınıflandırma --- */}
      <div className="grid gap-4">
        <Card title={t("publishCard")}>
          <Field id="post-status" label={t("statusLabel")}>
            {(control) => (
              <Select
                {...control}
                value={fields.status}
                onChange={(e) => changeStatus(e.target.value as EditablePostStatus)}
              >
                <option value="draft">{t("status.draft")}</option>
                <option value="published">{t("status.published")}</option>
                <option value="scheduled">{t("status.scheduled")}</option>
              </Select>
            )}
          </Field>
          {fields.status === "scheduled" && (
            <Field
              id="post-scheduled"
              label={t("scheduledLabel")}
              description={t("scheduledHint")}
              error={errorText("publishedAt")}
              required
            >
              {(control) => (
                <Input
                  {...control}
                  type="datetime-local"
                  value={fields.scheduledAt}
                  min={isoToIstanbulLocal(new Date())}
                  onChange={(e) => {
                    setFields((f) => ({ ...f, scheduledAt: e.target.value }))
                    setErrors((x) => ({ ...x, publishedAt: undefined }))
                  }}
                />
              )}
            </Field>
          )}
          {fields.status !== "scheduled" && saved?.everPublished && saved.publishedAt && (
            <p className="text-sm text-body">
              {t("publishedOn", {
                date: format.dateTime(new Date(saved.publishedAt), { dateStyle: "medium", timeStyle: "short" }),
              })}
            </p>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              aria-pressed={preview}
              onClick={() => setPreview((p) => !p)}
              className={cn(!showDraftButton && "col-span-2")}
            >
              {preview ? t("backToEdit") : t("preview")}
            </Button>
            {showDraftButton && (
              <Button type="button" variant="outline" disabled={saving} onClick={() => void save("draft")}>
                {t("saveDraft")}
              </Button>
            )}
          </div>
          <Button type="button" size="lg" disabled={saving} onClick={() => void save(fields.status)}>
            {saving && !saveState.auto && (
              <LoaderCircle aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
            )}
            {primaryLabel}
          </Button>
          <div aria-live="polite" className="empty:hidden">
            {generalError ? (
              <p role="alert" className="text-sm font-bold text-destructive">
                {generalError}
              </p>
            ) : saveState.kind === "saved" && saveState.message && !dirty ? (
              <p className="text-sm font-bold text-success-text">{saveState.message}</p>
            ) : null}
          </div>
          {saved && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
              {saved.status === "published" ? (
                <Link
                  href={{
                    pathname: fields.type === "blog" ? "/blog/[slug]" : "/news/[slug]",
                    params: { slug: saved.slug },
                  }}
                  target="_blank"
                  className="inline-flex min-h-tap items-center gap-1.5 text-sm font-bold text-primary underline underline-offset-4 hover:no-underline"
                >
                  {t("viewOnSite")}
                  <ExternalLink aria-hidden="true" className="size-4" />
                  <span className="sr-only">{t("opensNewTab")}</span>
                </Link>
              ) : (
                <span />
              )}
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="inline-flex min-h-tap items-center text-sm font-bold text-destructive underline underline-offset-4 hover:no-underline"
              >
                {t("delete")}
              </button>
            </div>
          )}
        </Card>

        <Card title={t("classifyCard")}>
          <Field
            id="post-category"
            label={isBlog ? t("categoryLabel") : t("newsTypeLabel")}
            error={errorText("categoryId")}
            required={fields.status !== "draft"}
          >
            {(control) => (
              <Select {...control} value={fields.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
                <option value="">{t("categoryPlaceholder")}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          {isBlog ? (
            <Checkbox
              id="post-featured"
              checked={fields.featured}
              onChange={(e) => set("featured", e.target.checked)}
              label={
                <>
                  <span className="font-extrabold">{t("featuredLabel")}</span>
                  <span className="block text-[13px] text-body">{t("featuredHint")}</span>
                </>
              }
            />
          ) : (
            <>
              <Field
                id="post-country"
                label={t("countryLabel")}
                error={errorText("country")}
                required={fields.status !== "draft"}
              >
                {(control) => (
                  <Select {...control} value={fields.country} onChange={(e) => set("country", e.target.value)}>
                    <option value="">{t("countryPlaceholder")}</option>
                    {countries.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field id="post-source-name" label={t("sourceNameLabel")} error={errorText("sourceName")}>
                {(control) => (
                  <Input
                    {...control}
                    value={fields.sourceName}
                    maxLength={100}
                    onChange={(e) => set("sourceName", e.target.value)}
                  />
                )}
              </Field>
              <Field
                id="post-source-url"
                label={t("sourceUrlLabel")}
                description={t("sourceUrlHint")}
                error={errorText("sourceUrl")}
              >
                {(control) => (
                  <Input
                    {...control}
                    type="url"
                    inputMode="url"
                    value={fields.sourceUrl}
                    placeholder="https://"
                    onChange={(e) => set("sourceUrl", e.target.value)}
                  />
                )}
              </Field>
            </>
          )}
          <div className="grid gap-1.5">
            <label htmlFor="post-tags" className="text-[15px] font-extrabold text-heading">
              {t("tagsLabel")}
            </label>
            <TagInput
              id="post-tags"
              value={fields.tags}
              onChange={(tags) => set("tags", tags)}
              suggestions={options.tags}
              describedBy="post-tags-hint"
              invalid={Boolean(errors.tags)}
            />
            <p
              id="post-tags-hint"
              className={cn("text-[13px]", errors.tags ? "font-bold text-destructive" : "text-body")}
            >
              {errors.tags ? errorText("tags") : t("tagsHint")}
            </p>
          </div>
          <Field
            id="post-excerpt"
            label={t("excerptLabel")}
            required={fields.status !== "draft"}
            description={t("excerptHint", { count: fields.excerpt.length, max: POST_EXCERPT_MAX })}
            error={errorText("excerpt")}
          >
            {(control) => (
              <Textarea
                {...control}
                value={fields.excerpt}
                maxLength={POST_EXCERPT_MAX}
                className="min-h-24"
                onChange={(e) => set("excerpt", e.target.value.replace(/\n/g, " "))}
              />
            )}
          </Field>
        </Card>

        <Card title={t("searchCard")}>
          <div className="grid gap-1 rounded-lg border border-border p-3">
            <p className="text-xs text-success-text">
              {site.host} › {sectionPath}
            </p>
            <p className="text-lg leading-snug break-words text-primary">
              {fields.title.trim() || t("untitled")} | {tc("brandFirst")} {tc("brandSecond")}
            </p>
            <p className="text-sm break-words text-body">{fields.excerpt.trim() || t("excerptMissing")}</p>
          </div>
        </Card>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title={t("deleteTitle")}
        text={saved?.status === "published" ? t("deleteTextLive") : t("deleteText")}
        confirmLabel={t("delete")}
        cancelLabel={t("cancel")}
        destructive
        pending={deleting}
        onConfirm={() => void remove()}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  )
}

/** Önizleme: yazının sitedeki görünümüne yakın (kapak, kategori, başlık, giriş paragrafı, içerik). */
function PostPreview({
  fields,
  doc,
  categoryName,
  onBack,
}: {
  fields: Fields
  doc: JSONContent
  categoryName: string | null
  onBack: () => void
}) {
  const t = useTranslations("AdminPosts")
  return (
    <article className="grid gap-5 rounded-card border border-border bg-background p-5 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-bold text-body">{t("previewNote")}</p>
        <Button type="button" variant="outline" size="sm" onClick={onBack}>
          {t("backToEdit")}
        </Button>
      </div>
      {categoryName && <Badge variant="soft">{categoryName}</Badge>}
      <h2 className="text-h2 font-extrabold text-heading lg:text-h1">{fields.title.trim() || t("untitled")}</h2>
      {fields.cover && (
        // eslint-disable-next-line @next/next/no-img-element -- depo adresi (posts/)
        <img
          src={fields.cover.url}
          alt=""
          className="aspect-[16/9] w-full rounded-card object-cover object-[50%_30%] lg:aspect-[12/5]"
        />
      )}
      <TiptapContent doc={doc} lead={fields.type === "blog"} />
    </article>
  )
}
