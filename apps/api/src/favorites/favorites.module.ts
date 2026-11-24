import { Module } from "@nestjs/common"

import { ListingsModule } from "../listings/listings.module.js"
import { FavoritesController, MyFavoritesController } from "./favorites.controller.js"
import { FavoritesService } from "./favorites.service.js"

/** Favoriler: ilanı favoriye ekleme/çıkarma ve kullanıcının favori listesi. */
@Module({
  imports: [ListingsModule],
  controllers: [FavoritesController, MyFavoritesController],
  providers: [FavoritesService],
})
export class FavoritesModule {}
