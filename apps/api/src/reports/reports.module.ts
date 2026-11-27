import { Module } from "@nestjs/common"

import { ListingsModule } from "../listings/listings.module.js"
import { ReportsController } from "./reports.controller.js"
import { ReportsService } from "./reports.service.js"

/** Şikâyetler: ilan, yorum ve kullanıcı şikâyeti (admin tarafı 5. aşamada). */
@Module({
  imports: [ListingsModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
