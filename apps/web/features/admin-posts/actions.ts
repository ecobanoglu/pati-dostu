"use server"

import { updateTag } from "next/cache"

import { getCurrentUser } from "@/lib/session"

/**
 * Yazı kaydedilince / silinince herkese açık blog ve haber önbelleğini (`posts` etiketi: liste, detay) hemen
 * geçersiz kılar — yayın değişikliği beklemeden sitede görünsün. Yalnız admin çağırabilir (diğerlerinde bir şey yapmaz).
 */
export async function refreshPublicPosts(): Promise<void> {
  const user = await getCurrentUser()
  if (user?.role !== "admin") return
  updateTag("posts")
}
