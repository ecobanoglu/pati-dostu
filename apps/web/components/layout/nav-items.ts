import type { AppPathname } from "@/i18n/routing"

/** Ana menü (masaüstü üst menü ve mobil menü). `key`, messages › Nav altındaki çeviri anahtarıdır. */
export const mainNav = [
  { href: "/", key: "home" },
  { href: "/listings", key: "listings" },
  { href: "/community", key: "community" },
  { href: "/veterinarians", key: "veterinarians" },
  { href: "/blog", key: "blog" },
  { href: "/news", key: "news" },
] as const satisfies ReadonlyArray<{ href: AppPathname; key: string }>

/**
 * Bağlantı şu anki sayfaya mı ait? Anasayfa yalnızca tam eşleşmede, diğerleri alt sayfalarında da aktif sayılır
 * (/listings → /listings ve /listing/[slug] değil; ilan detayı ayrı bir yol).
 */
export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/"
  return pathname === href || pathname.startsWith(`${href}/`)
}
