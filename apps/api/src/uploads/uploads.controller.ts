import { randomUUID } from "node:crypto"

import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common"
import { ApiCookieAuth, ApiOperation, ApiTags } from "@nestjs/swagger"
import { imageExtensions } from "@pati-dostu/validators"
import { ZodResponse } from "nestjs-zod"

import type { AuthSession } from "../auth/auth.js"
import { CurrentSession } from "../auth/decorators.js"
import { AppException, ErrorCode } from "../common/errors.js"
import { StorageService } from "../storage/storage.service.js"
import { ImageUploadRequestDto, PresignedUploadDto } from "./uploads.dto.js"

/** Henüz bir ilana bağlanmamış yüklemelerin öneki; okuma izni yoktur. R2'de bu önek için 1 günlük silme kuralı kurulur. */
export const TMP_LISTING_IMAGES = "tmp/listing-images"

@ApiTags("uploads")
@ApiCookieAuth()
@Controller("uploads")
export class UploadsController {
  constructor(private readonly storage: StorageService) {}

  /**
   * İlan fotoğrafı için imzalı yükleme adresi verir. Dosya kullanıcıya özel geçici alana yüklenir
   * (tmp/listing-images/{userId}/…); ilan kaydedilince API doğrulayıp listings/{ilanId}/ altına taşır.
   * E-postası doğrulanmamış kullanıcı ilan veremeyeceği için fotoğraf da yükleyemez.
   */
  @Post("listing-image")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "İlan fotoğrafı için imzalı yükleme adresi" })
  @ZodResponse({ status: 201, type: PresignedUploadDto })
  async listingImage(
    @CurrentSession() session: AuthSession,
    @Body() { contentType, size }: ImageUploadRequestDto
  ): Promise<PresignedUploadDto> {
    if (!session.user.emailVerified) {
      throw new AppException(HttpStatus.FORBIDDEN, ErrorCode.EMAIL_NOT_VERIFIED, "E-posta adresiniz doğrulanmamış.")
    }
    const key = `${TMP_LISTING_IMAGES}/${session.user.id}/${randomUUID()}.${imageExtensions[contentType]}`
    return this.storage.presignPut(key, contentType, size)
  }
}
