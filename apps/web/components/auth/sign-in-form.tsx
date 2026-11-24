"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { type SignInInput, signInSchema } from "@pati-dostu/validators"
import type { Route } from "next"
import { useTranslations } from "next-intl"
import { useRouter as useRawRouter, useSearchParams } from "next/navigation"
import { useState } from "react"
import { useForm } from "react-hook-form"

import { Checkbox } from "@/components/form/checkbox"
import { Field } from "@/components/form/field"
import { Input, PasswordInput } from "@/components/form/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Link, useRouter } from "@/i18n/navigation"
import { authClient } from "@/lib/auth-client"
import { authErrorCode, safeNextPath, useErrorMessage } from "@/lib/errors"
import { resetFavorites } from "@/lib/use-favorites"

import { GoogleButton } from "./google-button"

/**
 * Giriş formu. Başarılı girişte ?next= ile gelinen sayfaya (yoksa anasayfaya) döner.
 * E-posta doğrulanmamışsa Better Auth yeni bağlantı gönderir; kullanıcı doğrulama sayfasına yönlendirilir.
 */
export function SignInForm() {
  const t = useTranslations("SignIn")
  const errorMessage = useErrorMessage()
  const router = useRouter()
  const rawRouter = useRawRouter()
  const params = useSearchParams()
  const next = safeNextPath(params.get("next"))
  const [formError, setFormError] = useState<string | null>(params.get("error") === "oauth" ? t("oauthFailed") : null)

  const form = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "", rememberMe: true },
  })
  const { errors, isSubmitting } = form.formState

  /** Better Auth ile giriş yapar; hata kodunu çevirip formun üstünde gösterir. */
  async function onSubmit(values: SignInInput) {
    setFormError(null)
    const { error } = await authClient.signIn.email(values)
    if (error) {
      const code = authErrorCode(error)
      if (code === "EMAIL_NOT_VERIFIED") {
        router.push({ pathname: "/verify-email", query: { email: values.email } })
        return
      }
      setFormError(errorMessage(code))
      return
    }
    resetFavorites()
    // `next` zaten dile göre çevrilmiş tam yol (ör. /hesabim/ilanlarim); bu yüzden next/navigation yönlendiricisi.
    if (next)
      rawRouter.replace(next as Route) // safeNextPath ile doğrulandı
    else router.replace("/")
    rawRouter.refresh()
  }

  return (
    <>
      <GoogleButton next={next} />
      <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="grid gap-5">
        {formError && (
          <Alert variant="destructive">
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}

        <Field id="email" label={t("email")} required error={errors.email && errorMessage(errors.email.message)}>
          {(control) => (
            <Input
              {...control}
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder={t("emailPlaceholder")}
              {...form.register("email")}
            />
          )}
        </Field>

        <Field
          id="password"
          label={t("password")}
          required
          error={errors.password && errorMessage(errors.password.message)}
        >
          {(control) => <PasswordInput {...control} autoComplete="current-password" {...form.register("password")} />}
        </Field>

        <div className="flex flex-wrap items-center justify-between gap-x-4">
          <Checkbox id="rememberMe" label={t("rememberMe")} {...form.register("rememberMe")} />
          <Link
            href="/forgot-password"
            className="inline-flex min-h-tap items-center font-bold text-primary underline underline-offset-2"
          >
            {t("forgot")}
          </Link>
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {t("submit")}
        </Button>
      </form>

      <p className="mt-6 hidden border-t border-border pt-5 text-[13px] text-body lg:block">
        {t.rich("orgNote", {
          link: (chunks) => (
            <Link href="/account/organization-application" className="font-bold text-primary underline">
              {chunks}
            </Link>
          ),
        })}
      </p>
    </>
  )
}
