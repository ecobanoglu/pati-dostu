"use client"

/** Yüklemeden önce fotoğrafın uzun kenarı en fazla bu kadar piksele indirilir (ilan detayı ve paylaşım görseli için yeterli). */
const MAX_DIMENSION = 2048
const JPEG_QUALITY = 0.85

export class ImageDecodeError extends Error {}

/**
 * Seçilen fotoğrafı yüklemeye hazırlar: tarayıcıda açar (EXIF yönünü uygular), uzun kenarı 2048 px'e küçültür ve
 * JPEG'e çevirir. Telefon fotoğrafları böylece ~10 MB'tan ~1 MB'a iner; HEIC (iPhone) tarayıcı açabiliyorsa JPEG'e
 * dönüşür. Şeffaf PNG'lerde zemin beyaz yapılır (JPEG şeffaflık taşımaz).
 * Tarayıcı dosyayı açamazsa (ör. Windows Chrome'da HEIC) ImageDecodeError fırlatır.
 */
export async function prepareImage(file: File): Promise<Blob> {
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" })
  } catch {
    throw new ImageDecodeError(file.name)
  }

  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = new OffscreenCanvas(width, height)
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new ImageDecodeError(file.name)
  ctx.fillStyle = "#ffffff"
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  return canvas.convertToBlob({ type: "image/jpeg", quality: JPEG_QUALITY })
}

/**
 * Dosyayı imzalı adrese PUT ile gönderir; ilerlemeyi 0–1 arasında bildirir (fetch yükleme ilerlemesi vermediği için XHR).
 * Depo isteği reddederse (imza süresi dolmuş, boyut/tür uyuşmuyor) hata fırlatır.
 */
export function putWithProgress(
  url: string,
  body: Blob,
  headers: Record<string, string>,
  onProgress: (fraction: number) => void,
  signal?: AbortSignal
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open("PUT", url)
    for (const [name, value] of Object.entries(headers)) xhr.setRequestHeader(name, value)
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total)
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`PUT ${xhr.status}`)))
    xhr.onerror = () => reject(new Error("PUT network"))
    xhr.onabort = () => reject(new DOMException("Aborted", "AbortError"))
    signal?.addEventListener("abort", () => xhr.abort())
    xhr.send(body)
  })
}
