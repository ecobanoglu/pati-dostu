import { Module } from "@nestjs/common"

import { MeController } from "./me.controller.js"
import { MeSummaryService } from "./me-summary.service.js"

/** Giriş yapmış kullanıcının kendi bilgileri (/me) ve Hesabım özeti. */
@Module({
  controllers: [MeController],
  providers: [MeSummaryService],
})
export class UsersModule {}
