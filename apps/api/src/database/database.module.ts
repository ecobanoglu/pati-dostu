import { Global, Inject, Module, type OnApplicationShutdown } from "@nestjs/common"
import { createDb, type Database } from "@pati-dostu/db"

import { env } from "../config/env.js"

export const DB = Symbol("DB")

/** Servislerde: constructor(@InjectDb() private readonly db: Database) */
export const InjectDb = () => Inject(DB)

@Global()
@Module({
  providers: [
    {
      provide: DB,
      // Vercel Function başına küçük havuz; Supabase pooler bağlantıları paylaştırır.
      useFactory: (): Database => createDb(env.DATABASE_URL, { max: env.NODE_ENV === "production" ? 1 : 10 }),
    },
  ],
  exports: [DB],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@InjectDb() private readonly db: Database) {}

  /** Uygulama kapanırken veritabanı bağlantı havuzunu kapatır. */
  async onApplicationShutdown() {
    await this.db.close()
  }
}
