import { z } from "zod"

import { ValidationCode as C } from "./codes.js"

/** İlan başına en fazla fotoğraf. */
export const MAX_LISTING_IMAGES = 5

/** Kullanıcının seçebileceği dosyanın en büyük boyutu (tarayıcı küçültmeden önce): 10 MB. */
export const MAX_IMAGE_SOURCE_BYTES = 10 * 1024 * 1024

/** Depoya yüklenebilecek görselin en büyük boyutu (tarayıcıda küçültülmüş hâli de bu sınırın altında kalır). */
export const MAX_IMAGE_UPLOAD_BYTES = 10 * 1024 * 1024

/**
 * Depoya yüklenebilecek görsel türleri. HEIC (iPhone) seçilebilir ama tarayıcı onu JPEG'e çevirerek yükler:
 * HEIC'i çoğu tarayıcı gösteremez, bu yüzden depoda yalnızca bu üç tür bulunur.
 */
export const imageContentTypes = ["image/jpeg", "image/png", "image/webp"] as const
export type ImageContentType = (typeof imageContentTypes)[number]

/** İçerik türüne göre dosya uzantısı (depo anahtarında kullanılır). */
export const imageExtensions: Record<ImageContentType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
}

/** POST /uploads/listing-image isteği: yüklenecek dosyanın türü ve bayt cinsinden boyutu (imzaya girer). */
export const imageUploadRequestSchema = z.object({
  contentType: z.enum(imageContentTypes, C.IMAGE_TYPE_NOT_ALLOWED),
  size: z.number().int().positive().max(MAX_IMAGE_UPLOAD_BYTES, C.IMAGE_TOO_LARGE),
})
export type ImageUploadRequest = z.infer<typeof imageUploadRequestSchema>
