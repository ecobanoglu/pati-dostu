import { Module } from "@nestjs/common"

import { MessagingController } from "./messaging.controller.js"
import { MessagingService } from "./messaging.service.js"

/** Site içi mesajlaşma: ilan üzerinden konuşma, mesajlar (polling), okundu. */
@Module({
  controllers: [MessagingController],
  providers: [MessagingService],
})
export class MessagingModule {}
