"use client"

import type { BanDuration } from "@pati-dostu/validators"
import { LoaderCircle } from "lucide-react"
import { useTranslations } from "next-intl"
import { useState } from "react"

import { ConfirmDialog } from "@/components/dialog/confirm-dialog"
import { Checkbox } from "@/components/form/checkbox"
import { Field } from "@/components/form/field"
import { Select, Textarea } from "@/components/form/input"
import { Button } from "@/components/ui/button"
import { useRouter } from "@/i18n/navigation"
import { refreshListingCaches } from "@/lib/admin-actions"
import { apiFetch } from "@/lib/api-browser"
import { useErrorMessage } from "@/lib/errors"
import { refreshAdminCounts } from "@/lib/use-admin-counts"

import { type ReportsState, reportsHref } from "./query"
import type { ReportCase } from "./types"

/**
 * Şikâyet dosyasının "İşlem" kutusu (tasarım 07-admin/05): içeriği kaldır (ilanda yayından kaldır ya da sil; yorum /
 * konu / cevapta gizle — içerik zaten kalkmışsa gösterilmez), içerik sahibini uyar (hazır metin + neden), hesabı
 * askıya al (7 gün / 30 gün / kalıcı — onay penceresiyle), iç not; "Seçili işlemleri uygula" ya da "Şikayeti asılsız
 * say". En az bir işlem seçilmeli. Sonra rozetler (ve ilan işlemlerinde ilan önbelleği) yenilenir, sıradaki dosya
 * açılır. Admin hesabına yaptırım seçenekleri gösterilmez.
 */
export function ActionPanel({
  data,
  state,
  nextId,
}: {
  data: ReportCase
  state: ReportsState
  /** Karardan sonra açılacak dosya (listede sıradaki). */
  nextId: { type: ReportCase["targetType"]; id: string } | null
}) {
  const t = useTranslations("AdminReports")
  const router = useRouter()
  const errorMessage = useErrorMessage()
  const listingActive = data.listing?.status === "active"
  const [removeContent, setRemoveContent] = useState(false)
  const [listingAction, setListingAction] = useState<"close" | "remove">(listingActive ? "close" : "remove")
  const [warn, setWarn] = useState(false)
  const [ban, setBan] = useState(false)
  const [duration, setDuration] = useState<BanDuration>("7d")
  const [note, setNote] = useState("")
  const [busy, setBusy] = useState<"resolve" | "dismiss" | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmBan, setConfirmBan] = useState(false)

  const canRemove = data.targetType !== "user" && data.live
  const sanctionable = data.subject !== null && data.subject.role !== "admin" && !data.subject.deleted
  const nothing = !removeContent && !warn && !ban
  const base = `/admin/reports/${data.targetType}/${encodeURIComponent(data.targetId)}`

  /** İşlemi gönderir; başarıda sıradaki dosyaya geçer. */
  const send = async (kind: "resolve" | "dismiss") => {
    setConfirmBan(false)
    setError(null)
    setBusy(kind)
    const body =
      kind === "resolve"
        ? { removeContent, listingAction, warn, ban: ban ? duration : "none", note: note.trim() || undefined }
        : { note: note.trim() || undefined }
    const { error: err } = await apiFetch(`${base}/${kind}`, { method: "POST", body: JSON.stringify(body) })
    if (err) {
      setBusy(null)
      setError(errorMessage(err.code, err.details))
      return
    }
    await Promise.all([
      refreshAdminCounts(),
      data.targetType === "listing" && removeContent ? refreshListingCaches() : Promise.resolve(),
    ])
    router.replace(reportsHref({ ...state, selected: nextId }), { scroll: false })
    router.refresh()
  }

  /** "Uygula": işlem seçilmemişse uyarır, askıya alma seçiliyse önce onay sorar. */
  const apply = () => {
    if (nothing) return setError(t("actionRequired"))
    if (ban) return setConfirmBan(true)
    void send("resolve")
  }

  const contentLabel =
    data.targetType === "listing"
      ? t("removeListing")
      : t(`removeContent.${data.targetType as "comment" | "topic" | "reply"}`)

  return (
    <section
      aria-labelledby="action-title"
      className="grid gap-4 rounded-card border-2 border-heading bg-background p-5 lg:p-6"
    >
      <h2 id="action-title" className="text-xl font-extrabold text-heading">
        {t("actionTitle")}
      </h2>
      <fieldset className="grid gap-1">
        <legend className="sr-only">{t("actionsLegend")}</legend>
        {canRemove && (
          <div className="flex flex-wrap items-center gap-x-3">
            <Checkbox
              id="act-remove"
              checked={removeContent}
              onChange={(e) => {
                setRemoveContent(e.target.checked)
                setError(null)
              }}
              label={contentLabel}
            />
            {data.targetType === "listing" && removeContent && (
              <div className="flex items-center gap-2">
                <label htmlFor="act-listing" className="sr-only">
                  {t("listingActionLabel")}
                </label>
                <Select
                  id="act-listing"
                  value={listingAction}
                  onChange={(e) => setListingAction(e.target.value as "close" | "remove")}
                  className="h-11 w-auto"
                >
                  {listingActive && <option value="close">{t("listingClose")}</option>}
                  <option value="remove">{t("listingRemove")}</option>
                </Select>
              </div>
            )}
          </div>
        )}
        {sanctionable && (
          <>
            <Checkbox
              id="act-warn"
              checked={warn}
              onChange={(e) => {
                setWarn(e.target.checked)
                setError(null)
              }}
              label={t("warn")}
            />
            <div className="flex flex-wrap items-center gap-x-3">
              <Checkbox
                id="act-ban"
                checked={ban}
                disabled={data.subject?.banned && !data.subject.banExpires}
                onChange={(e) => {
                  setBan(e.target.checked)
                  setError(null)
                }}
                label={t("ban")}
              />
              {ban && (
                <div>
                  <label htmlFor="act-ban-duration" className="sr-only">
                    {t("banDurationLabel")}
                  </label>
                  <Select
                    id="act-ban-duration"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value as BanDuration)}
                    className="h-11 w-auto"
                  >
                    <option value="7d">{t("banDuration.7d")}</option>
                    <option value="30d">{t("banDuration.30d")}</option>
                    <option value="permanent">{t("banDuration.permanent")}</option>
                  </Select>
                </div>
              )}
            </div>
          </>
        )}
        {!canRemove && !sanctionable && <p className="text-body">{t("noActions")}</p>}
      </fieldset>
      <Field id="act-note" label={t("noteLabel")}>
        {(control) => (
          <Textarea
            {...control}
            value={note}
            maxLength={1000}
            placeholder={t("notePlaceholder")}
            className="min-h-20"
            onChange={(e) => setNote(e.target.value)}
          />
        )}
      </Field>
      <div className="flex flex-wrap gap-3">
        <Button variant="destructive" size="lg" disabled={Boolean(busy)} onClick={apply}>
          {busy === "resolve" && (
            <LoaderCircle aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
          )}
          {t("apply")}
        </Button>
        <Button variant="outline" size="lg" disabled={Boolean(busy)} onClick={() => void send("dismiss")}>
          {busy === "dismiss" && (
            <LoaderCircle aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
          )}
          {t("dismiss")}
        </Button>
      </div>
      <p role="alert" className="text-sm font-bold text-destructive empty:hidden">
        {error}
      </p>
      <p className="text-[13px] text-body">{t("actionNote")}</p>
      <ConfirmDialog
        open={confirmBan}
        title={t("banConfirmTitle")}
        text={t("banConfirmText", { name: data.subject?.name ?? "", duration: t(`banDuration.${duration}`) })}
        confirmLabel={t("apply")}
        cancelLabel={t("cancel")}
        destructive
        pending={busy === "resolve"}
        onConfirm={() => void send("resolve")}
        onCancel={() => setConfirmBan(false)}
      />
    </section>
  )
}
