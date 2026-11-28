import { HttpStatus, Injectable } from "@nestjs/common"
import { auditLog, type Database, session, user } from "@pati-dostu/db"
import type { BanDuration } from "@pati-dostu/validators"
import { and, eq, isNull } from "drizzle-orm"

import { AppException, ErrorCode } from "../common/errors.js"
import { InjectDb } from "../database/database.module.js"
import { NotificationsService } from "../notifications/notifications.service.js"

const DAY = 86_400_000
const BAN_MS: Record<Exclude<BanDuration, "permanent">, number> = { "7d": 7 * DAY, "30d": 30 * DAY }

/**
 * Kullanıcı yaptırımları (admin): uyarı (sabit kanallı bildirim + e-posta: hazır metin + neden) ve hesabı askıya
 * alma (7 gün / 30 gün / kalıcı; tüm oturumlar kapanır, Better Auth girişte süresi dolmuş banı kaldırır). Admin
 * hesaplarına uygulanmaz. Her işlem denetim kaydına yazılır. Şikayetler ve Kullanıcılar sayfaları kullanır.
 */
@Injectable()
export class UserModerationService {
  constructor(
    @InjectDb() private readonly db: Database,
    private readonly notifications: NotificationsService
  ) {}

  /** Uyarı gönderir: neden (şikâyet nedeni kodu) ve ilgili içeriğin başlığıyla. */
  async warn(adminId: string, userId: string, reason: string, context: { targetType: string; title: string }) {
    await this.target(userId)
    await this.notifications.notify(userId, { type: "user_warned", reason, ...context })
    await this.audit(adminId, "user.warn", userId, { reason, ...context })
  }

  /** Hesabı askıya alır ve oturumlarını kapatır. `reason` yalnız kayıtta (kullanıcıya giriş ekranında genel mesaj). */
  async ban(adminId: string, userId: string, duration: BanDuration, reason: string) {
    await this.target(userId)
    const banExpires = duration === "permanent" ? null : new Date(Date.now() + BAN_MS[duration])
    await this.db.transaction(async (tx) => {
      await tx.update(user).set({ banned: true, banReason: reason, banExpires }).where(eq(user.id, userId))
      await tx.delete(session).where(eq(session.userId, userId))
    })
    await this.audit(adminId, "user.ban", userId, { duration, reason })
  }

  /** Askıyı kaldırır (süreli ya da kalıcı); kullanıcı yeniden giriş yapabilir. */
  async unban(adminId: string, userId: string) {
    await this.target(userId)
    await this.db.update(user).set({ banned: false, banReason: null, banExpires: null }).where(eq(user.id, userId))
    await this.audit(adminId, "user.unban", userId, {})
  }

  /** Yaptırım uygulanabilir kullanıcıyı bulur: silinmemiş ve admin değil. */
  private async target(userId: string) {
    const [row] = await this.db
      .select({ role: user.role })
      .from(user)
      .where(and(eq(user.id, userId), isNull(user.deletedAt)))
    if (!row) throw new AppException(HttpStatus.NOT_FOUND, ErrorCode.NOT_FOUND, "Kullanıcı bulunamadı.")
    if (row.role === "admin") {
      throw new AppException(HttpStatus.BAD_REQUEST, ErrorCode.CANNOT_MODERATE_ADMIN, "Admin hesabına uygulanamaz.")
    }
  }

  /** Denetim kaydı. */
  private async audit(actorId: string, action: string, entityId: string, diff: object) {
    await this.db
      .insert(auditLog)
      .values({ actorId, action, entity: "user", entityId, diff: diff as Record<string, unknown> })
  }
}
