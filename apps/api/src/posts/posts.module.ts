import { Module } from "@nestjs/common"

import { PostsController } from "./posts.controller.js"
import { PostsService } from "./posts.service.js"

/** Blog ve haberler: herkese açık liste ve detay (yönetim 7. adımda). */
@Module({
  controllers: [PostsController],
  providers: [PostsService],
})
export class PostsModule {}
