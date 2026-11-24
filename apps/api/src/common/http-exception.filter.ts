import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException, HttpStatus, Logger } from "@nestjs/common"
import type { Response } from "express"
import { ZodValidationException } from "nestjs-zod"

import { defaultCodeForStatus, type ErrorBody, ErrorCode } from "./errors.js"

/**
 * Tüm hataları tek biçime çevirir: { statusCode, code, message, errors? }.
 * İstemciler `code`'a göre çeviri gösterir. Beklenmeyen hataların ayrıntısı istemciye sızdırılmaz, günlüğe yazılır.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name)

  /** Hatayı ErrorBody'ye dönüştürüp yanıtı yazar. */
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>()
    const body = this.toBody(exception)
    response.status(body.statusCode).json(body)
  }

  /** Hata türüne göre durum kodu, hata kodu ve mesajı belirler. */
  private toBody(exception: unknown): ErrorBody {
    if (exception instanceof ZodValidationException) {
      const zodError = exception.getZodError() as { issues?: unknown[] }
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        code: ErrorCode.VALIDATION_FAILED,
        message: "Bazı alanlar hatalı.",
        errors: zodError.issues ?? [],
      }
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus()
      const res = exception.getResponse()
      const obj = typeof res === "object" && res !== null ? (res as Record<string, unknown>) : {}
      const message = typeof res === "string" ? res : typeof obj.message === "string" ? obj.message : exception.message
      const code = typeof obj.code === "string" ? obj.code : defaultCodeForStatus(status)
      const details =
        typeof obj.details === "object" && obj.details !== null ? (obj.details as Record<string, unknown>) : undefined
      return { statusCode: status, code, message, ...(details ? { details } : {}) }
    }

    this.logger.error(exception instanceof Error ? (exception.stack ?? exception.message) : String(exception))
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: ErrorCode.INTERNAL_ERROR,
      message: "Beklenmeyen bir hata oluştu.",
    }
  }
}
