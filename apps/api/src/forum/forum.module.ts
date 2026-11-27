import { Module } from "@nestjs/common"

import { ForumController } from "./forum.controller.js"
import { ForumService } from "./forum.service.js"

/** Topluluk: kategoriler, konular, cevaplar, beğeni, en iyi cevap, takip. */
@Module({
  controllers: [ForumController],
  providers: [ForumService],
  exports: [ForumService],
})
export class ForumModule {}
