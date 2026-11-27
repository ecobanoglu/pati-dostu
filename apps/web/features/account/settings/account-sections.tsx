"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import {
  type ChangePasswordInput,
  changePasswordSchema,
  type ContactInput,
  contactSchema,
  type NotificationPrefs,
  type NotificationTopic,
  type PreferencesInput,
} from "@pati-dostu/validators"
import { LoaderCircle } from "lucide-react"
import { useTranslations } from "next-intl"
import { useEffect, useId, useRef, useState } from "react"
import { useForm, useWatch } from "react-hook-form"

import { Checkbox } from "@/components/form/checkbox"
import { Switch } from "@/components/form/choices"
import { Field } from "@/components/form/field"
import { Input, PasswordInput } from "@/components/form/input"
import { PasswordStrength } from "@/components/form/password-strength"
import { Button } from "@/components/ui/button"
import { Link, useRouter } from "@/i18n/navigation"
import type { Me } from "@/lib/api"
import { apiFetch } from "@/lib/api-browser"
import { authClient } from "@/lib/auth-client"
import { authErrorCode, useErrorMessage } from "@/lib/errors"
import { resetUnreadCounts } from "@/lib/unread-store"
import { resetFavorites } from "@/lib/use-favorites"
import { cn } from "@/lib/utils"

import { SaveStatus, SettingsCard } from "./settings-card"

type Status = { text: string; error?: boolean } | null

/** "+905321234567" → "0532 123 45 67" (forma yazılan biçim). */
function displayPhone(e164: string | null): string {
  const d = (e164 ?? "").replace(/\D/g, "").replace(/^90/, "")
  return d.length === 10 ? `0${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 8)} ${d.slice(8)}` : ""
}

/** İletişim (tasarım 02-hesabim/06): e-posta (salt okunur, doğrulama rozeti) ve telefon (PATCH /me). */
export function ContactSection({ user }: { user: Me }) {
  const t = useTranslations("Settings")
  const errorMessage = useErrorMessage()
  const router = useRouter()
  const [status, setStatus] = useState<Status>(null)
  const form = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
    defaultValues: { phone: displayPhone(user.phone) },
  })
  const { errors, isSubmitting } = form.formState

  /** Telefonu kaydeder (boş bırakılırsa silinir). */
  async function onSubmit(values: ContactInput) {
    setStatus(null)
    const { error } = await apiFetch("/me", { method: "PATCH", body: JSON.stringify(values) })
    if (error) return setStatus({ text: errorMessage(error.code), error: true })
    setStatus({ text: t("saved") })
    router.refresh()
  }

  return (
    <SettingsCard title={t("contactTitle")}>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="settings-email" label={t("email")} description={t("emailHint")}>
            {(field) => (
              <div className="relative">
                <Input {...field} value={user.email} readOnly className="pr-32 font-bold" />
                <span
                  className={cn(
                    "absolute top-1/2 right-3 -translate-y-1/2 rounded-full px-2.5 py-1 text-xs font-bold",
                    user.emailVerified ? "bg-success-soft text-success-text" : "bg-warning-soft text-warning-text"
                  )}
                >
                  {user.emailVerified ? t("verified") : t("notVerified")}
                </span>
              </div>
            )}
          </Field>
          <Field
            id="settings-phone"
            label={t("phone")}
            description={t("phoneHint")}
            error={errors.phone?.message ? errorMessage(errors.phone.message) : undefined}
          >
            {(field) => (
              <Input
                {...field}
                {...form.register("phone")}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder={t("phonePlaceholder")}
              />
            )}
          </Field>
        </div>
        {!user.emailVerified && (
          <Link
            href={{ pathname: "/verify-email", query: { email: user.email } }}
            className="justify-self-start text-sm font-bold text-primary underline"
          >
            {t("verifyLink")}
          </Link>
        )}
        <div className="flex flex-wrap items-center gap-4">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? t("saving") : t("save")}
          </Button>
          <SaveStatus status={status} />
        </div>
      </form>
    </SettingsCard>
  )
}

/**
 * Şifre değiştirme (Better Auth /change-password). API diğer tüm oturumları her durumda kapatır (karar); bu
 * cihazdaki oturum açık kalır. Google ile giriş yapan (şifresi olmayan) kullanıcıya yalnızca bilgi gösterilir.
 */
export function PasswordSection({ user }: { user: Me }) {
  const t = useTranslations("Settings")
  const errorMessage = useErrorMessage()
  const [status, setStatus] = useState<Status>(null)
  const form = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "" },
  })
  const { errors, isSubmitting } = form.formState
  const newPassword = useWatch({ control: form.control, name: "newPassword" })

  /** Şifreyi değiştirir; başarıda formu temizler. */
  async function onSubmit(values: ChangePasswordInput) {
    setStatus(null)
    const { error } = await authClient.changePassword({ ...values, revokeOtherSessions: true })
    if (error) {
      const code = authErrorCode(error)
      if (code === "INVALID_PASSWORD") form.setError("currentPassword", { message: code })
      return setStatus({ text: errorMessage(code), error: true })
    }
    form.reset()
    setStatus({ text: t("passwordSaved") })
  }

  if (!user.hasPassword) {
    return (
      <SettingsCard title={t("passwordTitle")}>
        <p className="text-body">{t("noPassword")}</p>
      </SettingsCard>
    )
  }

  return (
    <SettingsCard title={t("passwordTitle")}>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="settings-current-password"
            label={t("currentPassword")}
            required
            error={errors.currentPassword?.message ? errorMessage(errors.currentPassword.message) : undefined}
          >
            {(field) => (
              <PasswordInput {...field} {...form.register("currentPassword")} autoComplete="current-password" />
            )}
          </Field>
          <Field
            id="settings-new-password"
            label={t("newPassword")}
            required
            description={t("passwordHint")}
            error={errors.newPassword?.message ? errorMessage(errors.newPassword.message) : undefined}
          >
            {(field) => (
              <div className="grid gap-2">
                <PasswordInput {...field} {...form.register("newPassword")} autoComplete="new-password" />
                <PasswordStrength value={newPassword} />
              </div>
            )}
          </Field>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? t("saving") : t("save")}
          </Button>
          <SaveStatus status={status} />
        </div>
      </form>
    </SettingsCard>
  )
}

type Preferences = PreferencesInput & { notificationPrefs: NotificationPrefs }

/** Tercihleri anında kaydeden kanca (bülten, telefon varsayılanı, bildirim kanalları). Hata olursa eski hâline döner. */
function usePreference(user: Me) {
  const t = useTranslations("Settings")
  const errorMessage = useErrorMessage()
  const [values, setValues] = useState<Preferences>({
    marketingOptIn: user.marketingOptIn,
    showPhoneByDefault: user.showPhoneByDefault,
    notificationPrefs: user.notificationPrefs,
  })
  const [status, setStatus] = useState<Status>(null)

  /** Bir tercihi değiştirir ve PATCH /me ile kaydeder. */
  async function set<K extends keyof Preferences>(key: K, value: Preferences[K]) {
    const previous = values[key]
    setValues((v) => ({ ...v, [key]: value }))
    setStatus(null)
    const { error } = await apiFetch("/me", { method: "PATCH", body: JSON.stringify({ [key]: value }) })
    if (error) {
      setValues((v) => ({ ...v, [key]: previous }))
      return setStatus({ text: errorMessage(error.code), error: true })
    }
    setStatus({ text: t("prefSaved") })
  }
  return { values, set, status }
}

/** Tablodaki onay kutusu: 44 px dokunma alanı, erişilebilir ad "Satır — Kanal". */
function PrefCheckbox({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex size-tap cursor-pointer items-center justify-center">
      <input
        type="checkbox"
        aria-label={label}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-5 cursor-pointer accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      />
    </label>
  )
}

/**
 * Bildirim tercihleri (tasarım 02-hesabim/06), Gizlilik. Tablo: konu × kanal (site içi, e-posta); yalnızca çalışan
 * konular var — yeni mesaj, sorularıma cevap ve kayıtlı arama özellikleri gelince, mobil bildirim kanalı v2'de eklenir.
 * Bülten yalnızca e-posta. Telefon yoksa "telefonumu göster" kapalıdır. Her değişiklik anında kaydedilir.
 */
export function PreferencesSections({ user }: { user: Me }) {
  const t = useTranslations("Settings")
  const { values, set, status } = usePreference(user)
  const topics: Array<{ key: NotificationTopic; label: string }> = [
    { key: "listing_review", label: t("topicListingReview") },
    { key: "favorite_update", label: t("topicFavoriteUpdate") },
    { key: "new_message", label: t("topicNewMessage") },
  ]

  /** Bir konunun bir kanalını değiştirir (tüm tercih nesnesi gönderilir). */
  const setChannel = (topic: NotificationTopic, channel: "inApp" | "email", on: boolean) =>
    set("notificationPrefs", {
      ...values.notificationPrefs,
      [topic]: { ...values.notificationPrefs[topic], [channel]: on },
    })

  const th = "px-2 pb-2 text-center text-sm font-bold text-body"
  return (
    <>
      <SettingsCard title={t("notifPrefsTitle")}>
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th scope="col" className={cn(th, "text-left")}>
                {t("colTopic")}
              </th>
              <th scope="col" className={cn(th, "w-20 sm:w-28")}>
                {t("colInApp")}
              </th>
              <th scope="col" className={cn(th, "w-20 sm:w-28")}>
                {t("colEmail")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {topics.map(({ key, label }) => (
              <tr key={key}>
                <th scope="row" className="py-1 pr-2 text-left text-[15px] font-bold text-heading">
                  {label}
                </th>
                <td>
                  <PrefCheckbox
                    label={`${label} — ${t("colInApp")}`}
                    checked={values.notificationPrefs[key].inApp}
                    onChange={(v) => setChannel(key, "inApp", v)}
                  />
                </td>
                <td>
                  <PrefCheckbox
                    label={`${label} — ${t("colEmail")}`}
                    checked={values.notificationPrefs[key].email}
                    onChange={(v) => setChannel(key, "email", v)}
                  />
                </td>
              </tr>
            ))}
            <tr>
              <th scope="row" className="py-1 pr-2 text-left text-[15px] font-bold text-heading">
                {t("newsletter")}
              </th>
              <td className="text-center text-body">
                <span aria-hidden="true">—</span>
                <span className="sr-only">{t("channelNotAvailable")}</span>
              </td>
              <td>
                <PrefCheckbox
                  label={`${t("newsletter")} — ${t("colEmail")}`}
                  checked={values.marketingOptIn}
                  onChange={(v) => set("marketingOptIn", v)}
                />
              </td>
            </tr>
          </tbody>
        </table>
      </SettingsCard>
      <SettingsCard title={t("privacyTitle")}>
        <Switch
          id="settings-show-phone"
          checked={values.showPhoneByDefault && Boolean(user.phone)}
          onChange={(v) => set("showPhoneByDefault", v)}
          disabled={!user.phone}
          label={t("showPhoneDefault")}
          description={user.phone ? t("showPhoneDefaultHint") : t("showPhoneNoPhone")}
        />
      </SettingsCard>
      <SaveStatus status={status} />
    </>
  )
}

/**
 * Hesap › Hesabı sil (karar: anında kapat + anonimleştir). Pencerede şifreli hesapta mevcut şifre, Google
 * hesabında onay kutusu istenir; DELETE /me başarılıysa oturum kapatılır ve anasayfaya dönülür.
 */
export function DeleteAccountSection({ user }: { user: Me }) {
  const t = useTranslations("Settings")
  const errorMessage = useErrorMessage()
  const router = useRouter()
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState("")
  const [agreed, setAgreed] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // open değişince pencereyi aç/kapat.
  useEffect(() => {
    if (open && !dialog.current?.open) dialog.current?.showModal()
    if (!open && dialog.current?.open) dialog.current.close()
  }, [open])

  /** Hesabı siler, oturumu kapatır ve anasayfaya döner. */
  async function remove(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(null)
    const { error: err } = await apiFetch("/me", {
      method: "DELETE",
      body: JSON.stringify({ password, confirm: true }),
    })
    if (err) {
      setPending(false)
      return setError(errorMessage(err.code))
    }
    await authClient.signOut().catch(() => undefined)
    resetFavorites()
    resetUnreadCounts()
    router.replace("/")
    router.refresh()
  }

  const canSubmit = user.hasPassword ? password.length > 0 : agreed

  return (
    <SettingsCard title={t("accountTitle")} danger>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0 flex-1 basis-64">
          <p className="font-extrabold text-destructive">{t("deleteTitle")}</p>
          <p className="text-sm text-body">{t("deleteText")}</p>
        </div>
        <Button
          variant="outline"
          className="border-2 border-destructive text-destructive"
          onClick={() => setOpen(true)}
        >
          {t("deleteButton")}
        </Button>
      </div>

      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        onCancel={(e) => {
          e.preventDefault()
          if (!pending) setOpen(false)
        }}
        className="m-0 w-full max-w-none bg-background p-0 text-heading backdrop:bg-heading/60 max-sm:top-auto max-sm:bottom-0 max-sm:rounded-t-dialog sm:m-auto sm:max-w-md sm:rounded-dialog"
      >
        <form onSubmit={remove} className="grid gap-4 p-6">
          <h2 id={titleId} className="text-xl font-extrabold">
            {t("deleteDialogTitle")}
          </h2>
          <p className="text-body">{t("deleteDialogText")}</p>
          {user.hasPassword ? (
            <Field id="settings-delete-password" label={t("deletePassword")} required error={error ?? undefined}>
              {(field) => (
                <PasswordInput
                  {...field}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              )}
            </Field>
          ) : (
            <>
              <Checkbox
                id="settings-delete-agree"
                label={t("deleteConfirmGoogle")}
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
              />
              {error && (
                <p role="alert" className="text-sm font-bold text-destructive">
                  {error}
                </p>
              )}
            </>
          )}
          <div className="mt-2 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending} autoFocus>
              {t("cancel")}
            </Button>
            <Button type="submit" variant="destructive" disabled={pending || !canSubmit}>
              {pending && <LoaderCircle aria-hidden="true" className="animate-spin motion-reduce:animate-none" />}
              {t("deleteConfirm")}
            </Button>
          </div>
        </form>
      </dialog>
    </SettingsCard>
  )
}
