import { Module } from "@nestjs/common"

import { CommentsModule } from "../comments/comments.module.js"
import { ForumModule } from "../forum/forum.module.js"
import { ListingsModule } from "../listings/listings.module.js"
import { UsersModule } from "../users/users.module.js"
import { AdminReportsController } from "./admin-reports.controller.js"
import { AdminReportsService } from "./admin-reports.service.js"
import { ReportsController } from "./reports.controller.js"
import { ReportsService } from "./reports.service.js"

/** Şikâyetler: ilan, yorum, konu, cevap ve kullanıcı şikâyeti; admin dosyaları ve sonuçlandırma. */
@Module({
  imports: [ListingsModule, CommentsModule, ForumModule, UsersModule],
  controllers: [ReportsController, AdminReportsController],
  providers: [ReportsService, AdminReportsService],
})
export class ReportsModule {}
