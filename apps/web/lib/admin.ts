import "server-only"

import { notFound } from "next/navigation"
import { getLocale } from "next-intl/server"

import { redirect } from "@/i18n/navigation"

import type { Me } from "./api"
import { getCurrentUser } from "./session"

/**
 * Admin sayfalarının girişi: oturum yoksa (cookie süresi dolmuş) giriş sayfasına, admin değilse yumuşak 404 (sayfanın
 * varlığı belli olmasın). Asıl yetki kontrolü API'dedir; bu yalnız doğru ekranı göstermek içindir. cookies()
 * okuduğu için çağıran bileşen <Suspense> içinde olmalıdır.
 */
export async function requireAdmin(): Promise<Me> {
  const user = await getCurrentUser()
  if (!user) redirect({ href: "/sign-in", locale: await getLocale() })
  if (user!.role !== "admin") notFound()
  return user!
}
