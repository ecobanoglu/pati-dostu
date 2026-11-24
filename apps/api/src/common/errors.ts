import { HttpException, HttpStatus } from "@nestjs/common"

/**
 * API'nin döndürdüğü hata kodları. İstemciler (web, mobil) kullanıcıya gösterilecek metni bu koda göre
 * kendi dil dosyalarından seçer (apps/web/messages/*.json › Errors). `message` alanı yalnızca Türkçe
 * varsayılan metindir; arayüzde doğrudan gösterilmemelidir.
 *
 * Yeni kod eklerken web'deki Errors çevirilerini de ekleyin.
 * Better Auth uçları (/api/auth/*) kendi kodlarını da döndürür (ör. EMAIL_NOT_VERIFIED).
 */
export const ErrorCode = {
  BAD_REQUEST: "BAD_REQUEST",
  VALIDATION_FAILED: "VALIDATION_FAILED",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  ACCOUNT_BANNED: "ACCOUNT_BANNED",
  NOT_FOUND: "NOT_FOUND",
  TOO_MANY_REQUESTS: "TOO_MANY_REQUESTS",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  // Kayıt / profil
  TERMS_NOT_ACCEPTED: "TERMS_NOT_ACCEPTED",
  PASSWORD_WEAK: "PASSWORD_WEAK",
  PHONE_INVALID: "PHONE_INVALID",
  CITY_INVALID: "CITY_INVALID",
  LOCALE_INVALID: "LOCALE_INVALID",
  /** E-postası doğrulanmamış kullanıcı içerik oluşturamaz (ilan, fotoğraf). */
  EMAIL_NOT_VERIFIED: "EMAIL_NOT_VERIFIED",
  // Dosya yükleme
  IMAGE_TYPE_NOT_ALLOWED: "IMAGE_TYPE_NOT_ALLOWED",
  IMAGE_TOO_LARGE: "IMAGE_TOO_LARGE",
  /**
   * İçerik filtresine takıldı (kaydedilmedi). details.reason: phone | email | url | iban | price | duplicate |
   * banned_term; details.field: takılan alan (ör. title, description). Web: Errors.CONTENT_BLOCKED_<REASON>.
   */
  CONTENT_BLOCKED: "CONTENT_BLOCKED",
} as const

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode]

/** Tüm hata yanıtlarının biçimi. */
export type ErrorBody = {
  statusCode: number
  code: string
  message: string
  /** VALIDATION_FAILED: alan bazında ayrıntılar (Zod issue'ları). */
  errors?: unknown[]
  /** Koda özgü ek bilgi; ör. CONTENT_BLOCKED → { reason: "phone", field: "description" }. */
  details?: Record<string, unknown>
}

/** HTTP durumundan varsayılan hata kodu (kodu belirtilmemiş hatalar için). */
export function defaultCodeForStatus(status: number): ErrorCode {
  switch (status) {
    case HttpStatus.BAD_REQUEST:
      return ErrorCode.BAD_REQUEST
    case HttpStatus.UNAUTHORIZED:
      return ErrorCode.UNAUTHORIZED
    case HttpStatus.FORBIDDEN:
      return ErrorCode.FORBIDDEN
    case HttpStatus.NOT_FOUND:
      return ErrorCode.NOT_FOUND
    case HttpStatus.TOO_MANY_REQUESTS:
      return ErrorCode.TOO_MANY_REQUESTS
    default:
      return status >= 500 ? ErrorCode.INTERNAL_ERROR : ErrorCode.BAD_REQUEST
  }
}

/** Kodlu uygulama hatası: throw new AppException(HttpStatus.FORBIDDEN, ErrorCode.ACCOUNT_BANNED, "Hesabınız askıya alınmış.") */
export class AppException extends HttpException {
  constructor(status: HttpStatus, code: ErrorCode, message: string, details?: Record<string, unknown>) {
    super({ statusCode: status, code, message, ...(details ? { details } : {}) } satisfies ErrorBody, status)
  }
}
