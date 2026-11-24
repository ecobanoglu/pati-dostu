import {
  CopyObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  NotFound,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { Injectable } from "@nestjs/common"

import { env } from "../config/env.js"

/** İmzalı yükleme adresinin geçerlilik süresi (saniye). */
const UPLOAD_URL_TTL = 10 * 60

export type PresignedUpload = {
  /** Depodaki nesne anahtarı (ör. tmp/listing-images/{userId}/{uuid}.jpg); ilan kaydedilirken API'ye geri gönderilir. */
  key: string
  /** Tarayıcının PUT isteği atacağı imzalı adres. */
  uploadUrl: string
  /** PUT isteğinde aynen gönderilmesi gereken başlıklar (imzaya dahildir). */
  headers: Record<string, string>
  expiresAt: string
}

export type StoredObject = { size: number; contentType: string | undefined }

/**
 * S3 uyumlu dosya deposu: yerelde RustFS, yayında Cloudflare R2. Kod ikisinde de aynıdır; yalnızca .env değişir.
 * Dosyalar API'den geçmez: tarayıcı imzalı URL ile doğrudan depoya yükler, API yalnızca imzalar ve doğrular.
 */
@Injectable()
export class StorageService {
  private readonly s3 = new S3Client({
    endpoint: env.S3_ENDPOINT,
    region: env.S3_REGION,
    credentials: { accessKeyId: env.S3_ACCESS_KEY_ID, secretAccessKey: env.S3_SECRET_ACCESS_KEY },
    // RustFS ve R2 için yol tabanlı adres (endpoint/bucket/key)
    forcePathStyle: true,
  })

  /**
   * Tek bir dosya için imzalı PUT adresi üretir. İçerik türü ve boyutu imzaya girer: tarayıcı farklı türde
   * ya da beyan ettiğinden büyük dosya gönderirse depo isteği reddeder (R2 imzalı POST'u desteklemediği için
   * boyut sınırı bu yolla uygulanır).
   */
  async presignPut(key: string, contentType: string, size: number): Promise<PresignedUpload> {
    const command = new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
      ContentType: contentType,
      ContentLength: size,
    })
    const uploadUrl = await getSignedUrl(this.s3, command, {
      expiresIn: UPLOAD_URL_TTL,
      // Content-Length imzaya zorla dahil edilir (varsayılanda imzalanmaz).
      signableHeaders: new Set(["content-type", "content-length"]),
    })
    return {
      key,
      uploadUrl,
      headers: { "Content-Type": contentType },
      expiresAt: new Date(Date.now() + UPLOAD_URL_TTL * 1000).toISOString(),
    }
  }

  /** Nesnenin boyutu ve türü; yoksa null (yükleme yapılmamış ya da silinmiş). */
  async head(key: string): Promise<StoredObject | null> {
    try {
      const res = await this.s3.send(new HeadObjectCommand({ Bucket: env.S3_BUCKET, Key: key }))
      return { size: res.ContentLength ?? 0, contentType: res.ContentType }
    } catch (error) {
      if (error instanceof NotFound || (error as { name?: string }).name === "NotFound") return null
      throw error
    }
  }

  /** Nesneyi yeni anahtara kopyalar ve eskisini siler (tmp/ → listings/). */
  async move(from: string, to: string): Promise<void> {
    await this.s3.send(
      new CopyObjectCommand({ Bucket: env.S3_BUCKET, CopySource: `${env.S3_BUCKET}/${from}`, Key: to })
    )
    await this.delete(from)
  }

  /** Nesneyi siler (yoksa hata vermez). */
  async delete(key: string): Promise<void> {
    await this.s3.send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key: key }))
  }

  /** Herkese açık nesnenin adresi (yalnızca listings/ gibi okuma izni olan önekler için çalışır). */
  publicUrl(key: string): string {
    return `${env.S3_PUBLIC_URL}/${key}`
  }
}
