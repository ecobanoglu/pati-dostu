"use client"

import { useTranslations } from "next-intl"
import { useState } from "react"

import { buttonVariants } from "@/components/ui/button"
import { authClient } from "@/lib/auth-client"
import { cn } from "@/lib/utils"

import { OrDivider } from "./auth-shell"
import { useAbsoluteUrl } from "./use-absolute-url"

/** Google ile giriş açık mı? API'de GOOGLE_CLIENT_* tanımlanınca web'de NEXT_PUBLIC_GOOGLE_AUTH=true yapılır. */
export const googleAuthEnabled = process.env.NEXT_PUBLIC_GOOGLE_AUTH === "true"

/**
 * "Google ile devam et" butonu ve altındaki "veya" ayracı. Google kapalıysa hiçbir şey göstermez.
 * Başarılı girişte `next` adresine, hata olursa giriş sayfasına (?error=oauth) döner.
 */
export function GoogleButton({ next }: { next?: string | null }) {
  const t = useTranslations("Auth")
  const absoluteUrl = useAbsoluteUrl()
  const [pending, setPending] = useState(false)

  if (!googleAuthEnabled) return null

  /** Google'ın izin ekranına yönlendirir. */
  async function signIn() {
    setPending(true)
    await authClient.signIn.social({
      provider: "google",
      callbackURL: next ? `${window.location.origin}${next}` : absoluteUrl("/"),
      errorCallbackURL: absoluteUrl("/sign-in", { error: "oauth" }),
    })
    setPending(false)
  }

  return (
    <>
      <button
        type="button"
        onClick={signIn}
        disabled={pending}
        className={cn(buttonVariants({ variant: "outline", size: "default" }), "w-full text-heading")}
      >
        <span
          aria-hidden="true"
          className="flex size-6 items-center justify-center rounded-full border-2 border-heading text-xs font-black"
        >
          G
        </span>
        {t("google")}
      </button>
      <OrDivider label={t("or")} />
    </>
  )
}
