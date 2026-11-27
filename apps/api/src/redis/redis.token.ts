import { Inject } from "@nestjs/common"

/** Redis istemcisinin enjeksiyon anahtarı (redis.module ile rate-limit.service arasında döngüsel import olmasın). */
export const REDIS = Symbol("REDIS")

/** Redis istemcisini enjekte eder; Redis ayarlı değilse değer null'dır (çağıran taraf buna göre davranmalı). */
export const InjectRedis = () => Inject(REDIS)
