import { Module } from "@nestjs/common"

import { AdminPostsController } from "./admin-posts.controller.js"
import { AdminPostsService } from "./admin-posts.service.js"
import { PostsController } from "./posts.controller.js"
import { PostsService } from "./posts.service.js"

/** Blog ve haberler: herkese açık liste, detay ve okunma sayacı; admin yönetimi (/admin/posts). */
@Module({
  controllers: [PostsController, AdminPostsController],
  providers: [PostsService, AdminPostsService],
})
export class PostsModule {}
