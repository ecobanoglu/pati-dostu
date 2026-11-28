import { Module } from "@nestjs/common"

import { AdminController } from "./admin.controller.js"
import { AdminService } from "./admin.service.js"

/** Admin paneli genel uçları (5. aşama); modüle özgü admin uçları kendi modüllerinde. */
@Module({
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
