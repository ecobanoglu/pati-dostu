import { Module } from "@nestjs/common"
import { APP_INTERCEPTOR, APP_PIPE } from "@nestjs/core"
import { ZodSerializerInterceptor, ZodValidationPipe } from "nestjs-zod"

import { HealthModule } from "./health/health.module.js"

@Module({
  imports: [HealthModule],
  providers: [
    // Tüm girişler Zod şemalarıyla (createZodDto) doğrulanır.
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    // @ZodResponse ile işaretli yanıtlar şemaya göre süzülür.
    { provide: APP_INTERCEPTOR, useClass: ZodSerializerInterceptor },
  ],
})
export class AppModule {}
