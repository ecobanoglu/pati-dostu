import { HttpStatus, Injectable } from "@nestjs/common"
import { conversation, type Database, listing, listingImage, message, notification, user } from "@pati-dostu/db"
import type { ConversationsQuery, MessagesQuery, StartConversationInput } from "@pati-dostu/validators"
import { and, asc, desc, eq, ilike, isNull, lt, ne, or, type SQL, sql } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"

import type { AuthSession } from "../auth/auth.js"
import { AppException, ErrorCode } from "../common/errors.js"
import { InjectDb } from "../database/database.module.js"
import { ModerationService } from "../moderation/moderation.service.js"
import { NotificationsService } from "../notifications/notifications.service.js"
import { RateLimitService } from "../redis/rate-limit.service.js"
import { StorageService } from "../storage/storage.service.js"
import type { Conversation, ConversationPage, MessageItem, MessagePage } from "./messaging.dto.js"

type SessionUser = AuthSession["user"]

/** Bildirimdeki mesaj önizlemesinin uzunluğu. */
const PREVIEW_LENGTH = 140

const starter = alias(user, "starter")
const owner = alias(user, "owner")

/** Konuşma satırı: konuşma + ilan (kapakla) + iki taraf + son mesaj + okunmamış sayısı (benim için). */
function conversationColumns(meId: string) {
  return {
    id: conversation.id,
    starterId: conversation.starterId,
    ownerId: conversation.ownerId,
    lastMessageAt: conversation.lastMessageAt,
    listing: {
      id: listing.id,
      listingNo: listing.listingNo,
      slug: listing.slug,
      title: listing.title,
      status: listing.status,
      deletedAt: listing.deletedAt,
    },
    cover: listingImage.url,
    starter: { id: starter.id, name: starter.name, image: starter.image, deletedAt: starter.deletedAt },
    owner: { id: owner.id, name: owner.name, image: owner.image, deletedAt: owner.deletedAt },
    last: sql<{ body: string; senderId: string; createdAt: string; readAt: string | null } | null>`(
      select json_build_object('body', m.body, 'senderId', m.sender_id, 'createdAt', m.created_at, 'readAt', m.read_at)
      from ${message} m where m.conversation_id = ${conversation.id}
      order by m.created_at desc, m.id desc limit 1)`,
    unread: sql<number>`(
      select count(*)::int from ${message} m
      where m.conversation_id = ${conversation.id} and m.sender_id <> ${meId} and m.read_at is null)`,
  }
}

type ConversationRow = Awaited<ReturnType<MessagingService["conversationRows"]>>[number]

/** LIKE desenindeki özel karakterleri kaçışlar (kullanıcının yazdığı % ve _ joker olmasın). */
const likeEscape = (value: string) => value.replace(/[\\%_]/g, (c) => `\\${c}`)

/**
 * Site içi mesajlaşma (3. aşama). Konuşma bir ilan üzerinden, ilanı yazan ile ilan sahibi arasında başlar (ilan +
 * başlatan başına tek konuşma). Mesajlar REST ile kaydedilir; gerçek zamanlı iletim yok — istemci açık konuşmayı
 * `after` ile birkaç saniyede bir sorgular (karar: polling). Katılımcı olmayan kişi konuşmayı hiç göremez (404).
 *
 * Kurallar: kendi ilanına yazılamaz; yeni konuşma yalnız yayındaki ilanda başlar (sonra ilan kapansa da konuşma
 * sürer); e-postası doğrulanmamış kullanıcı yazamaz; hesabını kapatan kişiye yazılamaz. Mesaj içerik filtresinden
 * geçer (mesaj alanı: yasaklı kelimeler + IBAN/fiyat — karar) ve istek sınırına tabidir.
 */
@Injectable()
export class MessagingService {
  constructor(
    @InjectDb() private readonly db: Database,
    private readonly moderation: ModerationService,
    private readonly notifications: NotificationsService,
    private readonly rateLimit: RateLimitService,
    private readonly storage: StorageService
  ) {}

  /**
   * İlan için konuşma başlatır ve ilk mesajı yazar. Bu ilanda zaten konuşma varsa mesaj ona eklenir (tekrar
   * çağrılabilir; ilan detayındaki "Mesaj gönder" konuşmanın var olup olmadığını bilmek zorunda kalmaz).
   */
  async start(me: SessionUser, input: StartConversationInput): Promise<Conversation> {
    this.ensureVerified(me)
    const [target] = await this.db
      .select({ id: listing.id, ownerId: listing.ownerId, status: listing.status })
      .from(listing)
      .where(and(eq(listing.id, input.listingId), isNull(listing.deletedAt)))
    if (!target) throw this.listingNotFound()
    if (target.ownerId === me.id) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        ErrorCode.CANNOT_MESSAGE_SELF,
        "Kendi ilanınıza mesaj gönderemezsiniz."
      )
    }
    const [existing] = await this.db
      .select({ id: conversation.id })
      .from(conversation)
      .where(and(eq(conversation.listingId, target.id), eq(conversation.starterId, me.id)))
    if (existing) {
      await this.send(me, existing.id, input.body)
      return this.get(me.id, existing.id)
    }
    // Yeni konuşma yalnız yayındaki ilanda (onaylanmamış/kapanmış ilana ilk mesaj yazılmaz).
    if (target.status !== "active") throw this.listingNotFound()
    await this.ensureRecipientActive(target.ownerId)
    await this.rateLimit.consume("conversation", me.id)
    await this.rateLimit.consume("message", me.id)
    await this.moderation.assertAllowed("message", me.id, { body: input.body })

    const id = await this.db.transaction(async (tx) => {
      const [created] = await tx
        .insert(conversation)
        .values({ listingId: target.id, starterId: me.id, ownerId: target.ownerId, lastMessageAt: sql`now()` })
        .onConflictDoNothing()
        .returning({ id: conversation.id })
      // Aynı anda iki istek gelirse ikincisi var olan konuşmaya yazar.
      const conversationId =
        created?.id ??
        (
          await tx
            .select({ id: conversation.id })
            .from(conversation)
            .where(and(eq(conversation.listingId, target.id), eq(conversation.starterId, me.id)))
        )[0]!.id
      await tx.insert(message).values({ conversationId, senderId: me.id, body: input.body })
      await tx
        .update(conversation)
        .set({ lastMessageAt: sql`now()` })
        .where(eq(conversation.id, conversationId))
      return conversationId
    })
    await this.moderation.remember("message", me.id, { body: input.body })
    await this.notifyIfFirstUnread(me, id, target.ownerId, input.body)
    return this.get(me.id, id)
  }

  /** Konuşmaya mesaj yazar. Karşı taraf hesabını kapatmışsa 409 RECIPIENT_UNAVAILABLE. */
  async send(me: SessionUser, conversationId: string, body: string): Promise<MessageItem> {
    this.ensureVerified(me)
    const c = await this.participant(me.id, conversationId)
    const otherId = c.starterId === me.id ? c.ownerId : c.starterId
    await this.ensureRecipientActive(otherId)
    await this.rateLimit.consume("message", me.id)
    await this.moderation.assertAllowed("message", me.id, { body })

    const row = await this.db.transaction(async (tx) => {
      const [m] = await tx
        .insert(message)
        .values({ conversationId, senderId: me.id, body })
        .returning({ id: message.id, body: message.body, createdAt: message.createdAt, readAt: message.readAt })
      await tx.update(conversation).set({ lastMessageAt: m!.createdAt }).where(eq(conversation.id, conversationId))
      return m!
    })
    await this.moderation.remember("message", me.id, { body })
    await this.notifyIfFirstUnread(me, conversationId, otherId, body)
    return { id: row.id, body: row.body, mine: true, createdAt: row.createdAt.toISOString(), readAt: null }
  }

  /**
   * Konuşmalarım, son mesajı en yeni olan önce (cursor: "zaman|id"). `q`: karşı tarafın adında ya da ilan
   * başlığında arama.
   */
  async list(meId: string, q: ConversationsQuery): Promise<ConversationPage> {
    const after = this.parseCursor(q.cursor)
    const term = q.q ? `%${likeEscape(q.q)}%` : null
    const rows = await this.conversationRows(
      meId,
      and(
        term
          ? or(
              ilike(listing.title, term),
              and(eq(conversation.starterId, meId), ilike(owner.name, term)),
              and(eq(conversation.ownerId, meId), ilike(starter.name, term))
            )
          : undefined,
        after
          ? or(
              lt(conversation.lastMessageAt, after.at),
              and(eq(conversation.lastMessageAt, after.at), lt(conversation.id, after.id))
            )
          : undefined
      ),
      q.limit + 1
    )
    const page = rows.slice(0, q.limit)
    const last = page.at(-1)
    return {
      items: page.map((r) => this.toConversation(meId, r)),
      nextCursor:
        rows.length > q.limit && last?.lastMessageAt ? `${last.lastMessageAt.toISOString()}|${last.id}` : null,
    }
  }

  /** Tek konuşma (başlık: karşı taraf, ilan). Katılımcı değilse 404. */
  async get(meId: string, id: string): Promise<Conversation> {
    const [row] = await this.conversationRows(meId, eq(conversation.id, id), 1)
    if (!row) throw this.conversationNotFound()
    return this.toConversation(meId, row)
  }

  /**
   * Mesajlar, eskiden yeniye. Parametresiz: en yeni `limit` mesaj; `before`: ondan eskiler; `after`: ondan yeniler
   * (polling). `hasMore`: istenen yönde daha mesaj var mı. `readUpTo`: karşı tarafın okuduğu benim son mesajımın
   * zamanı — istemci "Okundu"yu bununla günceller (yalnız yeni mesajları çekerken eski mesajların okundu bilgisi de
   * tazelenir).
   */
  async messages(meId: string, conversationId: string, q: MessagesQuery): Promise<MessagePage> {
    await this.participant(meId, conversationId)
    const cursor = (id: string) => sql`(select created_at, id from ${message} where id = ${id})`
    const position: SQL | undefined = q.before
      ? sql`(${message.createdAt}, ${message.id}) < ${cursor(q.before)}`
      : q.after
        ? sql`(${message.createdAt}, ${message.id}) > ${cursor(q.after)}`
        : undefined
    const newestFirst = !q.after
    const rows = await this.db
      .select({
        id: message.id,
        body: message.body,
        senderId: message.senderId,
        createdAt: message.createdAt,
        readAt: message.readAt,
      })
      .from(message)
      .where(and(eq(message.conversationId, conversationId), position))
      .orderBy(
        ...(newestFirst ? [desc(message.createdAt), desc(message.id)] : [asc(message.createdAt), asc(message.id)])
      )
      .limit(q.limit + 1)
    const page = rows.slice(0, q.limit)
    if (newestFirst) page.reverse()

    const [read] = await this.db
      .select({ at: sql<Date | null>`max(${message.createdAt})` })
      .from(message)
      .where(
        and(eq(message.conversationId, conversationId), eq(message.senderId, meId), sql`${message.readAt} is not null`)
      )
    return {
      items: page.map((m) => ({
        id: m.id,
        body: m.body,
        mine: m.senderId === meId,
        createdAt: m.createdAt.toISOString(),
        readAt: m.readAt?.toISOString() ?? null,
      })),
      hasMore: rows.length > q.limit,
      readUpTo: read?.at ? new Date(read.at).toISOString() : null,
    }
  }

  /**
   * Karşı tarafın mesajlarını okundu işaretler; bu konuşmanın "yeni mesaj" bildirimlerini de okundu sayar (zil
   * sayısı mesajı okuyunca düşsün).
   */
  async markRead(meId: string, conversationId: string): Promise<void> {
    await this.participant(meId, conversationId)
    await this.db
      .update(message)
      .set({ readAt: sql`now()` })
      .where(and(eq(message.conversationId, conversationId), ne(message.senderId, meId), isNull(message.readAt)))
    await this.db
      .update(notification)
      .set({ readAt: sql`now()` })
      .where(
        and(
          eq(notification.userId, meId),
          eq(notification.type, "new_message"),
          isNull(notification.readAt),
          sql`${notification.payload}->>'conversationId' = ${conversationId}`
        )
      )
  }

  /** Tüm konuşmalarımdaki okunmamış mesaj sayısı (üst menü ve mobil alt menüdeki rozet; sık sorgulanır). */
  async unreadCount(meId: string): Promise<number> {
    const [row] = await this.db
      .select({ value: sql<number>`count(*)::int` })
      .from(message)
      .innerJoin(conversation, eq(conversation.id, message.conversationId))
      .where(
        and(
          or(eq(conversation.starterId, meId), eq(conversation.ownerId, meId)),
          ne(message.senderId, meId),
          isNull(message.readAt)
        )
      )
    return row?.value ?? 0
  }

  // --- Yardımcılar --------------------------------------------------------------------------------------------

  /** Konuşma satırlarını okur (yalnız katılımcısı olduklarım), son mesajı en yeni olan önce. */
  private conversationRows(meId: string, condition: SQL | undefined, limit: number) {
    return this.db
      .select(conversationColumns(meId))
      .from(conversation)
      .innerJoin(listing, eq(listing.id, conversation.listingId))
      .innerJoin(starter, eq(starter.id, conversation.starterId))
      .innerJoin(owner, eq(owner.id, conversation.ownerId))
      .leftJoin(listingImage, and(eq(listingImage.listingId, listing.id), eq(listingImage.isCover, true)))
      .where(and(or(eq(conversation.starterId, meId), eq(conversation.ownerId, meId)), condition))
      .orderBy(desc(conversation.lastMessageAt), desc(conversation.id))
      .limit(limit)
  }

  /** Satırı yanıt biçimine çevirir: "karşı taraf" bakan kişiye göre seçilir. */
  private toConversation(meId: string, r: ConversationRow): Conversation {
    const isOwner = r.ownerId === meId
    const other = isOwner ? r.starter : r.owner
    return {
      id: r.id,
      isOwner,
      other: { id: other.id, name: other.name, image: other.image, deleted: other.deletedAt !== null },
      listing: {
        id: r.listing.id,
        listingNo: r.listing.listingNo,
        slug: r.listing.slug,
        title: r.listing.title,
        status: r.listing.status,
        deleted: r.listing.deletedAt !== null,
        coverUrl: r.cover ? this.storage.publicUrl(r.cover) : null,
      },
      lastMessage: r.last
        ? {
            body: r.last.body,
            mine: r.last.senderId === meId,
            createdAt: new Date(r.last.createdAt).toISOString(),
            readAt: r.last.readAt ? new Date(r.last.readAt).toISOString() : null,
          }
        : null,
      unreadCount: r.unread,
      lastMessageAt: r.lastMessageAt?.toISOString() ?? null,
    }
  }

  /** Konuşmayı katılımcı olarak okur; değilse (ya da yoksa) 404 — başkasının konuşmasının varlığı sızmaz. */
  private async participant(meId: string, id: string) {
    const [row] = await this.db
      .select({ starterId: conversation.starterId, ownerId: conversation.ownerId })
      .from(conversation)
      .where(and(eq(conversation.id, id), or(eq(conversation.starterId, meId), eq(conversation.ownerId, meId))))
    if (!row) throw this.conversationNotFound()
    return row
  }

  /**
   * Alıcının bu konuşmada (yeni mesaj dışında) okunmamış mesajı yoksa "yeni mesaj" bildirimi gönderir: konuşma
   * başına bir kez; alıcı okuyana kadar aynı konuşmadan tekrar gitmez (karar).
   */
  private async notifyIfFirstUnread(me: SessionUser, conversationId: string, recipientId: string, body: string) {
    const [row] = await this.db
      .select({ unread: sql<number>`count(*)::int` })
      .from(message)
      .where(and(eq(message.conversationId, conversationId), eq(message.senderId, me.id), isNull(message.readAt)))
    if ((row?.unread ?? 0) !== 1) return
    const [c] = await this.db
      .select({ title: listing.title })
      .from(conversation)
      .innerJoin(listing, eq(listing.id, conversation.listingId))
      .where(eq(conversation.id, conversationId))
    await this.notifications.notify(recipientId, {
      type: "new_message",
      conversationId,
      senderName: me.name,
      title: c?.title ?? "",
      preview: body.length > PREVIEW_LENGTH ? `${body.slice(0, PREVIEW_LENGTH - 1)}…` : body,
    })
  }

  /** Hesabını kapatmış kişiye mesaj yazılamaz (konuşma geçmişi okunabilir kalır). */
  private async ensureRecipientActive(userId: string): Promise<void> {
    const [row] = await this.db.select({ deletedAt: user.deletedAt }).from(user).where(eq(user.id, userId))
    if (!row || row.deletedAt) {
      throw new AppException(HttpStatus.CONFLICT, ErrorCode.RECIPIENT_UNAVAILABLE, "Bu kullanıcıya mesaj gönderilemez.")
    }
  }

  /** E-postası doğrulanmamış kullanıcı mesaj yazamaz (ilan vermedeki kuralla aynı; spam'e karşı). */
  private ensureVerified(me: SessionUser): void {
    if (!me.emailVerified) {
      throw new AppException(HttpStatus.FORBIDDEN, ErrorCode.EMAIL_NOT_VERIFIED, "E-posta adresiniz doğrulanmamış.")
    }
  }

  /** "zaman|id" biçimindeki cursor'ı çözer; bozuksa yok sayar. */
  private parseCursor(cursor?: string): { at: Date; id: string } | null {
    const [at, id] = cursor?.split("|") ?? []
    const date = at ? new Date(at) : null
    return date && !Number.isNaN(date.getTime()) && id ? { at: date, id } : null
  }

  /** Konuşma yok ya da katılımcı değilim: 404. */
  private conversationNotFound() {
    return new AppException(HttpStatus.NOT_FOUND, ErrorCode.NOT_FOUND, "Konuşma bulunamadı.")
  }

  /** İlan yok, silinmiş ya da yeni konuşmaya kapalı: 404. */
  private listingNotFound() {
    return new AppException(HttpStatus.NOT_FOUND, ErrorCode.NOT_FOUND, "İlan bulunamadı.")
  }
}
