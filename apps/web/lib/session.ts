import "server-only"

import { cookies } from "next/headers"
import { cache } from "react"

import { API_URL, type Me } from "./api"

/** Better Auth oturum cookie'si (cookiePrefix "pati-dostu"; HTTPS'te __Secure- önekiyle). */
const SESSION_COOKIES = ["pati-dostu.session_token", "__Secure-pati-dostu.session_token"]

/**
 * Giriş yapmış kullanıcıyı API'den alır (GET /api/v1/me, tarayıcının cookie'leri iletilerek).
 * Oturum cookie'si yoksa API'ye hiç gitmeden null döner. Aynı istekte birden çok çağrı tek fetch'e iner (React cache).
 * cookies() okuduğu için bunu kullanan bileşen <Suspense> içinde olmalıdır (Cache Components).
 */
export const getCurrentUser = cache(async (): Promise<Me | null> => {
  const store = await cookies()
  if (!SESSION_COOKIES.some((name) => store.has(name))) return null

  try {
    const res = await fetch(`${API_URL}/api/v1/me`, {
      headers: { cookie: store.toString() },
      cache: "no-store",
    })
    if (!res.ok) return null
    return (await res.json()) as Me
  } catch {
    // API kapalıysa site misafir görünümüyle çalışmaya devam eder.
    return null
  }
})
