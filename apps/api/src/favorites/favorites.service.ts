import { Injectable } from "@nestjs/common"
import { type Database, favorite, listing } from "@pati-dostu/db"
import { and, desc, eq, inArray, isNull } from "drizzle-orm"

import { InjectDb } from "../database/database.module.js"
import { ListingsService } from "../listings/listings.service.js"
import type { ListingCard } from "../listings/listings.dto.js"

type Locale = "tr" | "en"

/** Favoriler listesinde görünen durumlar (içeriği onaylanmış olanlar). */
const VISIBLE = ["active", "adopted", "closed"] as const

/**
 * Favoriler: kullanıcı yayındaki ilanı favoriye ekler, istediği zaman çıkarır. Favorideki ilan sonradan yayından
 * kalkarsa (sahiplendirildi, kapatıldı) listede durumuyla kalır; silinen ilan listeden düşer.
 */
@Injectable()
export class FavoritesService {
  constructor(
    @InjectDb() private readonly db: Database,
    private readonly listings: ListingsService
  ) {}

  /** Favoriye ekler (zaten ekliyse bir şey yapmaz). Yalnızca yayındaki ilan eklenebilir; değilse 404. */
  async add(userId: string, ref: string): Promise<void> {
    const [row] = await this.db
      .select({ id: listing.id })
      .from(listing)
      .where(and(this.listings.refCondition(ref), eq(listing.status, "active"), isNull(listing.deletedAt)))
    if (!row) throw this.listings.notFound()
    await this.db.insert(favorite).values({ userId, listingId: row.id }).onConflictDoNothing()
  }

  /** Favoriden çıkarır (ilanın durumu ne olursa olsun; favoride değilse de hata vermez). */
  async remove(userId: string, ref: string): Promise<void> {
    const [row] = await this.db.select({ id: listing.id }).from(listing).where(this.listings.refCondition(ref))
    if (!row) return
    await this.db.delete(favorite).where(and(eq(favorite.userId, userId), eq(favorite.listingId, row.id)))
  }

  /**
   * Kullanıcının favori ilanları, en son eklenen önce: yayındakiler + sahiplendirilen/kapatılanlar (soluk gösterilir).
   * Onay bekleyen / düzeltme istenen / reddedilen ilan gösterilmez: düzenlenmiş içeriği henüz onaylanmadı (onay
   * akışı favoriler üzerinden atlanmasın). Yeniden yayına girince listede tekrar görünür.
   */
  async list(userId: string, locale: Locale): Promise<ListingCard[]> {
    const rows = await this.listings
      .cardQuery()
      .innerJoin(favorite, and(eq(favorite.listingId, listing.id), eq(favorite.userId, userId)))
      .where(and(isNull(listing.deletedAt), inArray(listing.status, VISIBLE)))
      .orderBy(desc(favorite.createdAt))
    return rows.map((r) => this.listings.toCard(r, locale))
  }

  /** Favorideki ilanların numaraları: liste ve detay sayfalarındaki kalplerin dolu/boş hâli için. */
  async listingNos(userId: string): Promise<number[]> {
    const rows = await this.db
      .select({ no: listing.listingNo })
      .from(favorite)
      .innerJoin(listing, eq(listing.id, favorite.listingId))
      .where(and(eq(favorite.userId, userId), isNull(listing.deletedAt)))
    return rows.map((r) => r.no)
  }
}
