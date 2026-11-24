"use client"

import { PUBLIC_API_URL } from "./api"

export type ApiError = { code: string; status: number; details?: Record<string, unknown> }
export type ApiResult<T> = { data: T; error: null } | { data: null; error: ApiError }

/**
 * Tarayıcıdan API'ye istek (oturum cookie'si gönderilir). Hata durumunda istisna fırlatmaz; API'nin hata kodunu
 * ({ code }) döndürür, arayüz bunu `useErrorMessage` ile çevirir. Ağ hatasında kod NETWORK_ERROR olur.
 * Not: packages/api-client (OpenAPI'den üretilen tipli istemci) gelince bunun yerini o alacak.
 */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<ApiResult<T>> {
  try {
    const res = await fetch(`${PUBLIC_API_URL}/api/v1${path}`, {
      ...init,
      credentials: "include",
      headers: { "content-type": "application/json", ...init.headers },
    })
    const body = (await res.json().catch(() => null)) as
      (T & { code?: string; details?: Record<string, unknown> }) | null
    if (!res.ok) {
      return { data: null, error: { code: body?.code ?? "UNKNOWN", status: res.status, details: body?.details } }
    }
    return { data: body as T, error: null }
  } catch {
    return { data: null, error: { code: "NETWORK_ERROR", status: 0 } }
  }
}
