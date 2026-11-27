import { HttpStatus, Injectable, Logger } from "@nestjs/common"
import type { Redis } from "@upstash/redis"

import { AppException, ErrorCode } from "../common/errors.js"
import { InjectRedis } from "./redis.token.js"

/**
 * Sınırlanan işlemler ve kotaları (kullanıcı başına, sabit pencere). Yeni yazma ucu eklerken buraya satır ekleyin.
 * Sınırlar kötüye kullanımı (spam) durdurmak içindir; normal kullanımda hissedilmemeli.
 */
const LIMITS = {
  /** Mesaj gönderme: dakikada 30. */
  message: { tokens: 30, windowSeconds: 60 },
  /** Yeni konuşma başlatma (farklı ilanlara ilk mesaj): saatte 20. */
  conversation: { tokens: 20, windowSeconds: 60 * 60 },
  /** İlan yorumu: 10 dakikada 10. */
  comment: { tokens: 10, windowSeconds: 10 * 60 },
  /** Şikâyet: saatte 10. */
  report: { tokens: 10, windowSeconds: 60 * 60 },
} as const satisfies Record<string, { tokens: number; windowSeconds: number }>

export type RateLimitAction = keyof typeof LIMITS

/**
 * İstek sınırlama: Redis'te sabit pencereli sayaç (INCR + EXPIRE). Sınır aşılırsa 429 TOO_MANY_REQUESTS
 * (`details.retryAfter`: saniye). Redis ayarlı değilse ya da ulaşılamıyorsa istek geçer (sınırlama yüzünden asıl
 * işlem durmasın; uyarı günlüğe yazılır).
 *
 * Neden @upstash/ratelimit değil: 2.1+ sürümlerinin Lua betikleri yalnız Upstash'in tanıdığı bir bayrak
 * (`allow-key-locking`) kullanıyor; yerel Redis 8 bunu reddediyor. Bu sayaç her iki ortamda da aynı çalışır.
 */
@Injectable()
export class RateLimitService {
  private readonly logger = new Logger(RateLimitService.name)

  constructor(@InjectRedis() private readonly redis: Redis | null) {}

  /** Kullanıcının bu işlem için kotası kaldıysa geçer, dolduysa 429 fırlatır. */
  async consume(action: RateLimitAction, userId: string): Promise<void> {
    if (!this.redis) return
    const { tokens, windowSeconds } = LIMITS[action]
    const now = Math.floor(Date.now() / 1000)
    const window = Math.floor(now / windowSeconds)
    const key = `ratelimit:${action}:${userId}:${window}`
    let used: number
    try {
      used = await this.redis.incr(key)
      // Pencerenin ilk isteğinde süre verilir; anahtar pencere bitince kendiliğinden silinir.
      if (used === 1) await this.redis.expire(key, windowSeconds)
    } catch (error) {
      this.logger.warn(`İstek sınırı denetlenemedi (${action}): ${String(error)}`)
      return
    }
    if (used > tokens) {
      throw new AppException(HttpStatus.TOO_MANY_REQUESTS, ErrorCode.TOO_MANY_REQUESTS, "Çok fazla istek.", {
        retryAfter: Math.max(1, (window + 1) * windowSeconds - now),
      })
    }
  }
}
