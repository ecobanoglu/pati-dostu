/**
 * Form doğrulama hata kodları. Zod şemalarında `message` olarak bu kodlar kullanılır; web ve mobil kodu
 * kendi dil dosyasından çevirir (apps/web/messages/*.json › Errors). Böylece aynı şema her dilde çalışır.
 */
export const ValidationCode = {
  REQUIRED: "REQUIRED",
  EMAIL_INVALID: "EMAIL_INVALID",
  NAME_TOO_SHORT: "NAME_TOO_SHORT",
  NAME_TOO_LONG: "NAME_TOO_LONG",
  PASSWORD_WEAK: "PASSWORD_WEAK",
  PASSWORDS_DO_NOT_MATCH: "PASSWORDS_DO_NOT_MATCH",
  PHONE_INVALID: "PHONE_INVALID",
  CITY_INVALID: "CITY_INVALID",
  TERMS_NOT_ACCEPTED: "TERMS_NOT_ACCEPTED",
} as const

export type ValidationCode = (typeof ValidationCode)[keyof typeof ValidationCode]
