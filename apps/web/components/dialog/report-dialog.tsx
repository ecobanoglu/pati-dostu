"use client"

import { REPORT_DETAILS_MAX, REPORT_DETAILS_MIN, reportReasons, type ReportTarget } from "@pati-dostu/validators"
import { CircleCheck, Flag, X } from "lucide-react"
import { useTranslations } from "next-intl"
import { type FormEvent, type ReactNode, useId, useRef, useState } from "react"

import { Textarea } from "@/components/form/input"
import { Button } from "@/components/ui/button"
import { Link } from "@/i18n/navigation"
import { apiFetch } from "@/lib/api-browser"
import { useErrorMessage } from "@/lib/errors"
import { cn } from "@/lib/utils"

type Trigger = "card" | "link" | "icon" | "header"

/** Şikâyet ucunun yolu: ilan numara ile, yorum ve kullanıcı id ile. */
const endpoint: Record<ReportTarget, (id: string) => string> = {
  listing: (id) => `/listings/${id}/report`,
  comment: (id) => `/comments/${id}/report`,
  user: (id) => `/users/${id}/report`,
}

/**
 * Şikâyet butonu + penceresi (ilan, yorum, kullanıcı). Kararlar: hazır nedenler (hedefe göre) + açıklama ("Diğer"de
 * zorunlu); şikâyet admin'e iletilir, içerik admin karar verene kadar yayında kalır; şikâyet edilen kişiye kim olduğunuz
 * söylenmez. Misafire pencere yerine giriş bağlantısı gösterilir (`next` ile geri döner). Pencere yerel <dialog>
 * (odak hapsi, Esc): masaüstünde ortada, mobilde alttan. Aynı hedefi daha önce şikâyet ettiyseniz bunu söyler.
 * Tasarımda ayrı ekranı yok; "Yorum yaz" penceresinin (04-pencereler/03) düzeni izlendi.
 */
export function ReportButton({
  target,
  id,
  subject,
  trigger,
  signedIn,
  next,
  className,
}: {
  target: ReportTarget
  /** İlan için ilan numarası, yorum ve kullanıcı için id. */
  id: string
  /** Pencerede başlığın altında gösterilen ad (ilan başlığı, kişi adı…). */
  subject: string
  trigger: Trigger
  signedIn: boolean
  /** Misafir girişten sonra dönülecek adres. */
  next?: string
  className?: string
}) {
  const t = useTranslations("Reports")
  const errorMessage = useErrorMessage()
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const detailsId = useId()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<string | null>(null)
  const [details, setDetails] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<{ field: "reason" | "details" | "form"; text: string } | null>(null)
  const [done, setDone] = useState<"sent" | "already" | null>(null)

  const label = t(`open.${target}`)
  const triggerClass = {
    card: "inline-flex min-h-tap items-center justify-center gap-1.5 rounded-xl border border-border bg-background px-3 text-sm font-extrabold text-destructive hover:bg-danger-soft",
    link: "inline-flex min-h-tap items-center gap-1.5 text-sm font-extrabold text-destructive",
    icon: "flex size-tap shrink-0 items-center justify-center rounded-full text-body hover:bg-danger-soft hover:text-danger",
    header:
      "inline-flex min-h-tap items-center gap-1.5 rounded-xl border border-border bg-background px-3 text-sm font-extrabold text-destructive hover:bg-danger-soft",
  }[trigger]
  const content =
    trigger === "icon" ? (
      <Flag aria-hidden="true" className="size-4" />
    ) : (
      <>
        <Flag aria-hidden="true" className="size-4" />
        {trigger === "card" ? t("short") : label}
      </>
    )
  const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"

  if (!signedIn) {
    return (
      <Link
        href={{ pathname: "/sign-in", query: next ? { next } : {} }}
        aria-label={trigger === "icon" || trigger === "card" ? label : undefined}
        className={cn(triggerClass, focus, className)}
      >
        {content}
      </Link>
    )
  }

  /** Pencereyi temiz bir formla açar. */
  function show() {
    setReason(null)
    setDetails("")
    setError(null)
    setDone(null)
    setOpen(true)
    ref.current?.showModal()
  }

  /** Neden ve açıklamayı denetleyip gönderir; sonuç pencerede teşekkür olarak görünür. */
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!reason) return setError({ field: "reason", text: t("reasonRequired") })
    if (reason === "other" && details.trim().length < REPORT_DETAILS_MIN) {
      return setError({ field: "details", text: t("detailsRequired") })
    }
    setSending(true)
    setError(null)
    const { data, error: err } = await apiFetch<{ alreadyReported: boolean }>(endpoint[target](id), {
      method: "POST",
      body: JSON.stringify({ reason, details: details.trim() || undefined }),
    })
    setSending(false)
    if (!data) return setError({ field: "form", text: errorMessage(err?.code, err?.details) })
    setDone(data.alreadyReported ? "already" : "sent")
  }

  const close = () => ref.current?.close()
  let body: ReactNode
  if (done) {
    body = (
      <div className="grid justify-items-center gap-3 py-6 text-center" role="status">
        <CircleCheck aria-hidden="true" className="size-12 text-success-text" />
        <p className="text-lg font-extrabold text-heading">{done === "sent" ? t("sentTitle") : t("alreadyTitle")}</p>
        <p className="max-w-sm text-body">{done === "sent" ? t("sentText") : t("alreadyText")}</p>
        <Button className="mt-2" onClick={close}>
          {t("close")}
        </Button>
      </div>
    )
  } else {
    body = (
      <form onSubmit={submit} noValidate>
        <fieldset aria-describedby={error?.field === "reason" ? `${titleId}-reason-error` : undefined}>
          <legend className="mb-2 text-[15px] font-extrabold text-heading">{t("reasonLabel")}</legend>
          <div className="grid gap-2">
            {reportReasons[target].map((value) => (
              <label
                key={value}
                className={cn(
                  "flex min-h-tap cursor-pointer items-center gap-3 rounded-xl border-2 px-4 py-2.5 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring",
                  reason === value ? "border-primary bg-smoke" : "border-border hover:border-primary/60"
                )}
              >
                <input
                  type="radio"
                  name={`${titleId}-reason`}
                  value={value}
                  checked={reason === value}
                  onChange={() => {
                    setReason(value)
                    setError(null)
                  }}
                  className="size-5 shrink-0 accent-primary"
                />
                <span className="font-bold text-heading">{t(`reasons.${value}`)}</span>
              </label>
            ))}
          </div>
          {error?.field === "reason" && (
            <p id={`${titleId}-reason-error`} role="alert" className="mt-2 text-sm font-bold text-destructive">
              {error.text}
            </p>
          )}
        </fieldset>

        <div className="mt-5 grid gap-1.5">
          <label htmlFor={detailsId} className="text-[15px] font-extrabold text-heading">
            {reason === "other" ? t("detailsLabelRequired") : t("detailsLabel")}
          </label>
          <Textarea
            id={detailsId}
            value={details}
            maxLength={REPORT_DETAILS_MAX}
            onChange={(e) => setDetails(e.target.value)}
            placeholder={t("detailsPlaceholder")}
            aria-invalid={error?.field === "details" ? true : undefined}
            aria-describedby={`${detailsId}-hint${error?.field === "details" ? ` ${detailsId}-error` : ""}`}
            className="min-h-24"
          />
          <p id={`${detailsId}-hint`} className="text-xs text-body">
            {t("detailsHint", { count: details.length, max: REPORT_DETAILS_MAX })}
          </p>
          {error?.field === "details" && (
            <p id={`${detailsId}-error`} role="alert" className="text-sm font-bold text-destructive">
              {error.text}
            </p>
          )}
        </div>

        <p className="mt-5 rounded-xl bg-smoke px-4 py-3 text-sm text-heading">{t("note")}</p>
        {error?.field === "form" && (
          <p role="alert" className="mt-3 text-sm font-bold text-destructive">
            {error.text}
          </p>
        )}

        <div className="mt-5 flex justify-end gap-3 border-t border-border pt-4">
          <Button type="button" variant="outline" onClick={close}>
            {t("cancel")}
          </Button>
          <Button type="submit" variant="destructive" disabled={sending} aria-busy={sending}>
            {sending ? t("sending") : t("submit")}
          </Button>
        </div>
      </form>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={show}
        aria-label={trigger === "icon" || trigger === "card" ? label : undefined}
        aria-haspopup="dialog"
        className={cn(triggerClass, focus, className)}
      >
        {content}
      </button>
      <dialog
        ref={ref}
        aria-labelledby={titleId}
        onClose={() => setOpen(false)}
        onClick={(e) => e.target === e.currentTarget && close()}
        className={cn(
          "m-0 w-full max-w-none overflow-y-auto bg-background p-0 text-heading backdrop:bg-heading/60",
          "max-lg:top-auto max-lg:bottom-0 max-lg:max-h-[92dvh] max-lg:rounded-t-dialog",
          "lg:m-auto lg:max-h-[90dvh] lg:max-w-[600px] lg:rounded-dialog"
        )}
      >
        {open && (
          <div className="p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] lg:p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 id={titleId} className="text-xl font-extrabold text-heading lg:text-h3">
                  {label}
                </h2>
                <p className="truncate text-sm text-body">{subject}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={close} aria-label={t("close")} className="bg-smoke-2">
                <X aria-hidden="true" />
              </Button>
            </div>
            {body}
          </div>
        )}
      </dialog>
    </>
  )
}
