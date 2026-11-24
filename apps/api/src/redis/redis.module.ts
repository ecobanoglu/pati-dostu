import { Global, Inject, Logger, Module } from "@nestjs/common"
import { Redis } from "@upstash/redis"

import { env } from "../config/env.js"

export const REDIS = Symbol("REDIS")

/** Redis istemcisini enjekte eder; Redis ayarlı değilse değer null'dır (çağıran taraf buna göre davranmalı). */
export const InjectRedis = () => Inject(REDIS)

/**
 * Upstash Redis (REST). Serverless'ta bağlantı tutmadığı için Vercel Function'a uygundur; yerelde
 * serverless-redis-http aynı REST API'yi sunar. İstek sınırlama ve içerik tekrar kontrolü bunu kullanır.
 */
@Global()
@Module({
  providers: [
    {
      provide: REDIS,
      useFactory: (): Redis | null => {
        if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
          new Logger("Redis").warn("UPSTASH_REDIS_REST_URL/TOKEN tanımlı değil; Redis gerektiren özellikler kapalı.")
          return null
        }
        return new Redis({ url: env.UPSTASH_REDIS_REST_URL, token: env.UPSTASH_REDIS_REST_TOKEN })
      },
    },
  ],
  exports: [REDIS],
})
export class RedisModule {}
