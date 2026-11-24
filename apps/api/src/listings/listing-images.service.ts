import { randomUUID } from "node:crypto"

import { HttpStatus, Injectable, Logger } from "@nestjs/common"
import { type Database, listingImage } from "@pati-dostu/db"
import {
  type ImageContentType,
  imageContentTypes,
  imageExtensions,
  MAX_IMAGE_UPLOAD_BYTES,
} from "@pati-dostu/validators"
import { asc, eq } from "drizzle-orm"

import { AppException, ErrorCode } from "../common/errors.js"
import { StorageService } from "../storage/storage.service.js"
import { TMP_LISTING_IMAGES } from "../uploads/uploads.controller.js"

/** Drizzle işlem (transaction) nesnesi ya da veritabanının kendisi. */
type Executor = Pick<Database, "select" | "insert" | "update" | "delete">

/** Dosya türünü ilk baytlarından tanır (uzantıya ya da beyan edilen türe güvenmez). */
export function sniffImageType(bytes: Uint8Array): ImageContentType | null {
  const b = (i: number) => bytes[i] ?? -1
  if (b(0) === 0xff && b(1) === 0xd8 && b(2) === 0xff) return "image/jpeg"
  if (b(0) === 0x89 && b(1) === 0x50 && b(2) === 0x4e && b(3) === 0x47) return "image/png"
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.slice(from, to))
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp"
  return null
}

/** Bağlama sonucu: yeni sıra ve işlem tamamlanınca (commit sonrası) depodan silinecek eski dosyalar. */
export type ImageSyncPlan = {
  /** Sıralı anahtarlar (ilk = kapak); hepsi listings/{ilanId}/ altında. */
  keys: string[]
  /** Bu kayıtla ilandan çıkarılan fotoğraflar; veritabanı işlemi başarılı olduktan sonra depodan silinir. */
  removedKeys: string[]
}

/**
 * İlan fotoğraflarını ilana bağlar. İstemcinin gönderdiği sıralı anahtar listesi iki türde olabilir:
 * - yeni yükleme: tmp/listing-images/{oturumdaki kullanıcı}/… → doğrulanır ve listings/{ilanId}/ altına taşınır;
 * - mevcut fotoğraf: listings/{ilanId}/… → yalnızca o ilanın kayıtlı fotoğraflarından biriyse kabul edilir.
 * Listede olmayan mevcut fotoğraflar ilandan çıkarılır.
 */
@Injectable()
export class ListingImagesService {
  private readonly logger = new Logger(ListingImagesService.name)

  constructor(private readonly storage: StorageService) {}

  /**
   * Yeni yüklemeleri doğrulayıp taşır ve yeni sırayı hesaplar (veritabanına yazmaz).
   * Geçersiz anahtarda IMAGE_INVALID fırlatır; o ana kadar taşınanlar listings/ altında kalır (sonraki kayıtta temizlenir).
   */
  async prepare(db: Executor, listingId: string, ownerId: string, requested: string[]): Promise<ImageSyncPlan> {
    if (new Set(requested).size !== requested.length) throw this.invalid("duplicate")

    const existing = await this.currentKeys(db, listingId)
    const ownTmp = `${TMP_LISTING_IMAGES}/${ownerId}/`
    const keys: string[] = []

    for (const key of requested) {
      if (existing.includes(key)) {
        keys.push(key)
      } else if (key.startsWith(ownTmp) && !key.slice(ownTmp.length).includes("/")) {
        keys.push(await this.promote(key, listingId))
      } else {
        throw this.invalid("foreign")
      }
    }

    return { keys, removedKeys: existing.filter((k) => !keys.includes(k)) }
  }

  /** Planı veritabanına yazar: ilanın fotoğraf satırlarını yeni sıra ve kapakla değiştirir (işlem içinde çağrılır). */
  async write(db: Executor, listingId: string, keys: string[]): Promise<void> {
    await db.delete(listingImage).where(eq(listingImage.listingId, listingId))
    if (keys.length === 0) return
    await db
      .insert(listingImage)
      .values(keys.map((url, index) => ({ listingId, url, sortOrder: index, isCover: index === 0 })))
  }

  /** Commit sonrası: ilandan çıkarılan dosyaları depodan siler (hata olursa yalnızca günlüğe yazar). */
  async cleanup(removedKeys: string[]): Promise<void> {
    await Promise.all(
      removedKeys.map((key) =>
        this.storage.delete(key).catch((error) => this.logger.warn(`Silinemedi: ${key} (${String(error)})`))
      )
    )
  }

  /** İlanın kayıtlı fotoğraf anahtarları, sırasıyla. */
  async currentKeys(db: Executor, listingId: string): Promise<string[]> {
    const rows = await db
      .select({ url: listingImage.url })
      .from(listingImage)
      .where(eq(listingImage.listingId, listingId))
      .orderBy(asc(listingImage.sortOrder))
    return rows.map((r) => r.url)
  }

  /** Geçici yüklemeyi doğrular (var mı, boyut, gerçek dosya türü) ve ilanın klasörüne taşır. */
  private async promote(tmpKey: string, listingId: string): Promise<string> {
    const head = await this.storage.head(tmpKey)
    if (!head) throw this.invalid("missing")
    if (head.size <= 0 || head.size > MAX_IMAGE_UPLOAD_BYTES) throw this.invalid("size")

    const sniffed = sniffImageType(await this.storage.readStart(tmpKey, 12))
    if (!sniffed || !(imageContentTypes as readonly string[]).includes(head.contentType ?? "")) {
      throw this.invalid("type")
    }

    const finalKey = `listings/${listingId}/${randomUUID()}.${imageExtensions[sniffed]}`
    await this.storage.move(tmpKey, finalKey)
    return finalKey
  }

  /** IMAGE_INVALID hatası; `reason` istemcide gösterilmez, sorun ayıklamak içindir. */
  private invalid(reason: "duplicate" | "foreign" | "missing" | "size" | "type") {
    return new AppException(HttpStatus.BAD_REQUEST, ErrorCode.IMAGE_INVALID, "Fotoğraf geçersiz.", { reason })
  }
}
