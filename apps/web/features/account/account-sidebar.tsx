import { getTranslations } from "next-intl/server"

import { UserAvatar } from "@/components/layout/user-avatar"
import { VerifiedOrgBadge } from "@/components/layout/verified-org-badge"
import { getCurrentUser } from "@/lib/session"

import { AccountNav } from "./account-nav"

/**
 * Hesabım sol kutusu (yalnızca masaüstü): kullanıcının adı, hesap türü (kurumda "Doğrulanmış" rozetiyle) ve menü. Oturum yoksa hiçbir şey çizmez
 * (sayfanın kendisi girişe yönlendirir). cookies() okuduğu için düzende <Suspense> içinde render edilir.
 */
export async function AccountSidebar() {
  const user = await getCurrentUser()
  if (!user) return null
  const t = await getTranslations("Account")

  return (
    <div className="rounded-card border border-border bg-background p-4">
      <div className="mb-3 flex items-center gap-3 border-b border-border px-2 pt-1 pb-4">
        <UserAvatar user={user} className="size-12 text-base" />
        <div className="min-w-0">
          <p className="truncate font-extrabold text-heading">{user.name}</p>
          {user.role === "clinic" || user.role === "shelter" ? (
            <VerifiedOrgBadge role={user.role} className="text-sm" />
          ) : (
            <p className="truncate text-sm text-body">{t(`role.${user.role}`)}</p>
          )}
        </div>
      </div>
      <AccountNav />
    </div>
  )
}

/** Kenar kutusu yüklenirken aynı boyutta iskelet (yerleşim kaymasın). */
export function AccountSidebarFallback() {
  return <div aria-hidden="true" className="h-[480px] rounded-card border border-border bg-background" />
}
