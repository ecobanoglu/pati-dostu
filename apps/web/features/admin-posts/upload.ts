"use client"

import { MAX_IMAGE_SOURCE_BYTES } from "@pati-dostu/validators"

import { ImageDecodeError, prepareImage, putWithProgress } from "@/components/form/image-processing"
import { apiFetch } from "@/lib/api-browser"

/** Seçilebilen görsel türleri (HEIC tarayıcıda JPEG'e çevrilir). */
export const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"

/** Yükleme hatası: `code` Errors çevirisinin anahtarıdır. */
export class UploadError extends Error {
  constructor(readonly code: string) {
    super(code)
  }
}

type PostImageUpload = { key: string; url: string; uploadUrl: string; headers: Record<string, string> }

/**
 * Blog / haber görselini yükler (kapak ya da içerik): tarayıcıda 2048 px JPEG'e küçültür, imzalı adresi alır
 * (POST /uploads/post-image — yalnız admin), dosyayı doğrudan depoya gönderir. Depo anahtarını ve herkese açık
 * adresi döndürür. Hata kodları: IMAGE_TOO_LARGE, IMAGE_UNREADABLE, UPLOAD_FAILED ya da API'nin kodu.
 */
export async function uploadPostImage(
  file: File,
  onProgress: (fraction: number) => void
): Promise<{ key: string; url: string }> {
  if (file.size > MAX_IMAGE_SOURCE_BYTES) throw new UploadError("IMAGE_TOO_LARGE")
  let blob: Blob
  try {
    blob = await prepareImage(file)
  } catch (error) {
    throw new UploadError(error instanceof ImageDecodeError ? "IMAGE_UNREADABLE" : "UNKNOWN")
  }
  const { data, error } = await apiFetch<PostImageUpload>("/uploads/post-image", {
    method: "POST",
    body: JSON.stringify({ contentType: blob.type || "image/jpeg", size: blob.size }),
  })
  if (error) throw new UploadError(error.code)
  try {
    await putWithProgress(data.uploadUrl, blob, data.headers, onProgress)
  } catch {
    throw new UploadError("UPLOAD_FAILED")
  }
  return { key: data.key, url: data.url }
}
