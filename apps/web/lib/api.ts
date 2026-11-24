/**
 * API adresleri. Sunucuda (Server Component, Route Handler) API_URL, tarayıcıda NEXT_PUBLIC_API_URL kullanılır;
 * ikisi de tanımlı değilse yerel geliştirme adresi.
 */
export const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"

/** Tarayıcıdan erişilen API adresi (Better Auth istemcisi, istemci tarafı istekler). */
export const PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"

/** GET /api/v1/me yanıtı (apps/api/src/users/me.dto.ts ile aynı; ileride packages/api-client'tan gelecek). */
export type Me = {
  id: string
  name: string
  email: string
  emailVerified: boolean
  image: string | null
  role: "user" | "clinic" | "shelter" | "admin"
  phone: string | null
  cityId: string | null
  locale: "tr" | "en"
  marketingOptIn: boolean
  /** Yeni ilanlarda "Telefonumu göster" varsayılanı. */
  showPhoneByDefault: boolean
  bio: string | null
  /** Şifreli hesap mı (yalnız Google ile girişte false: şifre değiştirme yok). */
  hasPassword: boolean
  termsAcceptedAt: string | null
}
