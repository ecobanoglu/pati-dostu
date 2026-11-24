import { Injectable } from "@nestjs/common"
import { type Database, favorite, listing } from "@pati-dostu/db"
import { listingStatuses } from "@pati-dostu/validators"
import { and, count, eq, isNull, sql } from "drizzle-orm"

import { InjectDb } from "../database/database.module.js"
import type { MeSummaryDto } from "./me.dto.js"

/**
 * Hesabım › Panel özeti verisi: kullanıcının ilanlarının durumlara göre sayısı, toplam görüntülenme ve favori sayısı.
 * Tek istekte döner (web ve mobil aynı ucu kullanır). Silinen ilanlar sayılmaz.
 */
@Injectable()
export class MeSummaryService {
  constructor(@InjectDb() private readonly db: Database) {}

  /** Kullanıcının özetini hesaplar. */
  async summary(userId: string): Promise<MeSummaryDto> {
    const [byStatus, [fav], [views]] = await Promise.all([
      this.db
        .select({ status: listing.status, value: count() })
        .from(listing)
        .where(and(eq(listing.ownerId, userId), isNull(listing.deletedAt)))
        .groupBy(listing.status),
      this.db.select({ value: count() }).from(favorite).where(eq(favorite.userId, userId)),
      this.db
        .select({ value: sql<number>`coalesce(sum(${listing.viewCount}), 0)::int` })
        .from(listing)
        .where(and(eq(listing.ownerId, userId), isNull(listing.deletedAt))),
    ])
    const listings = Object.fromEntries(listingStatuses.map((s) => [s, 0])) as MeSummaryDto["listings"]
    for (const row of byStatus) listings[row.status] = row.value
    return { listings, favorites: fav?.value ?? 0, views: views?.value ?? 0 }
  }
}
