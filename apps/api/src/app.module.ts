import { Module } from "@nestjs/common"
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from "@nestjs/core"
import { ZodSerializerInterceptor, ZodValidationPipe } from "nestjs-zod"

import { AuthModule } from "./auth/auth.module.js"
import { HttpExceptionFilter } from "./common/http-exception.filter.js"
import { DatabaseModule } from "./database/database.module.js"
import { DictionaryModule } from "./dictionary/dictionary.module.js"
import { HealthModule } from "./health/health.module.js"
import { MailModule } from "./mail/mail.module.js"
import { UsersModule } from "./users/users.module.js"

@Module({
  imports: [DatabaseModule, MailModule, AuthModule, HealthModule, UsersModule, DictionaryModule],
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
