import { Module } from "@nestjs/common"

import { AdminOrganizationsController, OrganizationsController } from "./organizations.controller.js"
import { OrganizationsService } from "./organizations.service.js"

/** Kurumsal başvuru (kullanıcı) ve admin değerlendirmesi; kurum paneli ve klinik/barınak dizini v1.1. */
@Module({
  controllers: [OrganizationsController, AdminOrganizationsController],
  providers: [OrganizationsService],
})
export class OrganizationsModule {}
