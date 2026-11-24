import { Global, Module } from "@nestjs/common"

import { StorageService } from "./storage.service.js"

/** Dosya deposu (S3 / R2 / RustFS); her modülde enjekte edilebilir. */
@Global()
@Module({
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
