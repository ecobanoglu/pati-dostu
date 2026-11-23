"use client"

import { useTranslations } from "next-intl"
import { useRouter as useRawRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"

import { Field } from "@/components/form/field"
import { Input } from "@/components/form/input"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button, buttonVariants } from "@/components/ui/button"
import { Link } from "@/i18n/navigation"
import { authClient } from "@/lib/auth-client"
import { authErrorCode, useErrorMessage } from "@/lib/errors"

import { useAbsoluteUrl } from "./use-absolute-url"

/** Tekrar gönderme bekleme süresi (saniye); API'nin istek sınırlamasına takılmamak için. */
const RESEND_COOLDOWN = 60

/**
 * "E-postanı doğrula" sayfasının içeriği; üç durumu var:
 * 1. ?verified=1 → bağlantıya tıklanmış, hesap doğrulanmış ve oturum açılmış (Better Auth autoSignIn).
 * 2. ?error=… → bağlantı geçersiz/süresi dolmuş; e-posta yazılıp yenisi istenir.
 * 3. ?email=… → kayıt/giriş sonrası "bağlantı gönderdik" ekranı; 60 sn bekleme ile tekrar gönder.
 */
export function VerifyEmailPanel() {
  const t = useTranslations("VerifyEmail")
  const errorMessage = useErrorMessage()
  const absoluteUrl = useAbsoluteUrl()
  const rawRouter = useRawRouter()
  const params = useSearchParams()
  const verified = params.get("verified") === "1" && !params.has("error")
  const linkInvalid = params.has("error")
  const [email, setEmail] = useState(params.get("email") ?? "")
  const [cooldown, setCooldown] = useState(linkInvalid ? 0 : RESEND_COOLDOWN)
  const [status, setStatus] = useState<{ kind: "sent" | "error"; text: string } | null>(null)
  const [pending, setPending] = useState(false)

  // Geri sayım: her saniye bir azalır.
  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  // Doğrulamadan sonra üst menüdeki oturum bilgisi yenilensin.
  useEffect(() => {
    if (verified) rawRouter.refresh()
  }, [verified, rawRouter])

  /** Doğrulama e-postasını yeniden gönderir. */
  async function resend() {
    if (!email) return
    setPending(true)
    setStatus(null)
    const { error } = await authClient.sendVerificationEmail({
      email,
      callbackURL: absoluteUrl("/verify-email", { verified: "1" }),
    })
    setPending(false)
    if (error) {
      setStatus({ kind: "error", text: errorMessage(authErrorCode(error)) })
      return
    }
    setStatus({ kind: "sent", text: t("resent") })
    setCooldown(RESEND_COOLDOWN)
  }

  if (verified) {
    return (
      <div className="grid gap-5">
        <Alert variant="success">
          <AlertTitle>{t("verifiedTitle")}</AlertTitle>
          <AlertDescription>{t("verifiedDescription")}</AlertDescription>
        </Alert>
        <Link href="/" className={buttonVariants({ size: "lg" })}>
          {t("continue")}
        </Link>
      </div>
    )
  }

  const time = `0:${String(cooldown).padStart(2, "0")}`

  return (
    <div className="grid gap-5">
      {linkInvalid ? (
        <Alert variant="destructive">
          <AlertTitle>{t("linkInvalidTitle")}</AlertTitle>
          <AlertDescription>{t("linkInvalidDescription")}</AlertDescription>
        </Alert>
      ) : (
        <>
          <p className="text-body">
            {email
              ? t.rich("sentTo", { email, b: (chunks) => <strong className="text-heading">{chunks}</strong> })
              : t("sentGeneric")}
          </p>
          <ul className="list-disc space-y-1 pl-5 text-heading">
            <li>{t("bullet1")}</li>
            <li>{t("bullet2")}</li>
          </ul>
        </>
      )}

      {(linkInvalid || !params.get("email")) && (
        <Field id="email" label={t("email")} required>
          {(control) => (
            <Input
              {...control}
              type="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          )}
        </Field>
      )}

      <Button
        type="button"
        variant="outline"
        size="lg"
        className="w-full"
        onClick={resend}
        disabled={pending || cooldown > 0 || !email}
      >
        {cooldown > 0 ? t("resendIn", { time }) : t("resend")}
      </Button>

      {status && (
        <Alert variant={status.kind === "sent" ? "success" : "destructive"}>
          <AlertDescription>{status.text}</AlertDescription>
        </Alert>
      )}

      {!linkInvalid && (
        <p className="text-sm text-body">
          {t.rich("wrongAddress", {
            link: (chunks) => (
              <Link href="/sign-up" className="font-bold text-primary underline">
                {chunks}
              </Link>
            ),
          })}
        </p>
      )}

      <p className="rounded-xl bg-smoke-2 px-4 py-3.5 text-sm text-heading">{t("validity")}</p>
    </div>
  )
}
