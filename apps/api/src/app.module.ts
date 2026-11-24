import { Module } from "@nestjs/common"
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from "@nestjs/core"
import { ZodSerializerInterceptor, ZodValidationPipe } from "nestjs-zod"

import { AuthModule } from "./auth/auth.module.js"
import { HttpExceptionFilter } from "./common/http-exception.filter.js"
import { DatabaseModule } from "./database/database.module.js"
import { DictionaryModule } from "./dictionary/dictionary.module.js"
import { HealthModule } from "./health/health.module.js"
import { ListingsModule } from "./listings/listings.module.js"
import { MailModule } from "./mail/mail.module.js"
import { ModerationModule } from "./moderation/moderation.module.js"
import { RedisModule } from "./redis/redis.module.js"
import { StorageModule } from "./storage/storage.module.js"
import { UploadsModule } from "./uploads/uploads.module.js"
import { UsersModule } from "./users/users.module.js"

@Module({
  imports: [
    DatabaseModule,
    MailModule,
    StorageModule,
    RedisModule,
    ModerationModule,
    AuthModule,
    HealthModule,
    UsersModule,
    DictionaryModule,
    UploadsModule,
    ListingsModule,
  ],
  providers: [
    // Tüm girişler Zod şemalarıyla (createZodDto) doğrulanır.
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    // @ZodResponse ile işaretli yanıtlar şemaya göre süzülür.
    { provide: APP_INTERCEPTOR, useClass: ZodSerializerInterceptor },
    // Tüm hatalar { statusCode, code, message } biçiminde döner; istemci code'a göre çeviri gösterir.
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule {}
