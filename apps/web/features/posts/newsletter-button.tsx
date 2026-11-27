"use client"

import { Check } from "lucide-react"
import { useTranslations } from "next-intl"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Link } from "@/i18n/navigation"
import { apiFetch } from "@/lib/api-browser"
import { useErrorMessage } from "@/lib/errors"

/**
 * Üyenin tek tıkla bültene abone olması (PATCH /me › marketingOptIn). Abone olunca durum yazısı ve Ayarlar bağlantısı
 * (abonelikten çıkış oradan) gösterilir; sonuç ekran okuyucuya `role="status"` ile duyurulur.
 */
export function NewsletterButton({ subscribed: initial }: { subscribed: boolean }) {
  const t = useTranslations("Posts")
  const errorMessage = useErrorMessage()
  const [subscribed, setSubscribed] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /** Bülten tercihini açar. */
  async function subscribe() {
    setBusy(true)
    setError(null)
    const { error: err } = await apiFetch("/me", { method: "PATCH", body: JSON.stringify({ marketingOptIn: true }) })
    setBusy(false)
    if (err) setError(errorMessage(err.code, err.details))
    else setSubscribed(true)
  }

  return (
    <div role="status" className="grid gap-2">
      {subscribed ? (
        <>
          <p className="flex items-center gap-2 font-extrabold text-success-text">
            <Check aria-hidden="true" className="size-5" />
            {t("newsletterSubscribed")}
          </p>
          <p className="text-sm text-body">
            {t.rich("newsletterManage", {
              link: (chunks) => (
                <Link href="/account/settings" className="font-extrabold text-primary underline underline-offset-4">
                  {chunks}
                </Link>
              ),
            })}
          </p>
        </>
      ) : (
        <Button size="lg" className="w-full" onClick={subscribe} disabled={busy}>
          {t("newsletterSubscribe")}
        </Button>
      )}
      {error && <p className="text-sm font-bold text-danger">{error}</p>}
    </div>
  )
}
