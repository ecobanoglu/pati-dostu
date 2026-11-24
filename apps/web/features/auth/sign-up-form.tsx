"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { type SignUpInput, signUpSchema } from "@pati-dostu/validators"
import { useLocale, useTranslations } from "next-intl"
import { useState } from "react"
import { useForm, useWatch } from "react-hook-form"

import { Checkbox } from "@/components/form/checkbox"
import { Field } from "@/components/form/field"
import { Input, PasswordInput, Select } from "@/components/form/input"
import { PasswordStrength } from "@/components/form/password-strength"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Link, useRouter } from "@/i18n/navigation"
import { authClient } from "@/lib/auth-client"
import { authErrorCode, useErrorMessage } from "@/lib/errors"

import { GoogleButton } from "./google-button"
import { useAbsoluteUrl } from "./use-absolute-url"

export type CityOption = { id: string; name: string }

/**
 * Kayıt formu (tasarım: 10-kayit-ol). Alanlar ve kurallar @pati-dostu/validators › signUpSchema ile API'yle aynı.
 * Başarılı kayıtta Better Auth doğrulama e-postası gönderir; kullanıcı "E-postanı doğrula" sayfasına geçer.
 */
export function SignUpForm({ cities }: { cities: CityOption[] }) {
  const t = useTranslations("SignUp")
  const locale = useLocale()
  const errorMessage = useErrorMessage()
  const router = useRouter()
  const absoluteUrl = useAbsoluteUrl()
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      cityId: "",
      password: "",
      acceptTerms: false as unknown as true,
      marketingOptIn: false,
    },
  })
  const { errors, isSubmitting } = form.formState
  const password = useWatch({ control: form.control, name: "password" })

  /** Hesabı oluşturur; boş isteğe bağlı alanlar gönderilmez. */
  async function onSubmit(values: SignUpInput) {
    setFormError(null)
    const { error } = await authClient.signUp.email({
      name: values.name,
      email: values.email,
      password: values.password,
      // Better Auth ek alanları (apps/api/src/auth/auth.ts › additionalFields)
      ...(values.phone ? { phone: values.phone } : {}),
      ...(values.cityId ? { cityId: values.cityId } : {}),
      marketingOptIn: values.marketingOptIn,
      locale,
      acceptTerms: values.acceptTerms,
      callbackURL: absoluteUrl("/verify-email", { verified: "1" }),
    } as Parameters<typeof authClient.signUp.email>[0])
    if (error) {
      setFormError(errorMessage(authErrorCode(error)))
      return
    }
    router.push({ pathname: "/verify-email", query: { email: values.email } })
  }

  const fieldError = (name: keyof SignUpInput) => {
    const message = errors[name]?.message
    return message ? errorMessage(message) : undefined
  }

  return (
    <>
      <GoogleButton />
      <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="grid gap-5">
        {formError && (
          <Alert variant="destructive">
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}

        <Field id="name" label={t("name")} required error={fieldError("name")}>
          {(control) => <Input {...control} autoComplete="name" {...form.register("name")} />}
        </Field>

        <Field id="email" label={t("email")} required description={t("emailHint")} error={fieldError("email")}>
          {(control) => (
            <Input {...control} type="email" autoComplete="email" inputMode="email" {...form.register("email")} />
          )}
        </Field>

        <div className="grid gap-5 sm:grid-cols-2 sm:gap-3">
          <Field id="phone" label={t("phone")} description={t("phoneHint")} error={fieldError("phone")}>
            {(control) => (
              <Input
                {...control}
                type="tel"
                autoComplete="tel-national"
                inputMode="tel"
                placeholder={t("phonePlaceholder")}
                {...form.register("phone")}
              />
            )}
          </Field>
          <Field id="cityId" label={t("city")} error={fieldError("cityId")}>
            {(control) => (
              <Select {...control} autoComplete="address-level1" {...form.register("cityId")}>
                <option value="">{t("cityPlaceholder")}</option>
                {cities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>

        <div className="grid gap-2">
          <Field
            id="password"
            label={t("password")}
            required
            description={t("passwordHint")}
            error={fieldError("password")}
          >
            {(control) => <PasswordInput {...control} autoComplete="new-password" {...form.register("password")} />}
          </Field>
          <PasswordStrength value={password} />
        </div>

        <div>
          <Checkbox
            id="acceptTerms"
            error={fieldError("acceptTerms")}
            label={t.rich("acceptTerms", {
              kvkk: (chunks) => (
                <Link
                  href={{ pathname: "/legal/[slug]", params: { slug: "kvkk" } }}
                  target="_blank"
                  className="text-primary underline"
                >
                  {chunks}
                </Link>
              ),
              terms: (chunks) => (
                <Link
                  href={{ pathname: "/legal/[slug]", params: { slug: "kullanim-sartlari" } }}
                  target="_blank"
                  className="text-primary underline"
                >
                  {chunks}
                </Link>
              ),
            })}
            {...form.register("acceptTerms")}
          />
          <Checkbox id="marketingOptIn" label={t("marketing")} {...form.register("marketingOptIn")} />
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {t("submit")}
        </Button>
      </form>
    </>
  )
}
