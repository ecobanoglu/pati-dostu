"use client"

import { Heart } from "lucide-react"
import { useTranslations } from "next-intl"
import { useState } from "react"

import { buttonVariants } from "@/components/ui/button"
import { useRouter } from "@/i18n/navigation"
import { toggleFavorite, useFavorite } from "@/lib/use-favorites"
import { cn } from "@/lib/utils"

type Variant = "card" | "full" | "icon" | "bar"

const VARIANT: Record<Variant, string> = {
  /**
   * Kartın fotoğrafının üstünde yarı saydam beyaz yuvarlak (tasarım 02, 17, hesabım/favoriler). Görünürde 32 px;
   * görünmez ::after katmanı tıklama alanını 44 px'e çıkarır (CLAUDE.md › Erişilebilirlik: dokunma hedefi ≥ 44 px).
   */
  card: "size-8 rounded-full bg-background/65 text-primary shadow-sm hover:bg-background after:absolute after:-inset-1.5",
  /** Detay sayfasındaki iletişim kartında yazılı buton (tasarım 03). */
  full: buttonVariants({ variant: "outline", size: "sm" }) + " [&_svg]:text-primary",
  /** Mobil üst çubuktaki ikon (tasarım 19). */
  icon: buttonVariants({ variant: "ghost", size: "icon" }) + " text-primary",
  /** Mobil alt çubukta "Mesaj gönder"in yanındaki çerçeveli kare (tasarım 19). */
  bar: buttonVariants({ variant: "outline-primary", size: "icon" }) + " size-12 shrink-0",
}

/**
 * Favori (kalp) butonu: basılıysa (aria-pressed) ilan favoridedir. Misafir giriş sayfasına gider ve girişten sonra
 * bu sayfaya döner. Basınca arayüz hemen değişir; istek başarısız olursa geri alınır ve ekran okuyucuya söylenir.
 * `onChange`: favoriler sayfası, çıkarılan ilanı listeden kaldırmak için kullanır.
 */
export function FavoriteButton({
  listingNo,
  title,
  variant,
  className,
  onChange,
}: {
  listingNo: number
  title: string
  variant: Variant
  className?: string
  onChange?: (favorite: boolean) => void
}) {
  const t = useTranslations("Favorites")
  const router = useRouter()
  const { favorite, guest } = useFavorite(listingNo)
  const [message, setMessage] = useState("")

  /** Favoriye ekler/çıkarır; misafiri girişe yönlendirir. */
  async function toggle(event: React.MouseEvent) {
    // Kartın tamamı bağlantı olduğu için tıklama karta geçmesin.
    event.preventDefault()
    event.stopPropagation()
    const toSignIn = () =>
      router.push({ pathname: "/sign-in", query: { next: window.location.pathname + window.location.search } })
    if (guest) return toSignIn()
    const next = !favorite
    const result = await toggleFavorite(listingNo, next)
    if (result === "guest") return toSignIn()
    setMessage(t(result === "ok" ? (next ? "added" : "removed") : "failed"))
    if (result === "ok") onChange?.(next)
  }

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        aria-pressed={favorite}
        aria-label={variant === "full" ? undefined : t("addNamed", { title })}
        title={variant === "full" ? undefined : t(favorite ? "remove" : "add")}
        className={cn(
          "relative z-10 flex items-center justify-center gap-1.5",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
          VARIANT[variant],
          className
        )}
      >
        <Heart aria-hidden="true" className={cn("size-5", favorite && "fill-current")} />
        {variant === "full" && (
          <>
            {t("short")}
            <span className="sr-only">: {title}</span>
          </>
        )}
      </button>
      <span role="status" className="sr-only">
        {message}
      </span>
    </>
  )
}
