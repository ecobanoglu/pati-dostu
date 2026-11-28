"use client"

import { type ReviewableField, reviewableFields } from "@pati-dostu/validators"
import { Check, LoaderCircle } from "lucide-react"
import { useTranslations } from "next-intl"
import { type ReactNode, useCallback, useEffect, useId, useRef, useState } from "react"

import { ToggleChips } from "@/components/form/choices"
import { Field } from "@/components/form/field"
import { Select, Textarea } from "@/components/form/input"
import { Button } from "@/components/ui/button"
import { useRouter } from "@/i18n/navigation"
import { apiFetch } from "@/lib/api-browser"
import { useErrorMessage } from "@/lib/errors"
import { reviewFieldLabel } from "@/lib/review-fields"
import { refreshAdminCounts } from "@/lib/use-admin-counts"
import { cn } from "@/lib/utils"

import { refreshListingCaches } from "@/lib/admin-actions"
import { type ReviewState, reviewHref } from "./query"
import type { RejectionReasonOption } from "./types"

type Decision = "approve" | "reject" | "changes"

const greenButton = "bg-success text-white hover:bg-success-text"

/** Kısayolların yazı alanlarında çalışmaması için: odak bir form alanında mı. */
function typing(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  return Boolean(el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)))
}

/**
 * İlan kararı (tasarım 07-admin/02 "Karar", 04 mobil alt çubuk). Red gerekçesi (hazır liste), kullanıcıya not ve
 * isteğe bağlı düzeltilecek bölümler; Onayla ve yayınla / Düzeltme iste / Reddet. Red için gerekçe ya da en az 10
 * karakter not, düzeltme için not gerekir. Karardan sonra rozet sayıları ve herkese açık ilan önbelleği yenilenir,
 * kuyruktaki sonraki ilana geçilir. Kısayollar (masaüstü, yazı alanı dışındayken): A onayla, R reddet, J / K
 * sonraki / önceki. Mobilde kararlar alttaki sabit çubukta; red ve düzeltme bir pencerede açılır.
 */
export function DecisionPanel({
  listingId,
  pending,
  reasons,
  state,
  nextNo,
  prevNo,
}: {
  listingId: string
  /** İlan onay bekliyor mu (değilse karar verilemez). */
  pending: boolean
  reasons: RejectionReasonOption[]
  state: ReviewState
  /** Karardan sonra açılacak ilan (kuyrukta bir sonraki; yoksa önceki). */
  nextNo: number | null
  prevNo: number | null
}) {
  const t = useTranslations("AdminReview")
  const tf = useTranslations("ListingForm")
  const errorMessage = useErrorMessage()
  const router = useRouter()
  const [reasonId, setReasonId] = useState("")
  const [note, setNote] = useState("")
  const [fields, setFields] = useState<Set<ReviewableField>>(new Set())
  const [busy, setBusy] = useState<Decision | null>(null)
  const [errors, setErrors] = useState<{ reason?: string; note?: string; general?: string }>({})
  const [dialog, setDialog] = useState<"reject" | "changes" | null>(null)
  const reasonRef = useRef<HTMLSelectElement>(null)
  // Verilen son karar (sonraki ilana geçince kısa bir bildirim olarak gösterilir).
  const [done, setDone] = useState<Decision | null>(null)
  // İlan değişince formu sıfırla (bileşen kuyrukta gezinirken yerinde kalır; bildirim korunur).
  const [forId, setForId] = useState(listingId)
  if (forId !== listingId) {
    setForId(listingId)
    setReasonId("")
    setNote("")
    setFields(new Set())
    setBusy(null)
    setErrors({})
    setDialog(null)
  }

  // Bildirim 5 sn sonra kaybolur.
  useEffect(() => {
    if (!done) return
    const timer = setTimeout(() => setDone(null), 5000)
    return () => clearTimeout(timer)
  }, [done])

  /** Kuyrukta başka bir ilana geçer (adres değişir, sayfa sunucuda yenilenir). */
  const go = useCallback(
    (no: number | null) => router.replace(reviewHref({ ...state, listingNo: no }), { scroll: false }),
    [router, state]
  )

  /** Kararı doğrular ve gönderir; başarıda sonraki ilana geçer. */
  const decide = useCallback(
    async (kind: Decision) => {
      if (!pending || busy) return
      const trimmed = note.trim()
      if (kind === "reject" && !reasonId && trimmed.length < 10) {
        setErrors({ reason: t("reasonRequired") })
        if (dialog !== "reject") reasonRef.current?.focus()
        return
      }
      if (kind === "changes" && trimmed.length < 10) {
        setErrors({ note: t("noteRequired") })
        return
      }
      setErrors({})
      setBusy(kind)
      const path = kind === "approve" ? "approve" : kind === "reject" ? "reject" : "request-changes"
      const body =
        kind === "reject"
          ? { ...(reasonId ? { reasonId } : {}), note: trimmed }
          : kind === "changes"
            ? { note: trimmed, fields: [...fields] }
            : undefined
      const { error } = await apiFetch(`/admin/listings/${listingId}/${path}`, {
        method: "POST",
        ...(body ? { body: JSON.stringify(body) } : {}),
      })
      if (error) {
        setBusy(null)
        setErrors({ general: errorMessage(error.code, error.details) })
        return
      }
      await Promise.all([refreshListingCaches(), refreshAdminCounts()])
      setDone(kind)
      go(nextNo ?? prevNo)
      router.refresh()
    },
    [pending, busy, note, reasonId, fields, listingId, errorMessage, go, nextNo, prevNo, router, dialog, t]
  )

  // Klavye kısayolları (masaüstü): A onayla, R reddet, J sonraki, K önceki.
  useEffect(() => {
    /** Tuşa göre işlem. */
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || typing(e.target) || dialog) return
      const key = e.key.toLowerCase()
      if (key === "a") void decide("approve")
      else if (key === "r") void decide("reject")
      else if (key === "j" && nextNo) go(nextNo)
      else if (key === "k" && prevNo) go(prevNo)
      else return
      e.preventDefault()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [decide, go, nextNo, prevNo, dialog])

  const reasonField = (
    <Field id="review-reason" label={t("reasonLabel")} error={errors.reason}>
      {(control) => (
        <Select
          {...control}
          ref={reasonRef}
          value={reasonId}
          onChange={(e) => {
            setReasonId(e.target.value)
            setErrors((x) => ({ ...x, reason: undefined }))
          }}
        >
          <option value="">{t("reasonPlaceholder")}</option>
          {reasons.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </Select>
      )}
    </Field>
  )
  const noteField = (
    <Field id="review-note" label={t("noteLabel")} description={t("noteHint")} error={errors.note}>
      {(control) => (
        <Textarea
          {...control}
          value={note}
          maxLength={1000}
          placeholder={t("notePlaceholder")}
          className="min-h-24"
          onChange={(e) => {
            setNote(e.target.value)
            setErrors((x) => ({ ...x, note: undefined, reason: undefined }))
          }}
        />
      )}
    </Field>
  )
  const fieldsPicker = (
    <ToggleChips
      legend={t("fieldsLabel")}
      options={reviewableFields.map((f) => ({ value: f, label: tf(reviewFieldLabel[f]) }))}
      value={fields}
      onToggle={(f) =>
        setFields((prev) => {
          const next = new Set(prev)
          if (next.has(f)) next.delete(f)
          else next.add(f)
          return next
        })
      }
    />
  )
  const spinner = (kind: Decision) =>
    busy === kind ? <LoaderCircle aria-hidden="true" className="animate-spin motion-reduce:animate-none" /> : null

  return (
    <>
      <p
        role="status"
        className={cn(
          done
            ? "fixed bottom-24 left-1/2 z-40 -translate-x-1/2 rounded-full bg-heading px-5 py-3 font-bold text-white shadow-pop lg:bottom-6"
            : "sr-only"
        )}
      >
        {done && t(`done.${done}`)}
      </p>
      {/* Masaüstü: karar kartı */}
      <section
        aria-labelledby="decision-title"
        className="grid gap-4 rounded-card border-2 border-heading bg-background p-6 max-lg:hidden"
      >
        <h2 id="decision-title" className="text-xl font-extrabold text-heading">
          {t("decisionTitle")}
        </h2>
        {!pending ? (
          <p className="text-body">{t("notPending")}</p>
        ) : (
          <>
            <div className="grid gap-4 xl:grid-cols-2">
              {reasonField}
              {noteField}
            </div>
            <details className="group">
              <summary className="inline-flex min-h-tap cursor-pointer items-center font-bold text-primary underline underline-offset-4">
                {t("fieldsToggle")}
                {fields.size > 0 && ` (${fields.size})`}
              </summary>
              <div className="pt-3">{fieldsPicker}</div>
            </details>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="lg" className={greenButton} disabled={Boolean(busy)} onClick={() => void decide("approve")}>
                {spinner("approve") ?? <Check aria-hidden="true" />}
                {t("approve")}
              </Button>
              <Button
                size="lg"
                variant="outline-primary"
                disabled={Boolean(busy)}
                onClick={() => void decide("changes")}
              >
                {spinner("changes")}
                {t("requestChanges")}
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-2 border-destructive text-destructive hover:bg-danger-soft"
                disabled={Boolean(busy)}
                onClick={() => void decide("reject")}
              >
                {spinner("reject")}
                {t("reject")}
              </Button>
            </div>
            {errors.general && (
              <p role="alert" className="text-sm font-bold text-destructive">
                {errors.general}
              </p>
            )}
            <p className="text-right text-[13px] text-body">
              {t.rich("shortcuts", {
                kbd: (c) => <kbd className="rounded border border-border px-1.5 py-0.5 font-sans font-bold">{c}</kbd>,
              })}
            </p>
            <p className="text-[13px] text-body">{t("auditNote")}</p>
          </>
        )}
      </section>

      {/* Mobil: alta sabit karar çubuğu */}
      {pending && (
        <div className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 gap-2 border-t border-border bg-background p-3 lg:hidden">
          <Button
            variant="outline"
            className="h-13 border-2 border-destructive text-destructive"
            disabled={Boolean(busy)}
            onClick={() => setDialog("reject")}
          >
            {t("reject")}
          </Button>
          <Button
            variant="outline-primary"
            className="h-13"
            disabled={Boolean(busy)}
            onClick={() => setDialog("changes")}
          >
            {t("changesShort")}
          </Button>
          <Button className={cn("h-13", greenButton)} disabled={Boolean(busy)} onClick={() => void decide("approve")}>
            {spinner("approve")}
            {t("approveShort")}
          </Button>
        </div>
      )}
      {dialog && (
        <DecisionDialog
          title={dialog === "reject" ? t("rejectTitle") : t("changesTitle")}
          onClose={() => !busy && setDialog(null)}
          footer={
            <>
              {errors.general && (
                <p role="alert" className="text-sm font-bold text-destructive">
                  {errors.general}
                </p>
              )}
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => setDialog(null)} disabled={Boolean(busy)}>
                  {t("cancel")}
                </Button>
                <Button
                  className={dialog === "reject" ? "bg-destructive text-destructive-foreground" : undefined}
                  disabled={Boolean(busy)}
                  onClick={() => void decide(dialog)}
                >
                  {spinner(dialog)}
                  {dialog === "reject" ? t("reject") : t("requestChanges")}
                </Button>
              </div>
            </>
          }
        >
          {dialog === "reject" && reasonField}
          {noteField}
          {dialog === "changes" && fieldsPicker}
        </DecisionDialog>
      )}
    </>
  )
}

/** Mobil karar penceresi (yerel <dialog>, alttan açılır; Esc ve arka plan tıklaması kapatır). */
function DecisionDialog({
  title,
  onClose,
  footer,
  children,
}: {
  title: string
  onClose: () => void
  footer: ReactNode
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    if (ref.current && !ref.current.open) ref.current.showModal()
  }, [])
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="m-0 mt-auto max-h-[90dvh] w-full max-w-none rounded-t-dialog bg-background p-0 text-heading backdrop:bg-heading/60"
    >
      <div className="grid gap-4 p-5">
        <h2 id={titleId} className="text-xl font-extrabold">
          {title}
        </h2>
        {children}
        {footer}
      </div>
    </dialog>
  )
}
