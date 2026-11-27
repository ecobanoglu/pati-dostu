import { Global, Logger, Module } from "@nestjs/common"
import { Redis } from "@upstash/redis"

import { env } from "../config/env.js"
import { RateLimitService } from "./rate-limit.service.js"

import { REDIS } from "./redis.token.js"

export { InjectRedis, REDIS } from "./redis.token.js"

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
    RateLimitService,
  ],
  exports: [REDIS, RateLimitService],
})
export class RedisModule {}
