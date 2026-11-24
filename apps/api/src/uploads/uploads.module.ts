import { Module } from "@nestjs/common"

import { UploadsController } from "./uploads.controller.js"

/** İmzalı yükleme adresleri (ilan fotoğrafları; ileride avatar, blog kapağı). */
@Module({
  controllers: [UploadsController],
})
export class UploadsModule {}
