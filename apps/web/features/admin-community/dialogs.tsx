"use client"

import { forumRemovalReasons } from "@pati-dostu/validators"
import { LoaderCircle } from "lucide-react"
import { useTranslations } from "next-intl"
import { type FormEvent, type ReactNode, useEffect, useId, useRef, useState } from "react"

import { Field } from "@/components/form/field"
import { Select, Textarea } from "@/components/form/input"
import { Button } from "@/components/ui/button"
import { apiFetch } from "@/lib/api-browser"
import { useErrorMessage } from "@/lib/errors"
import { cn } from "@/lib/utils"

/**
 * Yerel <dialog> kabuğu (masaüstü ortada, mobil alttan): Esc, arka plana tıklama ve "Vazgeç" kapatır; gönderilirken
 * kapanmaz.
 */
function DialogShell({
  title,
  busy,
  onClose,
  onSubmit,
  children,
}: {
  title: string
  busy: boolean
  onClose: () => void
  onSubmit: (e: FormEvent<HTMLFormElement>) => void
  children: (titleId: string) => ReactNode
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
        if (!busy) onClose()
      }}
      onClick={(e) => e.target === e.currentTarget && !busy && onClose()}
      className={cn(
        "m-0 w-full max-w-none bg-background p-0 text-heading backdrop:bg-heading/60",
        "max-sm:top-auto max-sm:bottom-0 max-sm:rounded-t-dialog sm:m-auto sm:max-w-lg sm:rounded-dialog"
      )}
    >
      <form onSubmit={onSubmit} noValidate className="grid gap-4 p-6">
        <h2 id={titleId} className="text-xl font-extrabold">
          {title}
        </h2>
        {children(titleId)}
      </form>
    </dialog>
  )
}

/**
 * Gerekçeli silme penceresi (konu ya da cevap): hazır gerekçe (şikâyet nedenleri) zorunlu, not isteğe bağlı ("Diğer"de
 * en az 10 karakter). Yazara site içi + e-posta bildirimi gider.
 */
export function RemoveDialog({
  kind,
  id,
  title,
  onClose,
  onDone,
}: {
  kind: "topic" | "reply"
  id: string
  /** Konu başlığı (cevapta konunun başlığı). */
  title: string
  onClose: () => void
  onDone: () => Promise<void>
}) {
  const t = useTranslations("AdminCommunity")
  const tr = useTranslations("Reports")
  const errorMessage = useErrorMessage()
  const [reason, setReason] = useState("")
  const [note, setNote] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<{ field: "reason" | "note" | "general"; text: string } | null>(null)

  /** Doğrular ve siler. */
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!reason) return setError({ field: "reason", text: t("reasonRequired") })
    if (reason === "other" && note.trim().length < 10) return setError({ field: "note", text: t("noteRequired") })
    setBusy(true)
    const { error: err } = await apiFetch(`/admin/forum/${kind === "topic" ? "topics" : "replies"}/${id}/remove`, {
      method: "POST",
      body: JSON.stringify({ reason, note: note.trim() || undefined }),
    })
    setBusy(false)
    if (err) return setError({ field: "general", text: errorMessage(err.code, err.details) })
    await onDone()
  }

  return (
    <DialogShell
      title={t(kind === "topic" ? "removeTopicTitle" : "removeReplyTitle")}
      busy={busy}
      onClose={onClose}
      onSubmit={submit}
    >
      {() => (
        <>
          <p className="text-body">{t(kind === "topic" ? "removeTopicText" : "removeReplyText", { title })}</p>
          <Field
            id="forum-remove-reason"
            label={t("reasonLabel")}
            required
            error={error?.field === "reason" ? error.text : undefined}
          >
            {(control) => (
              <Select
                {...control}
                autoFocus
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value)
                  setError(null)
                }}
              >
                <option value="">{t("reasonPlaceholder")}</option>
                {forumRemovalReasons.map((r) => (
                  <option key={r} value={r}>
                    {tr(`reasons.${r}`)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field
            id="forum-remove-note"
            label={t("noteLabel")}
            description={t("noteHint")}
            error={error?.field === "note" ? error.text : undefined}
          >
            {(control) => (
              <Textarea
                {...control}
                value={note}
                maxLength={1000}
                className="min-h-24"
                onChange={(e) => {
                  setNote(e.target.value)
                  setError(null)
                }}
              />
            )}
          </Field>
          {error?.field === "general" && (
            <p role="alert" className="text-sm font-bold text-destructive">
              {error.text}
            </p>
          )}
          <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
              {t("cancel")}
            </Button>
            <Button type="submit" variant="destructive" disabled={busy}>
              {busy && <LoaderCircle aria-hidden="true" className="animate-spin motion-reduce:animate-none" />}
              {t("remove")}
            </Button>
          </div>
        </>
      )}
    </DialogShell>
  )
}

/** Kategori taşıma penceresi: yeni kategori seçilir (konu adresi değişir; eski adres yeni adrese yönlenir). */
export function MoveDialog({
  id,
  title,
  currentCategoryId,
  categories,
  onClose,
  onDone,
}: {
  id: string
  title: string
  currentCategoryId: string
  categories: Array<{ id: string; name: string }>
  onClose: () => void
  onDone: (categoryName: string) => Promise<void>
}) {
  const t = useTranslations("AdminCommunity")
  const errorMessage = useErrorMessage()
  const [categoryId, setCategoryId] = useState(currentCategoryId)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /** Taşır (aynı kategori seçiliyse yalnız kapatır). */
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (categoryId === currentCategoryId) return onClose()
    setBusy(true)
    const { error: err } = await apiFetch(`/admin/forum/topics/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ categoryId }),
    })
    setBusy(false)
    if (err) return setError(errorMessage(err.code, err.details))
    await onDone(categories.find((c) => c.id === categoryId)?.name ?? "")
  }

  return (
    <DialogShell title={t("moveTitle")} busy={busy} onClose={onClose} onSubmit={submit}>
      {() => (
        <>
          <p className="text-body">{t("moveText", { title })}</p>
          <Field id="forum-move-category" label={t("categoryLabel")} required error={error ?? undefined}>
            {(control) => (
              <Select {...control} autoFocus value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={busy}>
              {busy && <LoaderCircle aria-hidden="true" className="animate-spin motion-reduce:animate-none" />}
              {t("move")}
            </Button>
          </div>
        </>
      )}
    </DialogShell>
  )
}
