import { Global, Module } from "@nestjs/common"

import { NotificationsController } from "./notifications.controller.js"
import { NotificationsService } from "./notifications.service.js"

/** Bildirimler: diğer modüller (ilanlar; ileride mesajlar, topluluk) `NotificationsService.notify` ile üretir. */
@Global()
@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
