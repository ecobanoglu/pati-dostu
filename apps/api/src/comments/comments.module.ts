import { Module } from "@nestjs/common"

import { ListingsModule } from "../listings/listings.module.js"
import { CommentsController } from "./comments.controller.js"
import { CommentsService } from "./comments.service.js"

/** İlan yorumları: listeleme, yazma (içerik filtresi), silme. */
@Module({
  imports: [ListingsModule],
  controllers: [CommentsController],
  providers: [CommentsService],
})
export class CommentsModule {}
