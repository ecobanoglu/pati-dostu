import { randomUUID } from "node:crypto"

import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common"
import { ApiCookieAuth, ApiOperation, ApiTags } from "@nestjs/swagger"
import { imageExtensions } from "@pati-dostu/validators"
import { ZodResponse } from "nestjs-zod"

import type { AuthSession } from "../auth/auth.js"
import { CurrentSession } from "../auth/decorators.js"
import { AppException, ErrorCode } from "../common/errors.js"
import { StorageService } from "../storage/storage.service.js"
import { TMP_AVATARS } from "../users/profile.service.js"
import { ImageUploadRequestDto, PresignedUploadDto } from "./uploads.dto.js"

/** Henüz bir ilana bağlanmamış yüklemelerin öneki; okuma izni yoktur. R2'de bu önek için 1 günlük silme kuralı kurulur. */
export const TMP_LISTING_IMAGES = "tmp/listing-images"
/** Topluluk konusu fotoğraflarının geçici öneki; konu açılınca forum/{konuId}/ altına taşınır. */
export const TMP_TOPIC_IMAGES = "tmp/topic-images"

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

  /**
   * Topluluk konusu fotoğrafı için imzalı yükleme adresi (tmp/topic-images/{userId}/…; en fazla 3, konu açılınca
   * doğrulanıp forum/{konuId}/ altına taşınır). E-postası doğrulanmamış kullanıcı konu açamayacağı için yükleyemez.
   */
  @Post("topic-image")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Topluluk konusu fotoğrafı için imzalı yükleme adresi" })
  @ZodResponse({ status: 201, type: PresignedUploadDto })
  async topicImage(
    @CurrentSession() session: AuthSession,
    @Body() { contentType, size }: ImageUploadRequestDto
  ): Promise<PresignedUploadDto> {
    if (!session.user.emailVerified) {
      throw new AppException(HttpStatus.FORBIDDEN, ErrorCode.EMAIL_NOT_VERIFIED, "E-posta adresiniz doğrulanmamış.")
    }
    const key = `${TMP_TOPIC_IMAGES}/${session.user.id}/${randomUUID()}.${imageExtensions[contentType]}`
    return this.storage.presignPut(key, contentType, size)
  }

  /**
   * Profil fotoğrafı için imzalı yükleme adresi (tmp/avatars/{userId}/…). Tarayıcı fotoğrafı küçültüp yükler,
   * ardından PUT /me/avatar ile profile bağlar.
   */
  @Post("avatar")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Profil fotoğrafı için imzalı yükleme adresi" })
  @ZodResponse({ status: 201, type: PresignedUploadDto })
  avatar(
    @CurrentSession() session: AuthSession,
    @Body() { contentType, size }: ImageUploadRequestDto
  ): Promise<PresignedUploadDto> {
    const key = `${TMP_AVATARS}/${session.user.id}/${randomUUID()}.${imageExtensions[contentType]}`
    return this.storage.presignPut(key, contentType, size)
  }
}
