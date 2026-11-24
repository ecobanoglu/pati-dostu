import { Plus } from "lucide-react"
import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { Suspense } from "react"

import { buttonVariants } from "@/components/ui/button"
import { AccountMobileMenu } from "@/features/account/account-mobile-menu"
import { AccountPageHeader } from "@/features/account/account-page-header"
import { MyListings, MyListingsFallback } from "@/features/account/my-listings"
import { Link } from "@/i18n/navigation"
import { cn } from "@/lib/utils"

/** Sekme başlığı; kişisel sayfa dizinlenmez. */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("MyListings")
  return { title: t("metaTitle"), robots: { index: false } }
}

/** Hesabım › İlanlarım — /hesabim/ilanlarim (tasarım 01-sayfalar/11, 28). */
export default async function MyListingsPage() {
  const t = await getTranslations("MyListings")
  return (
    <>
      <AccountPageHeader
        title={t("title")}
        crumb={t("title")}
        back="/account"
        action={
          <Link href="/post-listing" className={cn(buttonVariants({ variant: "secondary" }), "max-lg:hidden")}>
            <Plus aria-hidden="true" />
            {t("newListing")}
          </Link>
        }
      />
      <Suspense fallback={<MyListingsFallback />}>
        <MyListings />
      </Suspense>
      <AccountMobileMenu current="/account/listings" />
    </>
  )
}
