import { BadgeCheck } from "lucide-react"
import { useTranslations } from "next-intl"

import { cn } from "@/lib/utils"

/**
 * Kurum hesabının türü ve doğrulanmış işareti: "✓ Veteriner kliniği · Doğrulanmış" (profil menüsü ve Hesabım kutusu).
 * Kurum hesabı yalnız admin onaylı başvuruyla oluştuğu için rol klinik / barınak ise doğrulanmıştır.
 */
export function VerifiedOrgBadge({ role, className }: { role: "clinic" | "shelter"; className?: string }) {
  const t = useTranslations("Account")
  return (
    <p className={cn("flex items-center gap-1 font-bold text-success-text", className)}>
      <BadgeCheck aria-hidden="true" className="size-4 shrink-0" />
      <span className="truncate">
        {t(`role.${role}`)} · {t("verified")}
      </span>
    </p>
  )
}
