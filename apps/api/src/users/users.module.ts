import { Module } from "@nestjs/common"

import { MeController } from "./me.controller.js"
import { MeSummaryService } from "./me-summary.service.js"
import { ProfileService } from "./profile.service.js"
import { UserModerationService } from "./user-moderation.service.js"

/** Giriş yapmış kullanıcının kendi bilgileri (/me), Hesabım özeti ve admin yaptırımları (uyarı, askıya alma). */
@Module({
  controllers: [MeController],
  providers: [MeSummaryService, ProfileService, UserModerationService],
  exports: [UserModerationService],
})
export class UsersModule {}
