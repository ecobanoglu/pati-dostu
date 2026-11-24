"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { type ForgotPasswordInput, forgotPasswordSchema } from "@pati-dostu/validators"
import { useTranslations } from "next-intl"
import { useSearchParams } from "next/navigation"
import { useState } from "react"
import { useForm } from "react-hook-form"

import { Field } from "@/components/form/field"
import { Input } from "@/components/form/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Link } from "@/i18n/navigation"
import { authClient } from "@/lib/auth-client"
import { authErrorCode, useErrorMessage } from "@/lib/errors"

import { useAbsoluteUrl } from "./use-absolute-url"

/**
 * "Şifremi unuttum" formu. Hesap var olsun olmasın aynı mesaj gösterilir (e-posta adresinin kayıtlı olup olmadığı
 * dışarıya sızdırılmaz). E-postadaki bağlantı kullanıcıyı "Yeni şifre belirle" sayfasına getirir.
 */
export function ForgotPasswordForm() {
  const t = useTranslations("ForgotPassword")
  const errorMessage = useErrorMessage()
  const absoluteUrl = useAbsoluteUrl()
  const params = useSearchParams()
  const [sent, setSent] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: params.get("email") ?? "" },
  })
  const { errors, isSubmitting } = form.formState

  /** Sıfırlama bağlantısı ister. */
  async function onSubmit(values: ForgotPasswordInput) {
    setFormError(null)
    const { error } = await authClient.requestPasswordReset({
      email: values.email,
      redirectTo: absoluteUrl("/reset-password"),
    })
    if (error) {
      setFormError(errorMessage(authErrorCode(error)))
      return
    }
    setSent(true)
  }

  return (
    <div className="grid gap-5">
      <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
        {formError && (
          <Alert variant="destructive">
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}
        <Field id="email" label={t("email")} required error={errors.email && errorMessage(errors.email.message)}>
          {(control) => (
            <Input {...control} type="email" autoComplete="email" inputMode="email" {...form.register("email")} />
          )}
        </Field>
        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {t("submit")}
        </Button>
      </form>

      {sent && (
        <Alert variant="info">
          <AlertDescription>
            <p>{t.rich("sent", { b: (chunks) => <strong>{chunks}</strong> })}</p>
          </AlertDescription>
        </Alert>
      )}

      <p className="text-[13px] text-body">{t("googleNote")}</p>

      <Link
        href="/sign-in"
        className="mx-auto inline-flex min-h-tap items-center font-extrabold text-primary underline underline-offset-2"
      >
        {t("backToSignIn")}
      </Link>
    </div>
  )
}
