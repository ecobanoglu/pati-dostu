import { getTranslations } from "next-intl/server"

import { buttonVariants } from "@/components/ui/button"
import { Link } from "@/i18n/navigation"
import { getCurrentUser } from "@/lib/session"
import { site } from "@/lib/site"
import { cn } from "@/lib/utils"

import { NewsletterButton } from "./newsletter-button"

/**
 * "Haftalık bülten" kutusu (tasarım 03-icerik/03). Karar: e-posta kutusu yok — üye tek tıkla abone olur
 * (`marketingOptIn`, Ayarlar'daki bülten tercihiyle aynı); misafire kayıt / giriş bağlantıları. Oturuma baktığı için
 * <Suspense> içinde.
 */
export async function NewsletterBox() {
  const [t, user] = await Promise.all([getTranslations("Posts"), getCurrentUser()])
  return (
    <section aria-labelledby="newsletter-title" className="grid gap-3 rounded-card bg-smoke p-5">
      <h2 id="newsletter-title" className="text-lg font-extrabold text-heading">
        {t("newsletterTitle")}
      </h2>
      <p className="text-sm text-body">{t("newsletterText")}</p>
      {user ? (
        <NewsletterButton subscribed={user.marketingOptIn} />
      ) : (
        <div className="grid gap-2">
          <Link
            href={{ pathname: "/sign-up" }}
            className={cn(buttonVariants({ size: "lg" }), "h-auto min-h-12 w-full py-2 text-center whitespace-normal")}
          >
            {t("newsletterSignUp")}
          </Link>
          <p className="text-center text-sm text-body">
            {t.rich("newsletterSignIn", {
              link: (chunks) => (
                <Link href="/sign-in" className="font-extrabold text-primary underline underline-offset-4">
                  {chunks}
                </Link>
              ),
            })}
          </p>
        </div>
      )}
    </section>
  )
}

/** "Haber önerin" kutusu: iletişim adresi. */
export async function SuggestNewsBox() {
  const t = await getTranslations("Posts")
  return (
    <section aria-labelledby="suggest-title" className="grid gap-2 rounded-card border border-border p-5">
      <h2 id="suggest-title" className="text-lg font-extrabold text-heading">
        {t("suggestTitle")}
      </h2>
      <p className="text-sm text-body">
        {t.rich("suggestText", {
          email: () => (
            <a href={`mailto:${site.email}`} className="text-primary underline underline-offset-4">
              {site.email}
            </a>
          ),
        })}
      </p>
    </section>
  )
}
