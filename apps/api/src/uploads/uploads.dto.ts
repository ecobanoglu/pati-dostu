import { imageUploadRequestSchema } from "@pati-dostu/validators"
import { createZodDto } from "nestjs-zod"
import { z } from "zod"

/** Yüklenecek görselin türü ve boyutu (bayt). */
export class ImageUploadRequestDto extends createZodDto(imageUploadRequestSchema) {}

export const presignedUploadSchema = z
  .object({
    /** Depodaki geçici anahtar; ilan kaydedilirken `images` listesinde geri gönderilir. */
    key: z.string(),
    /** Tarayıcının dosyayı PUT ile göndereceği imzalı adres. */
    uploadUrl: z.url(),
    /** PUT isteğine aynen eklenecek başlıklar. */
    headers: z.record(z.string(), z.string()),
    expiresAt: z.iso.datetime(),
  })
  .meta({ id: "PresignedUpload" })

export class PresignedUploadDto extends createZodDto(presignedUploadSchema) {}

/** Blog / haber görseli yüklemesi: imzalı adres + yüklenince görselin herkese açık adresi. */
export class PostImageUploadDto extends createZodDto(
  presignedUploadSchema.extend({ url: z.url() }).meta({ id: "PostImageUpload" })
) {}
