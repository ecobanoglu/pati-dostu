"use client"

import { createTopicSchema, TOPIC_BODY_MAX, TOPIC_IMAGES_MAX, TOPIC_TITLE_MAX } from "@pati-dostu/validators"
import { ExternalLink } from "lucide-react"
import { useTranslations } from "next-intl"
import { type FormEvent, useEffect, useState } from "react"

import { RadioCards } from "@/components/form/choices"
import { Field } from "@/components/form/field"
import { ImageUploader, type ImageUploaderValue } from "@/components/form/image-uploader"
import { Input } from "@/components/form/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Link, useRouter } from "@/i18n/navigation"
import { apiFetch } from "@/lib/api-browser"
import { useErrorMessage } from "@/lib/errors"
import type { SimilarTopicData } from "@/lib/forum"
import { cn } from "@/lib/utils"

import { Markdown } from "./markdown"
import { MarkdownEditor } from "./markdown-editor"

type Option = { id: string; slug: string; name: string }
type FieldName = "categoryId" | "title" | "body" | "images"

/** Yazarken benzer konuları başlığın en az bu uzunluğunda sorar. */
const SIMILAR_MIN = 10

/**
 * "Soru sor" formu (tasarım 04-pencereler/01, 09): kategori (zorunlu), başlık (sayaçlı), biçimli ayrıntı, isteğe
 * bağlı tür ("Diğer" = tür yok), en fazla 3 fotoğraf; masaüstünde "Önizle". Başlık yazılırken benzer konular gösterilir
 * (cevabı zaten olabilir). Doğrulama paylaşılan Zod şemasıyla (alan altında hata + aria-invalid); içerik filtresine
 * takılırsa neden ilgili alanın altında. Yayınlanınca konu sayfasına gidilir. Soru sahibi konuyu otomatik takip eder
 * ve cevap bildirimi her durumda alır (tasarımdaki onay kutusu yerine bilgi notu).
 */
export function AskForm({
  categories,
  species,
  initialCategory,
  emailVerified,
}: {
  categories: Option[]
  species: Option[]
  initialCategory: string | null
  emailVerified: boolean
}) {
  const t = useTranslations("AskTopic")
  const tc = useTranslations("Community")
  const errorMessage = useErrorMessage()
  const router = useRouter()

  const [categoryId, setCategoryId] = useState(categories.find((c) => c.slug === initialCategory)?.id ?? "")
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [speciesValue, setSpeciesValue] = useState<string>("")
  const [images, setImages] = useState<ImageUploaderValue>({ keys: [], busy: false, coverUrl: null })
  const [preview, setPreview] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [similar, setSimilar] = useState<SimilarTopicData[]>([])

  // Benzer konular: başlık yazılırken (400 ms bekleyip) sorulur; seçili kategori öne alınır.
  useEffect(() => {
    const q = title.trim()
    if (q.length < SIMILAR_MIN) return
    const timer = setTimeout(async () => {
      const params = new URLSearchParams({ title: q })
      if (categoryId) params.set("categoryId", categoryId)
      const { data } = await apiFetch<SimilarTopicData[]>(`/forum/similar?${params}`)
      setSimilar(data ?? [])
    }, 400)
    return () => clearTimeout(timer)
  }, [title, categoryId])
  const shownSimilar = title.trim().length >= SIMILAR_MIN ? similar : []

  /** Formu doğrular ve konuyu açar; başarılıysa konu sayfasına gider. */
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (sending || images.busy) return
    setFormError(null)
    const payload = {
      categoryId,
      speciesId: speciesValue && speciesValue !== "other" ? speciesValue : null,
      title,
      body,
      images: images.keys,
      follow: true,
    }
    const parsed = createTopicSchema.safeParse(payload)
    if (!parsed.success) {
      const next: Partial<Record<FieldName, string>> = {}
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as FieldName
        if (!next[field]) next[field] = errorMessage(field === "categoryId" ? "CATEGORY_INVALID" : issue.message)
      }
      setErrors(next)
      setPreview(false)
      document.getElementById(`ask-${Object.keys(next)[0]}`)?.focus()
      return
    }
    setErrors({})
    setSending(true)
    const { data, error } = await apiFetch<{ id: string; slug: string }>("/forum/topics", {
      method: "POST",
      body: JSON.stringify(parsed.data),
    })
    if (!data) {
      setSending(false)
      const field = error?.details?.field
      const message = errorMessage(error?.code, error?.details)
      if (error?.code === "CONTENT_BLOCKED" && (field === "title" || field === "body")) {
        setErrors({ [field]: message })
        setPreview(false)
        document.getElementById(`ask-${field}`)?.focus()
      } else {
        setFormError(message)
      }
      return
    }
    const category = categories.find((c) => c.id === categoryId)?.slug ?? ""
    router.push({ pathname: "/community/[category]/[slug]", params: { category, slug: data.slug } })
  }

  const similarBox = (className: string) =>
    shownSimilar.length > 0 && (
      <section aria-labelledby={`similar-${className.includes("lg:hidden") ? "m" : "d"}`} className={className}>
        <h2
          id={`similar-${className.includes("lg:hidden") ? "m" : "d"}`}
          className="text-lg font-extrabold text-heading"
        >
          {tc("similar")}
        </h2>
        <p className="text-sm text-body">{t("similarHint")}</p>
        <ul className="mt-2 divide-y divide-border">
          {shownSimilar.map((s) => (
            <li key={s.id} className="py-2.5">
              <Link
                href={{ pathname: "/community/[category]/[slug]", params: { category: s.category.slug, slug: s.slug } }}
                target="_blank"
                className="inline-flex items-start gap-1 font-extrabold text-heading hover:text-primary focus-visible:outline-2 focus-visible:outline-ring"
              >
                {s.title}
                <ExternalLink aria-hidden="true" className="mt-1 size-3.5 shrink-0" />
                <span className="sr-only">{t("newTab")}</span>
              </Link>
              <p className="text-xs font-bold text-primary">
                {tc("answers", { count: s.answerCount })}
                {s.isSolved && ` · ${tc("solved")}`}
                {s.vetAnswered && ` · ${tc("vetAnswered")}`}
              </p>
            </li>
          ))}
        </ul>
      </section>
    )

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-8">
      <form
        onSubmit={submit}
        noValidate
        className="grid content-start gap-5 lg:rounded-card lg:border lg:border-border lg:bg-background lg:p-6"
      >
        {!emailVerified && (
          <Alert>
            <AlertDescription>
              {t("verifyFirst")}{" "}
              <Link href="/verify-email" className="font-extrabold underline underline-offset-4">
                {t("verifyLink")}
              </Link>
            </AlertDescription>
          </Alert>
        )}
        {formError && (
          <p role="alert" className="rounded-xl bg-danger-soft px-4 py-3 text-sm font-bold text-destructive">
            {formError}
          </p>
        )}

        <div id="ask-categoryId" tabIndex={-1} className="focus:outline-none">
          <RadioCards
            name="category"
            variant="chip"
            legend={
              <>
                {t("category")}{" "}
                <span aria-hidden="true" className="text-destructive">
                  *
                </span>
              </>
            }
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
            value={categoryId}
            onChange={(v) => {
              setCategoryId(v)
              setErrors((e) => ({ ...e, categoryId: undefined }))
            }}
            error={errors.categoryId}
          />
        </div>

        <Field
          id="ask-title"
          label={t("titleLabel")}
          required
          description={t("titleHint", { count: title.length, max: TOPIC_TITLE_MAX })}
          error={errors.title}
        >
          {(props) => (
            <Input
              {...props}
              value={title}
              maxLength={TOPIC_TITLE_MAX}
              onChange={(e) => {
                setTitle(e.target.value)
                setErrors((x) => ({ ...x, title: undefined }))
              }}
              placeholder={t("titlePlaceholder")}
            />
          )}
        </Field>

        <Field id="ask-body" label={t("bodyLabel")} required description={t("bodyHint")} error={errors.body}>
          {(props) =>
            preview ? (
              <div
                id={props.id}
                className="min-h-48 rounded-2xl border border-dashed border-border bg-smoke-2/40 px-4 py-3"
                aria-label={t("previewLabel")}
              >
                <p className="mb-2 text-lg font-extrabold text-heading">{title || t("previewNoTitle")}</p>
                {body.trim() ? (
                  <Markdown text={body} className="text-base text-heading" />
                ) : (
                  <p className="text-body">{t("previewEmpty")}</p>
                )}
              </div>
            ) : (
              <MarkdownEditor
                {...props}
                value={body}
                onChange={(v) => {
                  setBody(v)
                  setErrors((x) => ({ ...x, body: undefined }))
                }}
                maxLength={TOPIC_BODY_MAX}
                placeholder={t("bodyPlaceholder")}
                textareaClassName="min-h-48"
              />
            )
          }
        </Field>

        <RadioCards
          name="species"
          variant="chip"
          legend={t("species")}
          options={[
            ...species.map((s) => ({ value: s.id, label: s.name })),
            { value: "other", label: t("speciesOther") },
          ]}
          value={speciesValue}
          onChange={setSpeciesValue}
        />

        <fieldset>
          <legend className="mb-2 text-[15px] font-extrabold text-heading">{t("photos")}</legend>
          <ImageUploader onChange={setImages} max={TOPIC_IMAGES_MAX} uploadPath="/uploads/topic-image" />
        </fieldset>

        <p className="rounded-xl bg-smoke px-4 py-3 text-sm text-heading">{t("notifyNote")}</p>

        {similarBox("rounded-card bg-smoke p-4 lg:hidden")}

        <div className="flex flex-wrap justify-end gap-3 border-t border-border pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => setPreview((p) => !p)}
            aria-pressed={preview}
            className="max-lg:hidden"
          >
            {preview ? t("edit") : t("preview")}
          </Button>
          <Button type="submit" disabled={sending || images.busy} aria-busy={sending} className={cn("max-lg:w-full")}>
            {sending ? t("publishing") : t("publish")}
          </Button>
        </div>
      </form>

      <aside className="grid content-start gap-6 max-lg:hidden">
        <div className="rounded-card border border-border bg-background p-5">
          {shownSimilar.length > 0 ? (
            similarBox("")
          ) : (
            <>
              <h2 className="text-lg font-extrabold text-heading">{tc("similar")}</h2>
              <p className="mt-1 text-sm text-body">{t("similarEmpty")}</p>
            </>
          )}
        </div>
        <div className="rounded-card bg-smoke p-5">
          <h2 className="text-lg font-extrabold text-heading">{t("tipsTitle")}</h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-heading">
            <li>{t("tipEmergency")}</li>
            <li>{t("tipContact")}</li>
            <li>{t("tipSale")}</li>
          </ul>
        </div>
      </aside>
    </div>
  )
}
