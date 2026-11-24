import { Global, Module } from "@nestjs/common"

import { ModerationService } from "./moderation.service.js"

/** İçerik filtresi; ilan, yorum, topluluk ve mesaj modülleri enjekte eder. */
@Global()
@Module({
  providers: [ModerationService],
  exports: [ModerationService],
})
export class ModerationModule {}
