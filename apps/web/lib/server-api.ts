import "server-only"

import { cookies } from "next/headers"

import { API_URL } from "./api"

/**
 * Sunucudan (Server Component) giriş yapmış kullanıcı adına API çağrısı: tarayıcının cookie'leri iletilir.
 * Önbelleğe alınmaz. 404 ise null döner; diğer hatalar istisna fırlatır (error.tsx yakalar).
 * cookies() okuduğu için çağıran bileşen <Suspense> içinde olmalıdır (Cache Components).
 */
export async function apiServer<T>(path: string): Promise<T | null> {
  const store = await cookies()
  const res = await fetch(`${API_URL}/api/v1${path}`, {
    headers: { cookie: store.toString() },
    cache: "no-store",
  })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`API ${path}: ${res.status}`)
  return (await res.json()) as T
}
