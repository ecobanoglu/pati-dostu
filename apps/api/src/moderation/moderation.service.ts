import { createHash } from "node:crypto"

import { HttpStatus, Injectable, Logger } from "@nestjs/common"
import { bannedTerm, type Database, moderationHit, moderationRule, normalizeTurkish } from "@pati-dostu/db"
import type { Redis } from "@upstash/redis"
import { and, eq, isNull } from "drizzle-orm"

import { AppException, ErrorCode } from "../common/errors.js"
import { InjectDb } from "../database/database.module.js"
import { InjectRedis } from "../redis/redis.module.js"
import { type BannedTermRule, findBannedTerm, findPattern, type PatternKind } from "./matchers.js"

/** İçeriğin gönderildiği yer (moderation_area enum'u). */
/**
 * Denetlenen alan. "profile" (Hakkımda metni) için ayrı kural yoktur: ilan metniyle aynı kurallar uygulanır
 * (veritabanındaki moderation_area enum'una eklenmedi; admin "listing" kurallarını değiştirince ikisi birlikte değişir).
 */
export type ModerationArea = "listing" | "comment" | "topic" | "reply" | "message" | "contact" | "profile"

/** Kural tablosunda aranacak alan: profil, ilan kurallarını kullanır. */
const ruleArea = (area: ModerationArea) => (area === "profile" ? "listing" : area)

/** Engellenme nedeni: kalıp kuralı, tekrar ya da yasaklı kelime. */
export type BlockReason = PatternKind | "duplicate" | "banned_term"

/** Kural ve kelime listesinin bellekte tutulma süresi (admin değişiklikleri en geç bu kadar sonra yansır). */
const CACHE_TTL_MS = 60_000

/** Aynı içeriğin tekrar sayıldığı süre (saniye). */
const DUPLICATE_WINDOW_SECONDS = 10 * 60

type Rules = {
  /** Kural adı → id; yalnızca açık kurallar. */
  enabled: Map<PatternKind | "duplicate", { id: string; areas: Set<string> }>
  terms: BannedTermRule[]
  loadedAt: number
}

/** Denetlenecek metinler: alan adı → değer (ör. { title, description }); boş alanlar atlanır. */
export type ModerationInput = Record<string, string | null | undefined>

/**
 * İçerik filtresi (CLAUDE.md › Ürün kuralları). Admin onayı beklemeyen içerik (yorum, konu, cevap) ve ilan metinleri
 * kaydedilmeden önce buradan geçer. Eşleşme varsa içerik KAYDEDİLMEZ: CONTENT_BLOCKED hatası (neden + alan) döner,
 * yalnızca hangi kuralın tetiklendiği sayılır (moderation_hit); engellenen metin hiçbir yerde saklanmaz.
 *
 * Kullanım:
 *   await moderation.assertAllowed("comment", userId, { body })   // engellenirse istisna fırlatır
 *   … içeriği kaydet …
 *   await moderation.remember("comment", userId, { body })        // tekrar kontrolü için (yalnızca özet)
 */
@Injectable()
export class ModerationService {
  private readonly logger = new Logger(ModerationService.name)
  private rules: Rules | null = null

  constructor(
    @InjectDb() private readonly db: Database,
    @InjectRedis() private readonly redis: Redis | null
  ) {}

  /** Metinleri sırayla denetler; ilk eşleşmede kaydı sayıp CONTENT_BLOCKED fırlatır. */
  async assertAllowed(area: ModerationArea, userId: string, input: ModerationInput): Promise<void> {
    const rules = await this.loadRules()
    const kinds = new Set<PatternKind>()
    for (const [kind, rule] of rules.enabled) {
      if (kind !== "duplicate" && rule.areas.has(ruleArea(area))) kinds.add(kind)
    }

    for (const [field, value] of Object.entries(input)) {
      if (!value?.trim()) continue
      const text = normalizeTurkish(value)

      const pattern = findPattern(text, kinds)
      if (pattern) await this.block(area, field, pattern, { ruleId: rules.enabled.get(pattern)?.id })

      const term = findBannedTerm(text, rules.terms)
      if (term) await this.block(area, field, "banned_term", { termId: term.id })
    }

    const duplicate = rules.enabled.get("duplicate")
    if (duplicate?.areas.has(ruleArea(area)) && (await this.isDuplicate(area, userId, input))) {
      await this.block(area, Object.keys(input)[0] ?? "body", "duplicate", { ruleId: duplicate.id })
    }
  }

  /**
   * Kaydedilen içeriğin özetini 10 dakika saklar; aynı kullanıcı aynı alana aynı metni tekrar gönderirse
   * assertAllowed "duplicate" ile engeller. Metnin kendisi değil, SHA-256 özeti tutulur.
   */
  async remember(area: ModerationArea, userId: string, input: ModerationInput): Promise<void> {
    if (!this.redis) return
    try {
      await this.redis.set(this.duplicateKey(area, userId, input), 1, { ex: DUPLICATE_WINDOW_SECONDS })
    } catch (error) {
      this.logger.warn(`Tekrar özeti kaydedilemedi: ${String(error)}`)
    }
  }

  /**
   * Metinleri engellemeden tarar (admin › İlan onayı "Otomatik kontroller"): tüm kalıp türleri (kuralın açık olup
   * olmadığına bakmadan — admin'e bilgi) ve yasaklı kelimeler. Eşleşen her alan için bir satır döner; sayaç yazılmaz.
   */
  async inspect(input: ModerationInput): Promise<Array<{ field: string; reason: BlockReason }>> {
    const rules = await this.loadRules()
    const all = new Set<PatternKind>(["phone", "email", "url", "iban", "price"])
    const out: Array<{ field: string; reason: BlockReason }> = []
    for (const [field, value] of Object.entries(input)) {
      if (!value?.trim()) continue
      const text = normalizeTurkish(value)
      const pattern = findPattern(text, all)
      if (pattern) out.push({ field, reason: pattern })
      if (findBannedTerm(text, rules.terms)) out.push({ field, reason: "banned_term" })
    }
    return out
  }

  /** Admin kuralları değiştirince önbelleği hemen boşaltmak için (5. aşama, admin paneli). */
  invalidate(): void {
    this.rules = null
  }

  /** Eşleşmeyi sayar (metin olmadan) ve kullanıcıya nedeni bildiren hatayı fırlatır. */
  private async block(
    area: ModerationArea,
    field: string,
    reason: BlockReason,
    source: { ruleId?: string; termId?: string }
  ): Promise<never> {
    try {
      // Profil engelleri ayrı enum değeri olmadığı için "listing" altında sayılır.
      await this.db.insert(moderationHit).values({ area: ruleArea(area), ruleId: source.ruleId, termId: source.termId })
    } catch (error) {
      // Sayaç yazılamasa da içerik engellenmeye devam eder.
      this.logger.warn(`moderation_hit yazılamadı: ${String(error)}`)
    }
    throw new AppException(HttpStatus.BAD_REQUEST, ErrorCode.CONTENT_BLOCKED, "İçerik filtresine takıldı.", {
      reason,
      field,
    })
  }

  /** Aynı kullanıcı, aynı alan, aynı (normalize edilmiş) metin son 10 dakikada gönderildi mi? Redis yoksa hayır. */
  private async isDuplicate(area: ModerationArea, userId: string, input: ModerationInput): Promise<boolean> {
    if (!this.redis) return false
    try {
      return (await this.redis.exists(this.duplicateKey(area, userId, input))) === 1
    } catch (error) {
      this.logger.warn(`Tekrar kontrolü yapılamadı: ${String(error)}`)
      return false
    }
  }

  /** Tekrar kontrolü anahtarı: alan + kullanıcı + metinlerin normalize edilmiş hâlinin özeti. */
  private duplicateKey(area: ModerationArea, userId: string, input: ModerationInput): string {
    const normalized = Object.values(input)
      .map((v) => normalizeTurkish(v ?? ""))
      .join("\u0000")
    const hash = createHash("sha256").update(normalized).digest("hex")
    return `moderation:dup:${area}:${userId}:${hash}`
  }

  /** Açık kuralları ve yasaklı kelimeleri yükler; 60 sn bellekte tutar. */
  private async loadRules(): Promise<Rules> {
    if (this.rules && Date.now() - this.rules.loadedAt < CACHE_TTL_MS) return this.rules

    const [ruleRows, termRows] = await Promise.all([
      this.db
        .select({ id: moderationRule.id, kind: moderationRule.kind, areas: moderationRule.areas })
        .from(moderationRule)
        .where(and(eq(moderationRule.enabled, true), isNull(moderationRule.deletedAt))),
      this.db
        .select({ id: bannedTerm.id, term: bannedTerm.term, match: bannedTerm.match })
        .from(bannedTerm)
        .where(isNull(bannedTerm.deletedAt)),
    ])

    this.rules = {
      enabled: new Map(ruleRows.map((r) => [r.kind, { id: r.id, areas: new Set(r.areas) }])),
      terms: termRows,
      loadedAt: Date.now(),
    }
    return this.rules
  }
}
