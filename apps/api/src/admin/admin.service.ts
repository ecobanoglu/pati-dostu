import { Injectable } from "@nestjs/common"
import { type Database, listing, organization, report } from "@pati-dostu/db"
import { and, count, eq, isNull, sql } from "drizzle-orm"

import { InjectDb } from "../database/database.module.js"
import type { AdminCounts } from "./admin.dto.js"

/** Admin paneline özgü, tek bir modüle ait olmayan okumalar (kenar çubuğu rozetleri). */
@Injectable()
export class AdminService {
  constructor(@InjectDb() private readonly db: Database) {}

  /** Bekleyen işler: onay bekleyen ilan, değerlendirilmemiş kurum başvurusu, açık şikâyet dosyası. */
  async counts(): Promise<AdminCounts> {
    const [[listings], [applications], [reports]] = await Promise.all([
      this.db
        .select({ value: count() })
        .from(listing)
        .where(and(eq(listing.status, "pending"), isNull(listing.deletedAt))),
      this.db
        .select({ value: count() })
        .from(organization)
        .where(and(eq(organization.status, "pending"), isNull(organization.deletedAt))),
      // Şikâyet dosyası sayısı: aynı içeriğe gelen şikâyetler tek dosya (Şikayetler sayfasıyla aynı).
      this.db
        .select({ value: sql<number>`count(distinct (${report.targetType}, ${report.targetId}))::int` })
        .from(report)
        .where(eq(report.status, "open")),
    ])
    return {
      pendingListings: listings?.value ?? 0,
      pendingApplications: applications?.value ?? 0,
      openReports: reports?.value ?? 0,
    }
  }
}
