"use client"

import {
  DESCRIPTION_MAX,
  DESCRIPTION_MIN,
  LOCATION_TYPES,
  listingFeatures,
  listingSources,
  listingTypes,
  type ReviewableField,
  saveListingSchema,
  TITLE_MAX,
  TITLE_MIN,
} from "@pati-dostu/validators"
import { CircleCheck, X } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Controller, useForm, useWatch } from "react-hook-form"

import { Checkbox } from "@/components/form/checkbox"
import { RadioCards, Switch, ToggleChips } from "@/components/form/choices"
import { Field } from "@/components/form/field"
import { ImageUploader, type ImageUploaderValue } from "@/components/form/image-uploader"
import { Input, Select, Textarea } from "@/components/form/input"
import { ListingTypeBadge } from "@/components/listing/listing-type-badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button, buttonVariants } from "@/components/ui/button"
import { getPathname, Link, useRouter } from "@/i18n/navigation"
import { apiFetch } from "@/lib/api-browser"
import { type ErrorDetails, useErrorMessage } from "@/lib/errors"
import { useDictionary } from "@/lib/use-dictionary"
import { cn } from "@/lib/utils"

import { ListingFormSidebar } from "./listing-form-sidebar"
import {
  type FieldName,
  type FormValues,
  initialValues,
  type OwnListing,
  type SectionKey,
  STEPS,
  stepOfField,
  toPayload,
} from "./model"

type Option = { id: string; name: string }
type Breed = Option & { isMixed: boolean }

/** Admin'in işaretlediği alanın formdaki etiketi (ListingForm anahtarı). */
const reviewFieldLabel = {
  type: "sectionType",
  title: "listingTitle",
  species: "species",
  breed: "breed",
  name: "name",
  ageGroup: "ageGroup",
  gender: "gender",
  size: "size",
  location: "sectionLocation",
  images: "sectionPhotos",
  description: "sectionDescription",
  features: "sectionFeatures",
  source: "sourceGroup",
  contact: "sectionContact",
} as const satisfies Record<ReviewableField, string>

/**
 * İlan ver / ilan düzenle formu (YZ'siz; tasarım: 04-ilan-ver-yz-siz, mobil 21 ve 20).
 * Masaüstü: 7 bölüm tek sayfada + sağda ilerleme ve kart önizlemesi. Mobil: 6 adımlı sihirbaz; "Devam et" yalnızca
 * o adımın alanlarını denetler. Doğrulama kuralları API ile aynı şemadan (@pati-dostu/validators › saveListingSchema).
 * "Taslak olarak kaydet" yalnızca türü ister; "Onaya gönder" tüm zorunlu alanları, en az 1 fotoğrafı ve onayları.
 */
export function ListingForm({
  listing,
  species,
  cities,
  userHasPhone,
}: {
  /** Düzenlemede mevcut ilan; yeni ilanda yok. */
  listing?: OwnListing | null
  species: Option[]
  cities: Option[]
  userHasPhone: boolean
}) {
  const t = useTranslations("ListingForm")
  const tl = useTranslations("Listing")
  const locale = useLocale()
  const router = useRouter()
  const errorMessage = useErrorMessage()

  const [listingId, setListingId] = useState(listing?.id ?? null)
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState<"draft" | "submit" | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState<{ listingNo: number } | null>(null)
  const [upload, setUpload] = useState<ImageUploaderValue>({
    keys: listing?.images.map((i) => i.key) ?? [],
    busy: false,
    coverUrl: listing?.images[0]?.url ?? null,
  })
  const topRef = useRef<HTMLDivElement>(null)

  const form = useForm<FormValues>({ defaultValues: initialValues(listing) })
  const { register, control, setValue, setError, clearErrors, formState } = form
  const values = useWatch({ control }) as FormValues
  const isLocationType = LOCATION_TYPES.includes(values.type)

  const { items: breeds } = useDictionary<Breed>(
    values.speciesId ? `/species/${values.speciesId}/breeds?locale=${locale}` : null
  )
  const { items: districts } = useDictionary<Option>(values.cityId ? `/cities/${values.cityId}/districts` : null)

  // Irk ve ilçe seçenekleri sonradan yüklenir; yüklenince kayıtlı seçim kutuda yeniden gösterilsin
  // (seçenek yokken <select> değeri tutamaz). Değer formda zaten doğru, yalnızca ekrana yansıtılır.
  useEffect(() => {
    const current = form.getValues("breedId")
    if (current && breeds.some((b) => b.id === current)) setValue("breedId", current)
  }, [breeds, form, setValue])
  useEffect(() => {
    const current = form.getValues("districtId")
    if (current && districts.some((d) => d.id === current)) setValue("districtId", current)
  }, [districts, form, setValue])

  // Kaydedilmemiş değişiklikle sayfadan çıkarken uyar (sekme kapatma / yenileme).
  useEffect(() => {
    if (!formState.isDirty || submitted) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [formState.isDirty, submitted])

  /** Yükleyiciden gelen fotoğraf listesini forma yazar. */
  const onImages = useCallback(
    (value: ImageUploaderValue) => {
      setUpload(value)
      setValue("images", value.keys, { shouldDirty: true })
      if (value.keys.length) clearErrors("images")
    },
    [setValue, clearErrors]
  )

  /** Alanın hata metni. İstemci hataları kod olarak saklanır ve burada çevrilir; sunucu hataları zaten çevrilmiştir. */
  const fieldError = (name: FieldName) => {
    const error = formState.errors[name]
    if (!error?.message) return undefined
    return error.type === "server" ? error.message : errorMessage(error.message)
  }

  /** Sunucudan gelen alan hatası: nedenle birlikte (ör. CONTENT_BLOCKED + phone) hemen çevrilip saklanır. */
  const setServerError = (field: FieldName, code: string, details?: ErrorDetails) =>
    setError(field, { type: "server", message: errorMessage(code, details) })

  /** Şema hatalarını alanlara yazar; ilk hatalı alanı döndürür. */
  function applyIssues(
    issues: Array<{ path: PropertyKey[]; message: string }>,
    only?: readonly string[]
  ): string | null {
    let first: string | null = null
    for (const issue of issues) {
      const field = String(issue.path[0] ?? "")
      if (!field || (only && !only.includes(field))) continue
      setError(field as FieldName, { type: "validate", message: issue.message })
      first ??= field
    }
    return first
  }

  /** İstemci tarafı denetim: API ile aynı şema + yalnızca formda olan KVKK onayı. */
  function validate(submit: boolean, only?: readonly string[]): string | null {
    clearErrors()
    const result = saveListingSchema.safeParse(toPayload(values, submit))
    const issues = result.success ? [] : [...result.error.issues]
    if (submit && !values.acceptTerms) issues.push({ path: ["acceptTerms"], message: "TERMS_NOT_ACCEPTED" } as never)
    return applyIssues(issues, only)
  }

  /** Hatalı alana götürür: mobilde ilgili adıma geçer, sonra alana odaklanır. */
  function focusField(field: string) {
    setStep(stepOfField(field))
    requestAnimationFrame(() => {
      const el = document.getElementById(field) ?? document.querySelector<HTMLElement>(`[name="${field}"]`)
      el?.scrollIntoView({ behavior: "smooth", block: "center" })
      el?.focus({ preventScroll: true })
    })
  }

  /** Kaydet: taslak (submit=false) ya da onaya gönder. */
  async function save(submit: boolean) {
    setFormError(null)
    setNotice(null)
    const first = validate(submit)
    if (first) {
      setFormError(t("fixErrors"))
      focusField(first)
      return
    }

    setSaving(submit ? "submit" : "draft")
    const body = JSON.stringify(toPayload(values, submit))
    const { data, error } = listingId
      ? await apiFetch<OwnListing>(`/listings/${listingId}?locale=${locale}`, { method: "PATCH", body })
      : await apiFetch<OwnListing>(`/listings?locale=${locale}`, { method: "POST", body })
    setSaving(null)

    if (error) {
      const field = typeof error.details?.field === "string" ? error.details.field : null
      if (error.code === "IMAGE_INVALID") {
        setServerError("images", error.code)
        return focusField("images")
      }
      if (field) {
        setServerError(field as FieldName, error.code, error.details)
        setFormError(t("fixErrors"))
        return focusField(field)
      }
      setFormError(errorMessage(error.code, error.details))
      topRef.current?.scrollIntoView({ behavior: "smooth" })
      return
    }

    form.reset(values) // kaydedildi: "kaydedilmemiş değişiklik" uyarısı kalksın
    if (submit) {
      setSubmitted({ listingNo: data.listingNo })
      window.scrollTo({ top: 0 })
      return
    }
    setNotice(t("draftSaved"))
    if (!listingId) {
      setListingId(data.id)
      // Sayfa yenilense de taslaktan devam edilsin: düzenleme adresine geç.
      router.replace({ pathname: "/account/listings/[id]/edit", params: { id: data.id } })
    }
  }

  /** Mobil: adımın alanlarını denetleyip sonrakine geçer. */
  function next() {
    const first = validate(true, STEPS[step]?.fields)
    if (first) return focusField(first)
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
    window.scrollTo({ top: 0 })
  }

  const completed = useMemo<Record<SectionKey, boolean>>(
    () => ({
      type: Boolean(values.type),
      animal: values.title.trim().length >= TITLE_MIN && Boolean(values.speciesId && values.ageGroup && values.size),
      location: Boolean(values.cityId && values.districtId),
      photos: values.images.length > 0,
      description: values.description.trim().length >= DESCRIPTION_MIN,
      features: Boolean(values.source) || listingFeatures.some((f) => values[f]),
      contact: values.confirmNoFee && values.acceptTerms,
    }),
    [values]
  )

  if (submitted) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <CircleCheck aria-hidden="true" className="mx-auto size-14 text-success" />
        <h1 className="mt-4 text-h2 text-heading">{t("successTitle")}</h1>
        <p className="mt-3 text-body">
          {t.rich("successText", {
            listingNo: submitted.listingNo,
            b: (c) => <strong className="text-heading">{c}</strong>,
          })}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/" className={buttonVariants({ variant: "outline" })}>
            {t("successHome")}
          </Link>
          {/* Boş formla yeniden başlamak için tam sayfa yükleme */}
          <a href={getPathname({ href: "/post-listing", locale })} className={buttonVariants()}>
            {t("successNew")}
          </a>
        </div>
      </div>
    )
  }

  const section = (key: SectionKey) => ({
    id: `section-${key}`,
    hidden: !(STEPS[step]?.sections as readonly string[]).includes(key),
  })
  const cityName = cities.find((c) => c.id === values.cityId)?.name
  const districtName = districts.find((d) => d.id === values.districtId)?.name
  const isLast = step === STEPS.length - 1
  const busy = saving !== null || upload.busy
  const featureSet = new Set(listingFeatures.filter((f) => values[f]))

  return (
    <div ref={topRef}>
      {/* Mobil başlık çubuğu */}
      <div className="sticky top-0 z-30 border-b border-border bg-background lg:hidden">
        <div className="flex h-14 items-center gap-2 px-2">
          <Link
            href="/"
            aria-label={t("close")}
            className="flex size-tap items-center justify-center rounded-lg text-heading"
          >
            <X aria-hidden="true" className="size-6" />
          </Link>
          <p className="flex-1 font-extrabold text-heading">{listing ? t("titleEdit") : t("title")}</p>
          <p className="pr-3 font-extrabold text-primary" aria-live="polite">
            {t("stepOf", { current: step + 1, total: STEPS.length })}
          </p>
        </div>
        <div className="mx-4 mb-3 h-1.5 overflow-hidden rounded-full bg-smoke-2">
          <div
            className="h-full bg-primary transition-[width]"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Masaüstü sayfa başlığı */}
      <div className="hidden bg-smoke lg:block">
        <div className="mx-auto max-w-site px-6 py-8">
          <nav aria-label="breadcrumb" className="text-sm">
            <Link href="/" className="font-bold text-primary">
              {t("breadcrumbHome")}
            </Link>
            <span className="mx-2 text-body">/</span>
            <span className="text-heading">{listing ? t("titleEdit") : t("title")}</span>
          </nav>
          <h1 className="mt-2 text-h1 text-heading">{listing ? t("titleEdit") : t("title")}</h1>
          <p className="mt-1 text-body">
            {t.rich("intro", { star: (c) => <span className="text-destructive">{c}</span> })}
          </p>
        </div>
      </div>

      <div className="mx-auto grid max-w-site gap-6 px-4 pt-5 pb-32 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-6 lg:pt-8 lg:pb-16">
        <form noValidate onSubmit={(e) => e.preventDefault()} className="grid content-start gap-5">
          {listing?.status === "changes_requested" && listing.reviewNote && (
            <Alert variant="warning">
              <AlertTitle>{t("reviewNoteTitle")}</AlertTitle>
              <AlertDescription>
                <p>{listing.reviewNote}</p>
                {listing.reviewFields?.length ? (
                  <p>
                    {t("reviewFields", { fields: listing.reviewFields.map((f) => t(reviewFieldLabel[f])).join(", ") })}
                  </p>
                ) : null}
              </AlertDescription>
            </Alert>
          )}
          {listing?.status === "rejected" && listing.rejectionReason && (
            <Alert variant="destructive">
              <AlertTitle>{t("rejectedTitle")}</AlertTitle>
              <AlertDescription>
                <p>{listing.rejectionReason}</p>
              </AlertDescription>
            </Alert>
          )}
          {formError && (
            <Alert variant="destructive">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}

          {/* 1 · İlan türü */}
          <FormSection number={1} title={t("sectionType")} {...section("type")}>
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <RadioCards
                  name="type"
                  legend={<span className="sr-only">{t("sectionType")}</span>}
                  options={listingTypes.map((type) => ({
                    value: type,
                    // Masaüstünde tasarımdaki renkli tür rozeti, mobilde düz metin.
                    label: (
                      <>
                        <span className="lg:hidden">{tl(`type.${type}`)}</span>
                        <ListingTypeBadge type={type} className="max-lg:hidden" />
                      </>
                    ),
                    hint: tl(`typeHint.${type}`),
                  }))}
                  value={field.value}
                  onChange={field.onChange}
                  error={fieldError("type")}
                />
              )}
            />
          </FormSection>

          {/* 2 · Hayvan bilgileri */}
          <FormSection
            number={2}
            title={t("sectionAnimal")}
            subtitle={
              <span className="lg:hidden">
                {t.rich("selectedType", {
                  type: tl(`type.${values.type}`),
                  b: (c) => <strong className="text-heading">{c}</strong>,
                })}
              </span>
            }
            {...section("animal")}
          >
            <Field
              id="title"
              label={t("listingTitle")}
              required
              error={fieldError("title")}
              description={t("titleCounter", { min: TITLE_MIN, max: TITLE_MAX, count: values.title.length })}
            >
              {(c) => <Input {...c} maxLength={TITLE_MAX} {...register("title")} />}
            </Field>
            <div className="grid gap-5 sm:grid-cols-2 sm:gap-4">
              <Field id="speciesId" label={t("species")} required error={fieldError("speciesId")}>
                {(c) => (
                  <Select {...c} {...register("speciesId", { onChange: () => setValue("breedId", "") })}>
                    <option value="">{t("select")}</option>
                    {species.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field id="breedId" label={t("breed")} error={fieldError("breedId")}>
                {(c) => (
                  <Select {...c} disabled={!values.speciesId} {...register("breedId")}>
                    <option value="">{values.speciesId ? t("select") : t("breedPlaceholder")}</option>
                    {breeds.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field
                id="name"
                label={t("name")}
                error={fieldError("name")}
                description={values.type === "found" ? t("nameHintFound") : undefined}
              >
                {(c) => <Input {...c} maxLength={40} {...register("name")} />}
              </Field>
              <Field id="ageGroup" label={t("ageGroup")} required error={fieldError("ageGroup")}>
                {(c) => (
                  <Select {...c} {...register("ageGroup")}>
                    <option value="">{t("select")}</option>
                    {(["puppy", "young", "adult", "senior"] as const).map((a) => (
                      <option key={a} value={a}>
                        {tl(`ageGroup.${a}`)}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field id="gender" label={t("gender")} error={fieldError("gender")}>
                {(c) => (
                  <Select {...c} {...register("gender")}>
                    {(["unknown", "male", "female"] as const).map((g) => (
                      <option key={g} value={g}>
                        {tl(`gender.${g}`)}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field id="size" label={t("size")} required error={fieldError("size")}>
                {(c) => (
                  <Select {...c} {...register("size")}>
                    <option value="">{t("select")}</option>
                    {(["small", "medium", "large"] as const).map((s) => (
                      <option key={s} value={s}>
                        {tl(`size.${s}`)}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            </div>
          </FormSection>

          {/* 3 · Konum */}
          <FormSection number={3} title={t("sectionLocation")} {...section("location")}>
            <div className="grid gap-5 sm:grid-cols-2 sm:gap-4">
              <Field id="cityId" label={t("city")} required error={fieldError("cityId")}>
                {(c) => (
                  <Select {...c} {...register("cityId", { onChange: () => setValue("districtId", "") })}>
                    <option value="">{t("select")}</option>
                    {cities.map((city) => (
                      <option key={city.id} value={city.id}>
                        {city.name}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field id="districtId" label={t("district")} required error={fieldError("districtId")}>
                {(c) => (
                  <Select {...c} disabled={!values.cityId} {...register("districtId")}>
                    <option value="">{values.cityId ? t("select") : t("districtPlaceholder")}</option>
                    {districts.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            </div>
            {isLocationType && (
              <fieldset className="grid gap-3 rounded-2xl border border-border bg-canvas p-4">
                <legend className="px-1 font-extrabold text-heading">
                  {values.type === "lost" ? t("lastSeenTitleLost") : t("lastSeenTitleFound")}
                </legend>
                <Field id="lastSeenAddress" label={t("lastSeenAddress")} error={fieldError("lastSeenAddress")}>
                  {(c) => (
                    <Input
                      {...c}
                      maxLength={200}
                      placeholder={t("lastSeenPlaceholder")}
                      {...register("lastSeenAddress")}
                    />
                  )}
                </Field>
              </fieldset>
            )}
            <p className="text-[13px] text-body">{t("dateAutomatic")}</p>
          </FormSection>

          {/* 4 · Fotoğraflar */}
          <FormSection number={4} title={t("sectionPhotos")} {...section("photos")}>
            <ImageUploader
              initial={listing?.images}
              onChange={onImages}
              invalid={Boolean(formState.errors.images)}
              describedBy={formState.errors.images ? "images-error" : undefined}
            />
            {fieldError("images") && (
              <p id="images-error" className="text-sm font-bold text-destructive">
                {fieldError("images")}
              </p>
            )}
          </FormSection>

          {/* 5 · Açıklama */}
          <FormSection number={5} title={t("sectionDescription")} {...section("description")}>
            <Field
              id="description"
              label={t("description")}
              required
              error={fieldError("description")}
              description={t("descriptionHint", {
                min: DESCRIPTION_MIN,
                max: DESCRIPTION_MAX,
                count: values.description.length,
              })}
            >
              {(c) => <Textarea {...c} rows={6} maxLength={DESCRIPTION_MAX} {...register("description")} />}
            </Field>
          </FormSection>

          {/* 6 · Özellikler ve kaynak */}
          <FormSection number={6} title={t("sectionFeatures")} {...section("features")}>
            <ToggleChips
              legend={t("healthGroup")}
              options={listingFeatures.map((f) => ({ value: f, label: tl(`feature.${f}`) }))}
              value={featureSet}
              onToggle={(f) => setValue(f, !values[f], { shouldDirty: true })}
            />
            {values.microchipped && (
              <div className="border-l-4 border-primary pl-4">
                <Field
                  id="microchipNumber"
                  label={t("microchipNumber")}
                  description={t("microchipHint")}
                  error={fieldError("microchipNumber")}
                >
                  {(c) => (
                    <Input
                      {...c}
                      inputMode="numeric"
                      maxLength={15}
                      placeholder={t("microchipPlaceholder")}
                      className="max-w-xs"
                      {...register("microchipNumber")}
                    />
                  )}
                </Field>
              </div>
            )}
            <Controller
              control={control}
              name="source"
              render={({ field }) => (
                <RadioCards
                  name="source"
                  variant="chip"
                  legend={t("sourceGroup")}
                  options={listingSources.map((s) => ({ value: s, label: tl(`source.${s}`) }))}
                  value={field.value || null}
                  onChange={field.onChange}
                  error={fieldError("source")}
                />
              )}
            />
          </FormSection>

          {/* 7 · İletişim ve onay */}
          <FormSection number={7} title={t("sectionContact")} {...section("contact")}>
            <Controller
              control={control}
              name="showPhone"
              render={({ field }) => (
                <Switch
                  id="showPhone"
                  checked={field.value}
                  onChange={field.onChange}
                  disabled={!userHasPhone}
                  label={t("showPhone")}
                  description={userHasPhone ? t("showPhoneHint") : t("showPhoneNoPhone")}
                />
              )}
            />
            {fieldError("showPhone") && <p className="text-sm font-bold text-destructive">{fieldError("showPhone")}</p>}
            <div className="border-t border-border pt-2">
              <Checkbox
                id="confirmNoFee"
                label={t("confirmNoFee")}
                error={fieldError("confirmNoFee")}
                {...register("confirmNoFee")}
              />
              <Checkbox
                id="acceptTerms"
                error={fieldError("acceptTerms")}
                label={t.rich("acceptTerms", {
                  kvkk: (c) => (
                    <Link
                      href={{ pathname: "/legal/[slug]", params: { slug: "kvkk" } }}
                      target="_blank"
                      className="text-primary underline"
                    >
                      {c}
                    </Link>
                  ),
                  terms: (c) => (
                    <Link
                      href={{ pathname: "/legal/[slug]", params: { slug: "kullanim-sartlari" } }}
                      target="_blank"
                      className="text-primary underline"
                    >
                      {c}
                    </Link>
                  ),
                })}
                {...register("acceptTerms")}
              />
            </div>
          </FormSection>

          {notice && (
            <p role="status" className="font-bold text-success-text">
              {notice}
            </p>
          )}

          {/* Masaüstü eylemleri */}
          <div className="hidden justify-end gap-3 lg:flex">
            {(!listing || listing.status === "draft") && (
              <Button type="button" variant="outline-primary" size="lg" disabled={busy} onClick={() => save(false)}>
                {saving === "draft" ? t("saving") : t("saveDraft")}
              </Button>
            )}
            <Button type="button" size="lg" disabled={busy} onClick={() => save(true)}>
              {saving === "submit" ? t("saving") : t("submit")}
            </Button>
          </div>
        </form>

        <ListingFormSidebar
          completed={completed}
          preview={{
            type: values.type,
            title: values.title,
            coverUrl: upload.coverUrl,
            place: [cityName, districtName].filter(Boolean).join(", ") || null,
          }}
        />
      </div>

      {/* Mobil eylem çubuğu */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background p-4 pb-[max(1rem,env(safe-area-inset-bottom))] lg:hidden">
        {isLast ? (
          <div className="grid gap-2.5">
            <Button type="button" size="lg" disabled={busy} onClick={() => save(true)}>
              {saving === "submit" ? t("saving") : t("submit")}
            </Button>
            <div className="grid grid-cols-2 gap-2.5">
              <Button type="button" variant="outline-primary" size="lg" onClick={() => setStep((s) => s - 1)}>
                {t("back")}
              </Button>
              {(!listing || listing.status === "draft") && (
                <Button type="button" variant="outline" size="lg" disabled={busy} onClick={() => save(false)}>
                  {saving === "draft" ? t("saving") : t("saveDraft")}
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className={cn("grid gap-2.5", step > 0 && "grid-cols-[1fr_2fr]")}>
            {step > 0 && (
              <Button type="button" variant="outline-primary" size="lg" onClick={() => setStep((s) => s - 1)}>
                {t("back")}
              </Button>
            )}
            <Button type="button" size="lg" onClick={next}>
              {t("next")}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Numaralı form bölümü (masaüstünde kart). Mobilde yalnızca bulunulan adımın bölümleri görünür
 * (`hidden` → yalnız lg altında gizlenir; masaüstünde hepsi görünür).
 */
function FormSection({
  id,
  number,
  title,
  subtitle,
  hidden,
  children,
}: {
  id: string
  number: number
  title: string
  subtitle?: React.ReactNode
  hidden: boolean
  children: React.ReactNode
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={cn(
        "scroll-mt-24 lg:rounded-card lg:border lg:border-border lg:bg-background lg:p-6",
        hidden && "max-lg:hidden"
      )}
    >
      <div className="mb-5 flex items-start gap-3">
        <span
          aria-hidden="true"
          className="hidden size-8 shrink-0 items-center justify-center rounded-full bg-smoke text-sm font-extrabold text-primary lg:flex"
        >
          {number}
        </span>
        <div>
          <h2 id={`${id}-title`} className="text-h2 text-heading lg:text-h4">
            {title}
          </h2>
          {subtitle && <p className="mt-1 text-body">{subtitle}</p>}
        </div>
      </div>
      <div className="grid gap-5">{children}</div>
    </section>
  )
}
