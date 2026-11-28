import { Module } from "@nestjs/common"

import { AdminListingsController } from "./admin-listings.controller.js"
import { AdminListingsService } from "./admin-listings.service.js"
import { ListingImagesService } from "./listing-images.service.js"
import { ListingReviewService } from "./listing-review.service.js"
import { ListingsController, MyListingsController } from "./listings.controller.js"
import { ListingsService } from "./listings.service.js"

/** İlanlar: herkese açık listeleme/detay, sahibin işlemleri ve admin onay uçları. */
@Module({
  controllers: [ListingsController, MyListingsController, AdminListingsController],
  providers: [ListingsService, ListingImagesService, ListingReviewService, AdminListingsService],
  exports: [ListingsService],
})
export class ListingsModule {}
