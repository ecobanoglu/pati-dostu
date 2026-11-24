import { useLocale } from "next-intl"

import type { Me } from "@/lib/api"
import { initials } from "@/lib/site"
import { cn } from "@/lib/utils"

import { isOrganization } from "./account-links"

/**
 * Kullanıcı avatarı: profil fotoğrafı varsa o, yoksa baş harfler. Bireysel hesapta yuvarlak, kurum hesabında kare.
 * Dekoratiftir: yanında her zaman kullanıcının adı yazar.
 */
export function UserAvatar({
  user,
  className,
}: {
  user: Pick<Me, "name" | "role"> & { image?: string | null }
  className?: string
}) {
  const locale = useLocale()
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center overflow-hidden bg-primary text-[13px] font-extrabold text-primary-foreground",
        isOrganization(user) ? "rounded-lg" : "rounded-full",
        className
      )}
    >
      {user.image ? (
        // eslint-disable-next-line @next/next/no-img-element -- depo adresi (avatars/) ya da Google profil fotoğrafı
        <img src={user.image} alt="" className="size-full object-cover" />
      ) : (
        initials(user.name, locale)
      )}
    </span>
  )
}
