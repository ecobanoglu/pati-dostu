"use client"

import { organizationApplicationSchema, organizationServices, type OrganizationType } from "@pati-dostu/validators"
import { useTranslations } from "next-intl"
import { type FormEvent, type ReactNode, useState } from "react"

import { Checkbox } from "@/components/form/checkbox"
import { RadioCards, ToggleChips } from "@/components/form/choices"
import { Field } from "@/components/form/field"
import { Input, Select } from "@/components/form/input"
import { Button } from "@/components/ui/button"
import { Link, useRouter } from "@/i18n/navigation"
import { apiFetch } from "@/lib/api-browser"
import type { City, District } from "@/lib/dictionary"
import { useErrorMessage } from "@/lib/errors"
import { useDictionary } from "@/lib/use-dictionary"

import { HoursEditor } from "./hours-editor"
import { type DayHours, defaultWeek, hoursFromWeek, type OrgApplication, weekFromHours } from "./types"

type FieldName =
  | "type"
  | "name"
  | "registryNo"
  | "contactName"
  | "phone"
  | "email"
  | "cityId"
  | "districtId"
  | "address"
  | "services"
  | "hours"
  | "declaration"
  | "acceptTerms"

/** Numaralı form bölümü (tasarım: beyaz kart, mor daire içinde sıra, başlık). */
function Section({ n, id, title, children }: { n: number; id: string; title: string; children: ReactNode }) {
  return (
    <section
      aria-labelledby={id}
      className="grid gap-4 rounded-card border border-border bg-background p-4 lg:gap-5 lg:p-6"
    >
      <h2 id={id} className="flex items-center gap-3 text-h3 font-extrabold text-heading">
        <span
          aria-hidden="true"
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-smoke text-sm font-extrabold text-primary"
        >
          {n}
        </span>
        {title}
      </h2>
      {children}
    </section>
  )
}

/**
 * Kurumsal başvuru formu (tasarım 09 / 18): 1 Kurum türü, 2 Kurum bilgileri, 3 Adres (harita v1.1 — karar),
 * 4 Hizmetler ve çalışma saatleri, 5 Onay. Reddedilen başvuruda önceki bilgilerle dolu gelir. Doğrulama API ile aynı
 * şemayla (`organizationApplicationSchema`); hata alanın altında, ilk hatalı alana odaklanılır. Gönderilince sayfa
 * yenilenir ve "inceleniyor" kartı görünür.
 */
export function ApplicationForm({
  cities,
  initial,
  initialType,
  contactName,
  emailVerified,
}: {
  cities: City[]
  initial: OrgApplication | null
  initialType: OrganizationType | null
  contactName: string
  emailVerified: boolean
}) {
  const t = useTranslations("OrgApplication")
  const errorMessage = useErrorMessage()
  const router = useRouter()

  const [type, setType] = useState<OrganizationType | null>(initial?.type ?? initialType)
  const [values, setValues] = useState({
    name: initial?.name ?? "",
    registryNo: initial?.registryNo ?? "",
    contactName: initial?.contactName ?? contactName,
    phone: initial?.phone ?? "",
    email: initial?.email ?? "",
    cityId: initial?.cityId ?? "",
    districtId: initial?.districtId ?? "",
    address: initial?.address ?? "",
  })
  const [services, setServices] = useState<Set<string>>(new Set(initial?.services ?? []))
  const [is24h, setIs24h] = useState(initial?.is24h ?? false)
  const [week, setWeek] = useState<DayHours[]>(initial ? weekFromHours(initial.hours) : defaultWeek())
  const [declaration, setDeclaration] = useState(false)
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  const { items: districts } = useDictionary<District>(values.cityId ? `/cities/${values.cityId}/districts` : null)

  /** Metin alanını günceller ve o alanın hatasını temizler. */
  const set = (field: keyof typeof values, value: string) => {
    setValues((v) => ({ ...v, [field]: value, ...(field === "cityId" ? { districtId: "" } : {}) }))
    setErrors((e) => ({ ...e, [field]: undefined }))
  }

  /** Hataları gösterir ve ilk hatalı alana odaklanır. */
  const showErrors = (next: Partial<Record<FieldName, string>>) => {
    setErrors(next)
    const first = Object.keys(next)[0]
    if (first) document.getElementById(`org-${first}`)?.focus()
  }

  /** Doğrular ve başvuruyu gönderir. */
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (sending) return
    setFormError(null)
    const payload = {
      type: type ?? undefined,
      ...values,
      services: [...services],
      is24h,
      hours: is24h ? [] : hoursFromWeek(week),
      declaration,
      acceptTerms,
    }
    const parsed = organizationApplicationSchema.safeParse(payload)
    if (!parsed.success) {
      const next: Partial<Record<FieldName, string>> = {}
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as FieldName
        if (!next[field]) next[field] = errorMessage(field === "type" ? "ORG_TYPE_REQUIRED" : issue.message)
      }
      // Sıra formdaki sıra olsun (odak ilk hatalı alana).
      const order: FieldName[] = [
        "type",
        "name",
        "registryNo",
        "contactName",
        "phone",
        "email",
        "cityId",
        "districtId",
        "address",
        "services",
        "hours",
        "declaration",
        "acceptTerms",
      ]
      showErrors(Object.fromEntries(order.filter((f) => next[f]).map((f) => [f, next[f]])))
      return
    }
    setErrors({})
    setSending(true)
    const { data, error } = await apiFetch<{ application: OrgApplication }>("/organizations/applications", {
      method: "POST",
      body: JSON.stringify(parsed.data),
    })
    if (!data) {
      setSending(false)
      if (error?.code === "DISTRICT_MISMATCH") showErrors({ districtId: errorMessage(error.code) })
      else setFormError(errorMessage(error?.code, error?.details))
      return
    }
    window.scrollTo({ top: 0 })
    router.refresh()
  }

  const typeOptions = (["clinic", "shelter"] as const).map((value) => ({
    value,
    label: t(`types.${value}`),
    hint: t(`types.${value}Hint`),
  }))
  const serviceOptions = type ? organizationServices[type] : []

  return (
    <form onSubmit={submit} noValidate className="grid content-start gap-5">
      {!emailVerified && (
        <p role="status" className="rounded-xl bg-warning-soft px-4 py-3 text-sm font-bold text-warning-text">
          {t("verifyFirst")}{" "}
          <Link href="/verify-email" className="font-extrabold underline underline-offset-4">
            {t("verifyLink")}
          </Link>
        </p>
      )}

      <Section n={1} id="org-s1" title={t("sectionType")}>
        <div id="org-type" tabIndex={-1} className="focus:outline-none">
          <RadioCards
            name="orgType"
            legend={<span className="sr-only">{t("sectionType")}</span>}
            options={typeOptions}
            value={type}
            onChange={(v) => {
              setType(v)
              // Türe ait olmayan hizmetler düşer.
              setServices(
                (s) => new Set([...s].filter((x) => (organizationServices[v] as readonly string[]).includes(x)))
              )
              setErrors((e) => ({ ...e, type: undefined, services: undefined }))
            }}
            error={errors.type}
            className="[&>div]:grid [&>div]:grid-cols-1 sm:[&>div]:grid-cols-2"
          />
        </div>
      </Section>

      <Section n={2} id="org-s2" title={t("sectionInfo")}>
        <Field id="org-name" label={t("name")} required error={errors.name}>
          {(p) => <Input {...p} value={values.name} onChange={(e) => set("name", e.target.value)} maxLength={120} />}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="org-registryNo"
            label={t("registryNo")}
            required
            description={t("registryNoHint")}
            error={errors.registryNo}
          >
            {(p) => (
              <Input
                {...p}
                value={values.registryNo}
                onChange={(e) => set("registryNo", e.target.value)}
                maxLength={30}
                autoComplete="off"
              />
            )}
          </Field>
          <Field id="org-contactName" label={t("contactName")} required error={errors.contactName}>
            {(p) => (
              <Input
                {...p}
                value={values.contactName}
                onChange={(e) => set("contactName", e.target.value)}
                maxLength={80}
                autoComplete="name"
              />
            )}
          </Field>
          <Field id="org-phone" label={t("phone")} required description={t("phoneHint")} error={errors.phone}>
            {(p) => (
              <Input
                {...p}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="0 (232) 555 12 34"
                value={values.phone}
                onChange={(e) => set("phone", e.target.value)}
              />
            )}
          </Field>
          <Field id="org-email" label={t("email")} required error={errors.email}>
            {(p) => (
              <Input
                {...p}
                type="email"
                autoComplete="email"
                value={values.email}
                onChange={(e) => set("email", e.target.value)}
              />
            )}
          </Field>
        </div>
      </Section>

      <Section n={3} id="org-s3" title={t("sectionAddress")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="org-cityId" label={t("city")} required error={errors.cityId}>
            {(p) => (
              <Select {...p} value={values.cityId} onChange={(e) => set("cityId", e.target.value)}>
                <option value="">{t("choose")}</option>
                {cities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field id="org-districtId" label={t("district")} required error={errors.districtId}>
            {(p) => (
              <Select
                {...p}
                value={values.districtId}
                onChange={(e) => set("districtId", e.target.value)}
                disabled={!values.cityId}
              >
                <option value="">{values.cityId ? t("choose") : t("chooseCityFirst")}</option>
                {districts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
        <Field id="org-address" label={t("address")} required error={errors.address}>
          {(p) => (
            <Input
              {...p}
              value={values.address}
              onChange={(e) => set("address", e.target.value)}
              maxLength={200}
              autoComplete="street-address"
            />
          )}
        </Field>
      </Section>

      <Section n={4} id="org-s4" title={t("sectionServices")}>
        <div id="org-services" tabIndex={-1} className="focus:outline-none">
          {type ? (
            <ToggleChips
              legend={t("servicesLabel")}
              options={serviceOptions.map((s) => ({ value: s, label: t(`services.${s}` as never) }))}
              value={services}
              onToggle={(s) => {
                setServices((prev) => {
                  const next = new Set(prev)
                  if (next.has(s)) next.delete(s)
                  else next.add(s)
                  return next
                })
                setErrors((e) => ({ ...e, services: undefined }))
              }}
            />
          ) : (
            <>
              <p className="text-[15px] font-extrabold text-heading">{t("servicesLabel")}</p>
              <p className="text-sm text-body">{t("chooseTypeFirst")}</p>
            </>
          )}
          {errors.services && <p className="mt-2 text-sm font-bold text-destructive">{errors.services}</p>}
        </div>

        <fieldset id="org-hours" tabIndex={-1} className="grid gap-3 focus:outline-none">
          <legend className="mb-2 text-[15px] font-extrabold text-heading">{t("hours")}</legend>
          <Checkbox
            id="org-is24h"
            checked={is24h}
            onChange={(e) => {
              setIs24h(e.target.checked)
              setErrors((x) => ({ ...x, hours: undefined }))
            }}
            label={
              <>
                {t("is24h")} <span className="text-sm text-body">{t("is24hHint")}</span>
              </>
            }
          />
          {!is24h && (
            <HoursEditor
              value={week}
              onChange={(w) => {
                setWeek(w)
                setErrors((x) => ({ ...x, hours: undefined }))
              }}
              errorId={errors.hours ? "org-hours-error" : undefined}
            />
          )}
          {errors.hours && (
            <p id="org-hours-error" className="text-sm font-bold text-destructive">
              {errors.hours}
            </p>
          )}
          <p className="text-sm text-body">{t("hoursNote")}</p>
        </fieldset>
      </Section>

      <Section n={5} id="org-s5" title={t("sectionConsent")}>
        <div className="grid gap-1">
          <Checkbox
            id="org-declaration"
            checked={declaration}
            onChange={(e) => {
              setDeclaration(e.target.checked)
              setErrors((x) => ({ ...x, declaration: undefined }))
            }}
            label={t("declaration")}
            error={errors.declaration}
          />
          <Checkbox
            id="org-acceptTerms"
            checked={acceptTerms}
            onChange={(e) => {
              setAcceptTerms(e.target.checked)
              setErrors((x) => ({ ...x, acceptTerms: undefined }))
            }}
            error={errors.acceptTerms}
            label={t.rich("acceptTerms", {
              kvkk: (chunks) => (
                <Link
                  href={{ pathname: "/legal/[slug]", params: { slug: "kvkk" } }}
                  target="_blank"
                  className="text-primary underline"
                >
                  {chunks}
                </Link>
              ),
              terms: (chunks) => (
                <Link
                  href={{ pathname: "/legal/[slug]", params: { slug: "kurumsal-uyelik-sartlari" } }}
                  target="_blank"
                  className="text-primary underline"
                >
                  {chunks}
                </Link>
              ),
            })}
          />
        </div>
      </Section>

      {formError && (
        <p role="alert" className="rounded-xl bg-danger-soft px-4 py-3 text-sm font-bold text-destructive">
          {formError}
        </p>
      )}
      <div className="flex justify-end">
        <Button type="submit" size="lg" disabled={sending || !emailVerified} className="max-sm:w-full">
          {sending ? t("sending") : initial ? t("resubmit") : t("submit")}
        </Button>
      </div>
    </form>
  )
}
