"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { BIO_MAX, MAX_IMAGE_SOURCE_BYTES, type ProfileInput, profileSchema } from "@pati-dostu/validators"
import { LoaderCircle, Upload } from "lucide-react"
import { useTranslations } from "next-intl"
import { useRef, useState } from "react"
import { useForm, useWatch } from "react-hook-form"

import { Field } from "@/components/form/field"
import { ImageDecodeError, prepareImage, putWithProgress } from "@/components/form/image-processing"
import { Input, Select, Textarea } from "@/components/form/input"
import { UserAvatar } from "@/components/layout/user-avatar"
import { Button } from "@/components/ui/button"
import { useRouter } from "@/i18n/navigation"
import type { Me } from "@/lib/api"
import { apiFetch } from "@/lib/api-browser"
import type { City } from "@/lib/dictionary"
import { useErrorMessage } from "@/lib/errors"

import { SaveStatus, SettingsCard } from "./settings-card"

type Status = { text: string; error?: boolean } | null

/**
 * Profil fotoğrafı: "Fotoğrafı değiştir" dosya seçtirir; tarayıcıda 512 px JPEG'e küçültülür, imzalı adrese yüklenir
 * (POST /uploads/avatar) ve profile bağlanır (PUT /me/avatar). "Kaldır" fotoğrafı siler (DELETE /me/avatar).
 */
function AvatarEditor({ user }: { user: Me }) {
  const t = useTranslations("Settings")
  const errorMessage = useErrorMessage()
  const router = useRouter()
  const input = useRef<HTMLInputElement>(null)
  const [image, setImage] = useState(user.image)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<Status>(null)

  /** Seçilen dosyayı hazırlayıp yükler ve profile bağlar. */
  async function upload(file: File) {
    setStatus(null)
    if (file.size > MAX_IMAGE_SOURCE_BYTES) return setStatus({ text: errorMessage("IMAGE_TOO_LARGE"), error: true })
    setBusy(true)
    try {
      const blob = await prepareImage(file, 512)
      const presign = await apiFetch<{ key: string; uploadUrl: string; headers: Record<string, string> }>(
        "/uploads/avatar",
        { method: "POST", body: JSON.stringify({ contentType: "image/jpeg", size: blob.size }) }
      )
      if (presign.error) throw presign.error
      await putWithProgress(presign.data.uploadUrl, blob, presign.data.headers, () => undefined)
      const saved = await apiFetch<{ image: string }>("/me/avatar", {
        method: "PUT",
        body: JSON.stringify({ key: presign.data.key }),
      })
      if (saved.error) throw saved.error
      setImage(saved.data.image)
      setStatus({ text: t("photoSaved") })
      router.refresh()
    } catch (e) {
      const code =
        e instanceof ImageDecodeError
          ? "IMAGE_UNREADABLE"
          : typeof e === "object" && e && "code" in e
            ? String((e as { code: string }).code)
            : "UPLOAD_FAILED"
      setStatus({ text: errorMessage(code), error: true })
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ""
    }
  }

  /** Profil fotoğrafını kaldırır. */
  async function remove() {
    setBusy(true)
    setStatus(null)
    const { error } = await apiFetch("/me/avatar", { method: "DELETE" })
    setBusy(false)
    if (error) return setStatus({ text: errorMessage(error.code), error: true })
    setImage(null)
    setStatus({ text: t("photoRemoved") })
    router.refresh()
  }

  return (
    <div className="mb-5 grid gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <UserAvatar user={{ ...user, image }} className="size-20 text-2xl" />
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
        />
        <Button
          variant="outline"
          size="sm"
          className="min-h-tap"
          onClick={() => input.current?.click()}
          disabled={busy}
        >
          {busy ? (
            <LoaderCircle aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
          ) : (
            <Upload aria-hidden="true" />
          )}
          {busy ? t("photoUploading") : t("photoChange")}
        </Button>
        {image && (
          <Button variant="outline" size="sm" className="min-h-tap text-destructive" onClick={remove} disabled={busy}>
            {t("photoRemove")}
          </Button>
        )}
      </div>
      <p className="text-sm text-body">{t("photoHint")}</p>
      <SaveStatus status={status} />
    </div>
  )
}

/**
 * Profil bilgileri (tasarım 02-hesabim/06): fotoğraf, ad soyad, şehir, hakkımda (300 karakter, sayaçlı).
 * PATCH /me ile kaydedilir; "Hakkımda" içerik filtresine takılırsa nedeni alanın altında gösterilir.
 */
export function ProfileSection({ user, cities }: { user: Me; cities: City[] }) {
  const t = useTranslations("Settings")
  const errorMessage = useErrorMessage()
  const router = useRouter()
  const [status, setStatus] = useState<Status>(null)
  const form = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user.name, cityId: user.cityId ?? "", bio: user.bio ?? "" },
  })
  const { errors, isSubmitting } = form.formState
  const bio = useWatch({ control: form.control, name: "bio" }) ?? ""

  /** Formu kaydeder; içerik filtresi hatasını ilgili alana bağlar. */
  async function onSubmit(values: ProfileInput) {
    setStatus(null)
    const { error } = await apiFetch("/me", { method: "PATCH", body: JSON.stringify(values) })
    if (error) {
      const message = errorMessage(error.code, error.details)
      // İçerik filtresi: mesaj "Hakkımda" alanının altında (aria-invalid + aria-describedby ile bağlı).
      if (error.code === "CONTENT_BLOCKED")
        return form.setError("bio", { type: "manual", message }, { shouldFocus: true })
      return setStatus({ text: message, error: true })
    }
    setStatus({ text: t("saved") })
    router.refresh()
  }

  const fieldError = (code?: string) => (code ? errorMessage(code) : undefined)

  return (
    <SettingsCard title={t("profileTitle")}>
      <AvatarEditor user={user} />
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="settings-name" label={t("name")} required error={fieldError(errors.name?.message)}>
            {(field) => <Input {...field} {...form.register("name")} autoComplete="name" />}
          </Field>
          <Field id="settings-city" label={t("city")} error={fieldError(errors.cityId?.message)}>
            {(field) => (
              <Select {...field} {...form.register("cityId")}>
                <option value="">{t("cityNone")}</option>
                {cities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
        <Field
          id="settings-bio"
          label={t("bio")}
          description={t("bioHint", { count: bio.length, max: BIO_MAX })}
          error={errors.bio?.type === "manual" ? errors.bio.message : fieldError(errors.bio?.message)}
        >
          {(field) => <Textarea {...field} {...form.register("bio")} rows={3} maxLength={BIO_MAX} />}
        </Field>
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
