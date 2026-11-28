import { Module } from "@nestjs/common"

import { AdminForumController } from "./admin-forum.controller.js"
import { AdminForumService } from "./admin-forum.service.js"
import { ForumController } from "./forum.controller.js"
import { ForumService } from "./forum.service.js"
import { MyForumController } from "./my-forum.controller.js"
import { MyForumService } from "./my-forum.service.js"

/** Topluluk: kategoriler, konular, cevaplar, beğeni, en iyi cevap, takip; Hesabım › Sorularım; Admin › Topluluk. */
@Module({
  controllers: [ForumController, MyForumController, AdminForumController],
  providers: [ForumService, MyForumService, AdminForumService],
  exports: [ForumService],
})
export class ForumModule {}
