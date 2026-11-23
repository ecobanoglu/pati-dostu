import { useLocale } from "next-intl"

import type { Me } from "@/lib/api"
import { initials } from "@/lib/site"
import { cn } from "@/lib/utils"

import { isOrganization } from "./account-links"

/**
 * Baş harfli avatar (fotoğraf yüklenince image gösterilecek). Bireysel hesapta yuvarlak, kurum hesabında kare.
 * Dekoratiftir: yanında her zaman kullanıcının adı yazar.
 */
export function UserAvatar({ user, className }: { user: Pick<Me, "name" | "role">; className?: string }) {
  const locale = useLocale()
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center bg-primary text-[13px] font-extrabold text-primary-foreground",
        isOrganization(user) ? "rounded-lg" : "rounded-full",
        className
      )}
    >
      {initials(user.name, locale)}
    </span>
  )
}
