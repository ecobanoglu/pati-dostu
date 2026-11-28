"use client"

import { type BanDuration, warnReasons } from "@pati-dostu/validators"
import { useTranslations } from "next-intl"
import { useState } from "react"

import { ConfirmDialog } from "@/components/dialog/confirm-dialog"
import { Field } from "@/components/form/field"
import { Input, Select } from "@/components/form/input"
import { Button } from "@/components/ui/button"
import { useRouter } from "@/i18n/navigation"
import { apiFetch } from "@/lib/api-browser"
import { useErrorMessage } from "@/lib/errors"

import type { AdminUserDetail } from "./types"

type Pending = { kind: "role"; role: "user" | "admin" } | { kind: "warn" } | { kind: "ban" } | { kind: "unban" }

/**
 * Kullanıcı işlemleri (ayrıntı panelinde): rol (yalnız Üye ↔ Admin — karar; kurum hesabı, kendi hesabı ve silinmiş
 * hesap için gösterilmez), uyar (neden seç → hazır metin + neden), askıya al (süre + iç gerekçe) ya da askıyı kaldır.
 * Her işlem onay penceresiyle; sonra sayfa yenilenir ve sonuç ekran okuyucuya duyurulur.
 */
export function UserActions({ user, meId }: { user: AdminUserDetail; meId: string }) {
  const t = useTranslations("AdminUsers")
  const tr = useTranslations("Reports")
  const router = useRouter()
  const errorMessage = useErrorMessage()
  const [reason, setReason] = useState<string>("spam")
  const [duration, setDuration] = useState<BanDuration>("7d")
  const [banReason, setBanReason] = useState("")
  const [pending, setPending] = useState<Pending | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null)

  const self = user.id === meId
  const sanctionable = !user.deleted && user.role !== "admin"
  const roleChangeable = !user.deleted && !self && (user.role === "user" || user.role === "admin")

  /** Onaylanan işlemi gönderir. */
  const run = async () => {
    if (!pending) return
    setBusy(true)
    const base = `/admin/users/${encodeURIComponent(user.id)}`
    const { error } =
      pending.kind === "role"
        ? await apiFetch(`${base}/role`, { method: "PATCH", body: JSON.stringify({ role: pending.role }) })
        : pending.kind === "warn"
          ? await apiFetch(`${base}/warn`, { method: "POST", body: JSON.stringify({ reason }) })
          : pending.kind === "ban"
            ? await apiFetch(`${base}/ban`, {
                method: "POST",
                body: JSON.stringify({ duration, reason: banReason.trim() || undefined }),
              })
            : await apiFetch(`${base}/unban`, { method: "POST" })
    setBusy(false)
    const kind = pending.kind
    setPending(null)
    if (error) return setNotice({ ok: false, text: errorMessage(error.code) })
    setNotice({ ok: true, text: t(`done.${kind}`) })
    if (kind === "ban") setBanReason("")
    router.refresh()
  }

  const dialog =
    pending &&
    {
      role: {
        title: t(pending.kind === "role" && pending.role === "admin" ? "makeAdminTitle" : "makeUserTitle"),
        text: t(pending.kind === "role" && pending.role === "admin" ? "makeAdminText" : "makeUserText", {
          name: user.name,
        }),
        confirm: t(pending.kind === "role" && pending.role === "admin" ? "makeAdmin" : "makeUser"),
      },
      warn: {
        title: t("warnTitle"),
        text: t("warnText", { name: user.name, reason: tr(`reasons.${reason as "spam"}`) }),
        confirm: t("warn"),
      },
      ban: {
        title: t("banTitle"),
        text: t("banText", { name: user.name, duration: t(`banDuration.${duration}`) }),
        confirm: t("ban"),
      },
      unban: { title: t("unbanTitle"), text: t("unbanText", { name: user.name }), confirm: t("unban") },
    }[pending.kind]

  return (
    <section aria-labelledby="user-actions-title" className="grid gap-4 border-t border-border pt-4">
      <h3 id="user-actions-title" className="text-base font-extrabold text-heading">
        {t("actionsTitle")}
      </h3>
      {!sanctionable && !roleChangeable && <p className="text-sm text-body">{t("noActions")}</p>}

      {roleChangeable && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[15px] text-body">{t("roleNow", { role: t(`role.${user.role}`) })}</span>
          <Button
            variant="outline"
            size="sm"
            disabled={busy || (user.role === "user" && user.banned)}
            onClick={() => setPending({ kind: "role", role: user.role === "admin" ? "user" : "admin" })}
          >
            {user.role === "admin" ? t("makeUser") : t("makeAdmin")}
          </Button>
        </div>
      )}

      {sanctionable && (
        <>
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <Field id="warn-reason" label={t("warnReason")}>
              {(control) => (
                <Select {...control} value={reason} onChange={(e) => setReason(e.target.value)}>
                  {warnReasons.map((r) => (
                    <option key={r} value={r}>
                      {tr(`reasons.${r as "spam"}`)}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Button variant="outline" disabled={busy} onClick={() => setPending({ kind: "warn" })}>
              {t("warn")}
            </Button>
          </div>
          {user.banned ? (
            <Button variant="outline-primary" disabled={busy} onClick={() => setPending({ kind: "unban" })}>
              {t("unban")}
            </Button>
          ) : (
            <div className="grid gap-2">
              <div className="grid gap-2 sm:grid-cols-[auto_minmax(0,1fr)]">
                <Field id="ban-duration" label={t("banDurationLabel")}>
                  {(control) => (
                    <Select {...control} value={duration} onChange={(e) => setDuration(e.target.value as BanDuration)}>
                      <option value="7d">{t("banDuration.7d")}</option>
                      <option value="30d">{t("banDuration.30d")}</option>
                      <option value="permanent">{t("banDuration.permanent")}</option>
                    </Select>
                  )}
                </Field>
                <Field id="ban-reason" label={t("banReasonLabel")}>
                  {(control) => (
                    <Input
                      {...control}
                      value={banReason}
                      maxLength={500}
                      onChange={(e) => setBanReason(e.target.value)}
                    />
                  )}
                </Field>
              </div>
              <Button variant="destructive" disabled={busy} onClick={() => setPending({ kind: "ban" })}>
                {t("ban")}
              </Button>
            </div>
          )}
        </>
      )}
      <p
        role="status"
        className={notice ? `text-sm font-bold ${notice.ok ? "text-success-text" : "text-destructive"}` : "sr-only"}
      >
        {notice?.text}
      </p>
      <ConfirmDialog
        open={pending !== null}
        title={dialog?.title ?? ""}
        text={dialog?.text ?? ""}
        confirmLabel={dialog?.confirm ?? ""}
        cancelLabel={t("cancel")}
        destructive={pending?.kind === "ban"}
        pending={busy}
        onConfirm={() => void run()}
        onCancel={() => setPending(null)}
      />
    </section>
  )
}
