import { Module } from "@nestjs/common"

import { AdminUsersController } from "./admin-users.controller.js"
import { AdminUsersService } from "./admin-users.service.js"
import { MeController } from "./me.controller.js"
import { MeSummaryService } from "./me-summary.service.js"
import { ProfileService } from "./profile.service.js"
import { UserModerationService } from "./user-moderation.service.js"

/** Giriş yapmış kullanıcının kendi bilgileri (/me), Hesabım özeti ve admin yaptırımları (uyarı, askıya alma). */
@Module({
  controllers: [MeController, AdminUsersController],
  providers: [MeSummaryService, ProfileService, UserModerationService, AdminUsersService],
  exports: [UserModerationService],
})
export class UsersModule {}
