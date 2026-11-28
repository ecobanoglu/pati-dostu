import { ArrowRight } from "lucide-react"

import { Link } from "@/i18n/navigation"

type Href = "/listings" | "/community" | "/blog"

/**
 * Anasayfa bölüm başlığı: solda başlık (h2), sağda bölümün tamamına bağlantı (mobilde kısa metin "Tümü", masaüstünde
 * uzun metin — tasarım 01, 16).
 */
export function SectionHeader({
  id,
  title,
  href,
  linkShort,
  linkLong,
}: {
  id: string
  title: string
  href: Href
  linkShort: string
  linkLong: string
}) {
  return (
    <div className="mb-5 flex items-baseline justify-between gap-4 lg:mb-7">
      <h2 id={id} className="text-h2 text-heading">
        {title}
      </h2>
      <Link href={href} className="flex min-h-tap shrink-0 items-center gap-1.5 font-extrabold text-primary">
        <span className="lg:hidden">{linkShort}</span>
        <span className="max-lg:hidden">{linkLong}</span>
        <ArrowRight aria-hidden="true" className="size-4" />
      </Link>
    </div>
  )
}
