"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { type ResetPasswordInput, resetPasswordSchema } from "@pati-dostu/validators"
import { useTranslations } from "next-intl"
import { useSearchParams } from "next/navigation"
import { useState } from "react"
import { useForm, useWatch } from "react-hook-form"

import { Field } from "@/components/form/field"
import { PasswordInput } from "@/components/form/input"
import { PasswordStrength } from "@/components/form/password-strength"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button, buttonVariants } from "@/components/ui/button"
import { Link } from "@/i18n/navigation"
import { authClient } from "@/lib/auth-client"
import { authErrorCode, useErrorMessage } from "@/lib/errors"

/**
 * "Yeni şifre belirle" formu. E-postadaki bağlantı API'den geçip buraya ?token= ile gelir; bağlantı geçersiz veya
 * süresi dolmuşsa Better Auth ?error=INVALID_TOKEN ekler. Şifre değişince API tüm oturumları kapatır.
 */
export function ResetPasswordForm() {
  const t = useTranslations("ResetPassword")
  const errorMessage = useErrorMessage()
  const params = useSearchParams()
  const token = params.get("token")
  const linkInvalid = !token || params.has("error")
  const [done, setDone] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  })
  const { errors, isSubmitting } = form.formState
  const newPassword = useWatch({ control: form.control, name: "newPassword" })

  /** Yeni şifreyi kaydeder. */
  async function onSubmit(values: ResetPasswordInput) {
    if (!token) return
    setFormError(null)
    const { error } = await authClient.resetPassword({ token, newPassword: values.newPassword })
    if (error) {
      setFormError(errorMessage(authErrorCode(error)))
      return
    }
    setDone(true)
  }

  if (done) {
    return (
      <div className="grid gap-5">
        <Alert variant="success">
          <AlertTitle>{t("successTitle")}</AlertTitle>
          <AlertDescription>{t("successDescription")}</AlertDescription>
        </Alert>
        <Link href="/sign-in" className={buttonVariants({ size: "lg" })}>
          {t("goToSignIn")}
        </Link>
      </div>
    )
  }

  if (linkInvalid) {
    return (
      <div className="grid gap-5">
        <Alert variant="destructive">
          <AlertDescription>{t("invalidLink")}</AlertDescription>
        </Alert>
        <Link href="/forgot-password" className={buttonVariants({ size: "lg" })}>
          {t("requestNew")}
        </Link>
      </div>
    )
  }

  return (
    <div className="grid gap-5">
      <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="grid gap-5">
        {formError && (
          <Alert variant="destructive">
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-2">
          <Field
            id="newPassword"
            label={t("newPassword")}
            required
            description={t("sessionsNote")}
            error={errors.newPassword && errorMessage(errors.newPassword.message)}
          >
            {(control) => <PasswordInput {...control} autoComplete="new-password" {...form.register("newPassword")} />}
          </Field>
          <PasswordStrength value={newPassword} />
        </div>

        <Field
          id="confirmPassword"
          label={t("confirmPassword")}
          required
          error={errors.confirmPassword && errorMessage(errors.confirmPassword.message)}
        >
          {(control) => (
            <PasswordInput {...control} autoComplete="new-password" {...form.register("confirmPassword")} />
          )}
        </Field>

        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {t("submit")}
        </Button>
      </form>

      <p className="rounded-xl bg-smoke-2 px-4 py-3.5 text-sm text-heading">
        {t.rich("expired", {
          link: (chunks) => (
            <Link href="/forgot-password" className="font-bold text-primary underline">
              {chunks}
            </Link>
          ),
        })}
      </p>
    </div>
  )
}
