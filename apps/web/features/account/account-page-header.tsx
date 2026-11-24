import { ArrowLeft } from "lucide-react"
import { getTranslations } from "next-intl/server"
import type { ComponentProps } from "react"

import { Link } from "@/i18n/navigation"

type Href = ComponentProps<typeof Link>["href"]

/**
 * Hesabım sayfalarının başlığı (tasarım 02-hesabim/*): masaüstünde "Hesabım / Sayfa" yol izi + başlık + sağda
 * isteğe bağlı eylem; mobilde geri oku + başlık (yol izi yok). Panel özeti de tasarımdaki gibi "Hesabım / Panel özeti"
 * yazar.
 */
export async function AccountPageHeader({
  title,
  crumb,
  back,
  action,
}: {
  title: string
  /** Yol izindeki son öğe (ör. "Favoriler"). */
  crumb: string
  /** Mobil geri okunun hedefi. */
  back: Href
  /** Sağdaki eylem (ör. "Yeni ilan ver"); mobilde gizlenmez, çağıran karar verir. */
  action?: React.ReactNode
}) {
  const t = await getTranslations("Account")
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-4 lg:mb-6">
      <div className="min-w-0">
        <nav aria-label="breadcrumb" className="mb-1 hidden text-sm lg:block">
          <ol className="flex items-center gap-2">
            <li>
              <Link href="/account" className="font-bold text-primary">
                {t("breadcrumb")}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="font-bold text-heading">
              {crumb}
            </li>
          </ol>
        </nav>
        <div className="flex items-center gap-1">
          <Link
            href={back}
            aria-label={t("back")}
            className="-ml-2.5 flex size-tap shrink-0 items-center justify-center rounded-full text-heading hover:bg-smoke-2 lg:hidden"
          >
            <ArrowLeft aria-hidden="true" className="size-6" />
          </Link>
          <h1 className="truncate text-h2 text-heading lg:text-h1">{title}</h1>
        </div>
      </div>
      {action}
    </div>
  )
}
