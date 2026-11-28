"use server"

import { updateTag } from "next/cache"

import { getCurrentUser } from "@/lib/session"

/**
 * İlan kararından sonra herkese açık ilan önbelleğini (`listings` etiketi: listeler, detay, anasayfa) hemen
 * geçersiz kılar — onaylanan ilan beklemeden görünsün. Yalnız admin çağırabilir.
 */
export async function refreshListingCaches(): Promise<void> {
  const user = await getCurrentUser()
  if (user?.role !== "admin") return
  updateTag("listings")
}

/**
 * Topluluk yönetiminden sonra (silme, taşıma, sabitleme, kilitleme) herkese açık topluluk önbelleğini (`forum`
 * etiketi: kategori sayıları, konu listeleri, anasayfa bölümü) hemen geçersiz kılar. Yalnız admin çağırabilir.
 */
export async function refreshForumCaches(): Promise<void> {
  const user = await getCurrentUser()
  if (user?.role !== "admin") return
  updateTag("forum")
}
