"use client"

import { LoaderCircle } from "lucide-react"
import { useTranslations } from "next-intl"
import { type FormEvent, useEffect, useId, useRef, useState } from "react"

import { ConfirmDialog } from "@/components/dialog/confirm-dialog"
import { Field } from "@/components/form/field"
import { Textarea } from "@/components/form/input"
import { Button } from "@/components/ui/button"
import { useRouter } from "@/i18n/navigation"
import { apiFetch } from "@/lib/api-browser"
import { useErrorMessage } from "@/lib/errors"
import { refreshAdminCounts } from "@/lib/use-admin-counts"
import { cn } from "@/lib/utils"

/**
 * Kurum başvurusu kararı (Admin › Kurum başvuruları ve Kullanıcılar sayfasındaki kutu): "Onayla" (onay penceresi —
 * rol klinik / barınak olur, kullanıcıya bildirim + e-posta) ve "Reddet" (gerekçe penceresi, en az 10 karakter;
 * gerekçe kullanıcıya gider, düzenleyip yeniden gönderebilir). Karardan sonra menü rozeti ve sayfa yenilenir.
 */
export function ApplicationActions({
  id,
  name,
  type,
  size = "default",
}: {
  id: string
  name: string
  type: "clinic" | "shelter"
  /** sm: Kullanıcılar sayfasındaki dar kutu. */
  size?: "default" | "sm"
}) {
  const t = useTranslations("AdminApplications")
  const router = useRouter()
  const errorMessage = useErrorMessage()
  const [dialog, setDialog] = useState<"approve" | "reject" | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null)

  /** Kararı gönderir; başarıda rozet ve sayfa yenilenir. */
  const decide = async (kind: "approve" | "reject", reason?: string): Promise<string | null> => {
    setBusy(true)
    const { error } = await apiFetch(`/admin/organizations/applications/${id}/${kind}`, {
      method: "POST",
      body: JSON.stringify(reason ? { reason } : {}),
    })
    setBusy(false)
    if (error) return errorMessage(error.code, error.details)
    setDialog(null)
    setNotice({ ok: true, text: t(kind === "approve" ? "approved" : "rejected") })
    await refreshAdminCounts()
    router.refresh()
    return null
  }

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-2.5">
        <Button
          type="button"
          className="bg-success text-white hover:bg-success-text"
          onClick={() => setDialog("approve")}
          disabled={busy}
          aria-label={size === "sm" ? t("approveFor", { name }) : undefined}
        >
          {t("approve")}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="border-danger text-danger hover:bg-danger-soft"
          onClick={() => setDialog("reject")}
          disabled={busy}
          aria-label={size === "sm" ? t("rejectFor", { name }) : undefined}
        >
          {t("reject")}
        </Button>
      </div>
      <p
        role="status"
        className={notice ? `text-sm font-bold ${notice.ok ? "text-success-text" : "text-destructive"}` : "sr-only"}
      >
        {notice?.text}
      </p>
      <ConfirmDialog
        open={dialog === "approve"}
        title={t("approveTitle")}
        text={t("approveText", { name, role: t(`roles.${type}`) })}
        confirmLabel={t("approve")}
        cancelLabel={t("cancel")}
        pending={busy}
        onConfirm={async () => {
          const err = await decide("approve")
          if (err) {
            setDialog(null)
            setNotice({ ok: false, text: err })
          }
        }}
        onCancel={() => setDialog(null)}
      />
      {dialog === "reject" && (
        <RejectDialog name={name} onClose={() => setDialog(null)} onSubmit={(reason) => decide("reject", reason)} />
      )}
    </div>
  )
}

/** Red penceresi: kullanıcıya gidecek gerekçe (yerel <dialog>; masaüstü ortada, mobil alttan). */
function RejectDialog({
  name,
  onClose,
  onSubmit,
}: {
  name: string
  onClose: () => void
  onSubmit: (reason: string) => Promise<string | null>
}) {
  const t = useTranslations("AdminApplications")
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const [reason, setReason] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (ref.current && !ref.current.open) ref.current.showModal()
  }, [])

  /** Doğrular ve gönderir. */
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (reason.trim().length < 10) return setError(t("reasonTooShort"))
    setBusy(true)
    const err = await onSubmit(reason.trim())
    setBusy(false)
    if (err) setError(err)
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault()
        if (!busy) onClose()
      }}
      onClick={(e) => e.target === e.currentTarget && !busy && onClose()}
      className={cn(
        "m-0 w-full max-w-none bg-background p-0 text-heading backdrop:bg-heading/60",
        "max-sm:top-auto max-sm:bottom-0 max-sm:rounded-t-dialog sm:m-auto sm:max-w-lg sm:rounded-dialog"
      )}
    >
      <form onSubmit={submit} noValidate className="grid gap-4 p-6">
        <h2 id={titleId} className="text-xl font-extrabold">
          {t("rejectTitle")}
        </h2>
        <p className="text-body">{t("rejectText", { name })}</p>
        <Field
          id="reject-reason"
          label={t("reasonLabel")}
          required
          description={t("reasonHint")}
          error={error ?? undefined}
        >
          {(control) => (
            <Textarea
              {...control}
              autoFocus
              value={reason}
              maxLength={1000}
              className="min-h-28"
              onChange={(e) => {
                setReason(e.target.value)
                setError(null)
              }}
            />
          )}
        </Field>
        <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            {t("cancel")}
          </Button>
          <Button type="submit" variant="destructive" disabled={busy}>
            {busy && <LoaderCircle aria-hidden="true" className="animate-spin motion-reduce:animate-none" />}
            {t("reject")}
          </Button>
        </div>
      </form>
    </dialog>
  )
}
