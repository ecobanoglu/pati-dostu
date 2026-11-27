import { Module } from "@nestjs/common"

import { ForumController } from "./forum.controller.js"
import { ForumService } from "./forum.service.js"
import { MyForumController } from "./my-forum.controller.js"
import { MyForumService } from "./my-forum.service.js"

/** Topluluk: kategoriler, konular, cevaplar, beğeni, en iyi cevap, takip; Hesabım › Sorularım. */
@Module({
  controllers: [ForumController, MyForumController],
  providers: [ForumService, MyForumService],
  exports: [ForumService],
})
export class ForumModule {}
