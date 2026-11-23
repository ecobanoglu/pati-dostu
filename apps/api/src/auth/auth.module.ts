import { Global, Module } from "@nestjs/common"
import { APP_GUARD } from "@nestjs/core"
import type { Database } from "@pati-dostu/db"

import { DB } from "../database/database.module.js"
import { MailService } from "../mail/mail.service.js"
import { type Auth, createAuth } from "./auth.js"
import { AuthGuard } from "./auth.guard.js"
import { AUTH } from "./auth.tokens.js"

@Global()
@Module({
  providers: [
    {
      provide: AUTH,
      inject: [DB, MailService],
      useFactory: (db: Database, mail: MailService): Auth => createAuth(db, mail),
    },
    // Varsayılan: her uç giriş ister. Herkese açık uçlar @Public() ile işaretlenir.
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
  exports: [AUTH],
})
export class AuthModule {}
