import { HttpStatus, Injectable } from "@nestjs/common"
import { type Database, listing, listingComment, user } from "@pati-dostu/db"
import type { CommentsQuery } from "@pati-dostu/validators"
import { and, count, desc, eq, isNull, lt, or, sql } from "drizzle-orm"

import type { AuthSession } from "../auth/auth.js"
import { AppException, ErrorCode } from "../common/errors.js"
import { InjectDb } from "../database/database.module.js"
import { ListingsService } from "../listings/listings.service.js"
import { ModerationService } from "../moderation/moderation.service.js"
import { NotificationsService } from "../notifications/notifications.service.js"
import { RateLimitService } from "../redis/rate-limit.service.js"
import type { CommentItem, CommentPage } from "./comments.dto.js"

type SessionUser = AuthSession["user"]

/** Bildirimdeki yorum önizlemesinin uzunluğu. */
const PREVIEW_LENGTH = 140

/**
 * İlan yorumları (3. aşama). Kararlar: düz liste (cevap yok; `parentId` ileride), içerik filtresinden geçen yorum
 * anında yayınlanır, takılan kaydedilmez; yalnız yayındaki ilanda görünür ve yazılır. Yorumu yazan, ilan sahibi ve
 * admin silebilir (yumuşak silme). İlan sahibine "ilanına yorum" bildirimi gider (kendi yorumu hariç).
 */
@Injectable()
export class CommentsService {
  constructor(
    @InjectDb() private readonly db: Database,
    private readonly listings: ListingsService,
    private readonly moderation: ModerationService,
    private readonly notifications: NotificationsService,
    private readonly rateLimit: RateLimitService
  ) {}

  /** Yayındaki ilanın yorumları, en yeni önce (cursor "zaman|id") + toplam sayı. İlan yayında değilse 404. */
  async list(ref: string, q: CommentsQuery): Promise<CommentPage> {
    const target = await this.activeListing(ref)
    const after = this.parseCursor(q.cursor)
    const visible = and(
      eq(listingComment.listingId, target.id),
      isNull(listingComment.deletedAt),
      eq(listingComment.status, "published")
    )
    const [rows, [total]] = await Promise.all([
      this.db
        .select({
          id: listingComment.id,
          body: listingComment.body,
          createdAt: listingComment.createdAt,
          author: { id: user.id, name: user.name, image: user.image, role: user.role },
        })
        .from(listingComment)
        .innerJoin(user, eq(user.id, listingComment.authorId))
        .where(
          and(
            visible,
            after
              ? or(
                  lt(listingComment.createdAt, after.at),
                  and(eq(listingComment.createdAt, after.at), lt(listingComment.id, after.id))
                )
              : undefined
          )
        )
        .orderBy(desc(listingComment.createdAt), desc(listingComment.id))
        .limit(q.limit + 1),
      this.db.select({ value: count() }).from(listingComment).where(visible),
    ])
    const page = rows.slice(0, q.limit)
    const last = page.at(-1)
    return {
      items: page.map((r) => this.toItem(r, target.ownerId)),
      total: total?.value ?? 0,
      nextCursor: rows.length > q.limit && last ? `${last.createdAt.toISOString()}|${last.id}` : null,
    }
  }

  /** Yorum yazar: e-posta doğrulanmış olmalı, ilan yayında olmalı; istek sınırı + içerik filtresi; sahibine bildirim. */
  async create(me: SessionUser, ref: string, body: string): Promise<CommentItem> {
    if (!me.emailVerified) {
      throw new AppException(HttpStatus.FORBIDDEN, ErrorCode.EMAIL_NOT_VERIFIED, "E-posta adresiniz doğrulanmamış.")
    }
    const target = await this.activeListing(ref)
    await this.rateLimit.consume("comment", me.id)
    await this.moderation.assertAllowed("comment", me.id, { body })
    const [row] = await this.db
      .insert(listingComment)
      .values({ listingId: target.id, authorId: me.id, body })
      .returning({ id: listingComment.id, body: listingComment.body, createdAt: listingComment.createdAt })
    await this.moderation.remember("comment", me.id, { body })

    if (target.ownerId !== me.id) {
      await this.notifications.notify(target.ownerId, {
        type: "listing_comment",
        listingNo: target.listingNo,
        slug: target.slug,
        title: target.title ?? "",
        authorName: me.name,
        preview: body.length > PREVIEW_LENGTH ? `${body.slice(0, PREVIEW_LENGTH - 1)}…` : body,
      })
    }
    return this.toItem(
      { ...row!, author: { id: me.id, name: me.name, image: me.image ?? null, role: me.role ?? "user" } },
      target.ownerId
    )
  }

  /** Yorumu siler (yumuşak): yazan, ilan sahibi ya da admin. Yorum yoksa 404, yetki yoksa 403. */
  async remove(me: SessionUser, id: string): Promise<void> {
    const [row] = await this.db
      .select({ authorId: listingComment.authorId, ownerId: listing.ownerId })
      .from(listingComment)
      .innerJoin(listing, eq(listing.id, listingComment.listingId))
      .where(and(eq(listingComment.id, id), isNull(listingComment.deletedAt)))
    if (!row) throw new AppException(HttpStatus.NOT_FOUND, ErrorCode.NOT_FOUND, "Yorum bulunamadı.")
    if (row.authorId !== me.id && row.ownerId !== me.id && me.role !== "admin") {
      throw new AppException(HttpStatus.FORBIDDEN, ErrorCode.FORBIDDEN, "Bu yorumu silemezsiniz.")
    }
    await this.db
      .update(listingComment)
      .set({ deletedAt: sql`now()` })
      .where(eq(listingComment.id, id))
  }

  // --- Yardımcılar --------------------------------------------------------------------------------------------

  /** Yorum satırını yanıt biçimine çevirir; yazan ilan sahibiyse `byOwner` (arayüzde "İlan sahibi" rozeti). */
  private toItem(
    r: {
      id: string
      body: string
      createdAt: Date
      author: { id: string; name: string; image: string | null; role: string }
    },
    ownerId: string
  ): CommentItem {
    return {
      id: r.id,
      body: r.body,
      createdAt: r.createdAt.toISOString(),
      author: {
        id: r.author.id,
        name: r.author.name,
        image: r.author.image,
        role: r.author.role as CommentItem["author"]["role"],
      },
      byOwner: r.author.id === ownerId,
    }
  }

  /** Yayındaki (silinmemiş) ilanı numara ya da id ile bulur; yoksa 404. */
  private async activeListing(ref: string) {
    const [row] = await this.db
      .select({
        id: listing.id,
        ownerId: listing.ownerId,
        listingNo: listing.listingNo,
        slug: listing.slug,
        title: listing.title,
      })
      .from(listing)
      .where(and(this.listings.refCondition(ref), eq(listing.status, "active"), isNull(listing.deletedAt)))
    if (!row) throw this.listings.notFound()
    return row
  }

  /** "zaman|id" biçimindeki cursor'ı çözer; bozuksa yok sayar. */
  private parseCursor(cursor?: string): { at: Date; id: string } | null {
    const [at, id] = cursor?.split("|") ?? []
    const date = at ? new Date(at) : null
    return date && !Number.isNaN(date.getTime()) && id ? { at: date, id } : null
  }
}
