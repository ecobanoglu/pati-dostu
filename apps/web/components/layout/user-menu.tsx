"use client"

import { ChevronDown, LogOut } from "lucide-react"
import { useTranslations } from "next-intl"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Link } from "@/i18n/navigation"
import type { Me } from "@/lib/api"

import { accountLinks, isOrganization, organizationApplyIcon as ApplyIcon } from "./account-links"
import { UserAvatar } from "./user-avatar"
import { useSignOut } from "./use-sign-out"

const itemClass = "min-h-11 gap-3 rounded-md px-3 text-[15px] font-bold text-heading [&_svg]:size-[18px]"

/**
 * Masaüstü profil menüsü (avatar + ilk ad). Esc veya dışarı tıklayınca kapanır; klavyeyle gezilebilir (Base UI Menu).
 * Bireysel hesap: panel bağlantıları + kurumsal başvuru; kurum hesabı: kurum paneli bağlantıları.
 */
export function UserMenu({ user }: { user: Me }) {
  const t = useTranslations("UserMenu")
  const { signOut, pending, error } = useSignOut()
  const firstName = user.name.split(/\s+/)[0] ?? user.name
  const org = isOrganization(user)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t("open")}
        className="inline-flex min-h-tap items-center gap-2 rounded-full border border-border py-1 pr-3 pl-1 text-[15px] font-bold text-heading transition-colors hover:border-primary data-popup-open:border-primary data-popup-open:bg-smoke focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <UserAvatar user={user} className="size-8 text-xs" />
        <span className="max-w-32 truncate">{firstName}</span>
        <ChevronDown aria-hidden="true" className="size-4" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={8} className="w-80 rounded-card p-2 shadow-pop">
        <div className="flex items-center gap-3 px-3 pt-2 pb-3">
          <UserAvatar user={user} className="size-11 text-base" />
          <div className="min-w-0">
            <p className="truncate font-extrabold text-heading">{user.name}</p>
            <p className="truncate text-xs text-body">
              {org ? t(user.role === "clinic" ? "clinicAccount" : "shelterAccount") : user.email}
            </p>
          </div>
        </div>
        <DropdownMenuSeparator />

        {accountLinks(user).map(({ href, key, icon: Icon }) => (
          <DropdownMenuItem key={href} className={itemClass} render={<Link href={href} />}>
            <Icon aria-hidden="true" />
            {t(key)}
          </DropdownMenuItem>
        ))}

        {user.role === "user" && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className={`${itemClass} text-primary`}
              render={<Link href="/account/organization-application" />}
            >
              <ApplyIcon aria-hidden="true" />
              {t("applyOrganization")}
            </DropdownMenuItem>
          </>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem
          className={`${itemClass} text-destructive`}
          disabled={pending}
          onClick={signOut}
          closeOnClick={false}
        >
          <LogOut aria-hidden="true" />
          {t("signOut")}
        </DropdownMenuItem>
        {error && (
          <p role="alert" className="px-3 pb-2 text-sm text-destructive">
            {error}
          </p>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
