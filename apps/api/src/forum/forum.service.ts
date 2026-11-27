import { randomUUID } from "node:crypto"

import { HttpStatus, Injectable } from "@nestjs/common"
import {
  type Database,
  forumCategory,
  forumReply,
  forumReplyLike,
  forumTopic,
  forumTopicFollow,
  forumTopicImage,
  localize,
  slugify,
  species,
  user,
} from "@pati-dostu/db"
import {
  type CreateTopicInput,
  imageContentTypes,
  imageExtensions,
  MAX_IMAGE_UPLOAD_BYTES,
  type SimilarTopicsQuery,
  TOPICS_PAGE_SIZE,
  type TopicsQuery,
} from "@pati-dostu/validators"
import { and, asc, count, desc, eq, ilike, isNull, ne, or, sql } from "drizzle-orm"

import type { AuthSession } from "../auth/auth.js"
import { AppException, ErrorCode } from "../common/errors.js"
import { InjectDb } from "../database/database.module.js"
import { sniffImageType } from "../listings/listing-images.service.js"
import { ModerationService } from "../moderation/moderation.service.js"
import { NotificationsService } from "../notifications/notifications.service.js"
import { RateLimitService } from "../redis/rate-limit.service.js"
import { StorageService } from "../storage/storage.service.js"
import { TMP_TOPIC_IMAGES } from "../uploads/uploads.controller.js"
import type { ForumCategoryItem, ReplyItem, SimilarTopic, TopicCard, TopicDetail, TopicPage } from "./forum.dto.js"

type SessionUser = AuthSession["user"]
type Locale = "tr" | "en"
type Role = "user" | "clinic" | "shelter" | "admin"

/** Konu slug'ı olamayacak sabit alt sayfalar (web: /topluluk/soru-sor). */
const RESERVED_SLUGS = ["soru-sor", "ask"]

/** Bildirimdeki cevap önizlemesinin uzunluğu. */
const PREVIEW_LENGTH = 140

/**
 * İlişkili alt sorgularda dış tablonun kimliği, tablo adıyla. Drizzle tek tablolu sorguda sütunu tablo adı olmadan
 * ("id") yazar; alt sorgunun içinde bu, alt sorgudaki tablonun id'si sanılır — o yüzden açıkça yazılır.
 */
const TOPIC_ID = sql.raw(`"forum_topic"."id"`)
const CATEGORY_ID = sql.raw(`"forum_category"."id"`)

/** Yayında görünen konu: yayımlanmış ve silinmemiş. */
const visibleTopic = and(eq(forumTopic.status, "published"), isNull(forumTopic.deletedAt))
/** Yayında görünen cevap. */
const visibleReply = and(eq(forumReply.status, "published"), isNull(forumReply.deletedAt))

/** Konuda veteriner kliniği hesabının görünen bir cevabı var mı ("Veteriner cevapladı"). */
const vetAnswered = sql<boolean>`exists (
  select 1 from ${forumReply} r join ${user} u on u.id = r.author_id
  where r.topic_id = ${TOPIC_ID} and r.deleted_at is null and r.status = 'published' and u.role = 'clinic')`

/** Konunun kapak fotoğrafı (ilk sıradaki) — depo anahtarı. */
const coverKey = sql<string | null>`(
  select i.url from ${forumTopicImage} i where i.topic_id = ${TOPIC_ID} order by i.sort_order limit 1)`

/** Kart sütunları (liste, Sorularım vb. ortak). */
const cardColumns = {
  id: forumTopic.id,
  slug: forumTopic.slug,
  title: forumTopic.title,
  body: forumTopic.body,
  isSolved: forumTopic.isSolved,
  answerCount: forumTopic.answerCount,
  viewCount: forumTopic.viewCount,
  createdAt: forumTopic.createdAt,
  lastActivityAt: forumTopic.lastActivityAt,
  categoryId: forumTopic.categoryId,
  categorySlug: forumCategory.slug,
  categoryName: forumCategory.name,
  speciesSlug: species.slug,
  speciesName: species.name,
  author: { id: user.id, name: user.name, image: user.image, role: user.role },
  vetAnswered,
  cover: coverKey,
}

/** LIKE desenindeki özel karakterleri kaçışlar. */
const likeEscape = (value: string) => value.replace(/[\\%_]/g, (c) => `\\${c}`)

/** Sınırlı Markdown'u düz metne çevirir (liste kartındaki özet için): **, *, "- " işaretleri atılır. */
export function plainExcerpt(body: string, max = 180): string {
  const text = body
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/^\s*-\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim()
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text
}

/**
 * Topluluk (soru-cevap; 4. aşama). Kararlar: kategori zorunlu, tür isteğe bağlı; en fazla 3 fotoğraf; metin sınırlı
 * Markdown; konu ve cevap admin onayı beklemez — içerik filtresinden (`topic` / `reply` alanları) geçerse anında
 * yayınlanır, takılan kaydedilmez. Soru sahibi en iyi cevabı seçer (konu "Çözüldü" olur). Yeni cevapta soru sahibine
 * ve konuyu takip edenlere bildirim gider. Silme yumuşaktır (yazan ya da admin).
 */
@Injectable()
export class ForumService {
  constructor(
    @InjectDb() private readonly db: Database,
    private readonly moderation: ModerationService,
    private readonly notifications: NotificationsService,
    private readonly rateLimit: RateLimitService,
    private readonly storage: StorageService
  ) {}

  // --- Okuma -------------------------------------------------------------------------------------------------

  /** Kategoriler (sırasıyla) ve her birindeki görünen konu sayısı. */
  async categories(locale: Locale): Promise<ForumCategoryItem[]> {
    const rows = await this.db
      .select({
        id: forumCategory.id,
        slug: forumCategory.slug,
        name: forumCategory.name,
        description: forumCategory.description,
        topicCount: sql<number>`(select count(*)::int from ${forumTopic} t
          where t.category_id = ${CATEGORY_ID} and t.status = 'published' and t.deleted_at is null)`,
      })
      .from(forumCategory)
      .where(isNull(forumCategory.deletedAt))
      .orderBy(asc(forumCategory.sortOrder))
    return rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      name: localize(r.name, locale),
      description: r.description ? localize(r.description, locale) : null,
      topicCount: r.topicCount,
    }))
  }

  /** Konu listesi: kategori / tür süzgeci, başlık + ayrıntıda arama, sıralama, sayfalama (20'şer). */
  async list(q: TopicsQuery): Promise<TopicPage> {
    const term = q.q ? `%${likeEscape(q.q)}%` : null
    const where = and(
      visibleTopic,
      q.category ? eq(forumCategory.slug, q.category) : undefined,
      q.species ? eq(species.slug, q.species) : undefined,
      term ? or(ilike(forumTopic.title, term), ilike(forumTopic.body, term)) : undefined,
      q.sort === "unanswered" ? eq(forumTopic.answerCount, 0) : undefined
    )
    const order =
      q.sort === "popular"
        ? [desc(forumTopic.answerCount), desc(forumTopic.viewCount), desc(forumTopic.createdAt)]
        : [desc(forumTopic.createdAt), desc(forumTopic.id)]
    const [rows, [total]] = await Promise.all([
      this.cardQuery()
        .where(where)
        .orderBy(...order)
        .limit(TOPICS_PAGE_SIZE)
        .offset((q.page - 1) * TOPICS_PAGE_SIZE),
      this.db
        .select({ value: count() })
        .from(forumTopic)
        .innerJoin(forumCategory, eq(forumCategory.id, forumTopic.categoryId))
        .leftJoin(species, eq(species.id, forumTopic.speciesId))
        .where(where),
    ])
    return {
      items: rows.map((r) => this.toCard(r, q.locale)),
      total: total?.value ?? 0,
      page: q.page,
      pageSize: TOPICS_PAGE_SIZE,
    }
  }

  /** Konu detayı (slug ile) + görünen cevaplar: en iyi cevap başta, sonra eskiden yeniye. Yoksa 404. */
  async detail(slug: string, locale: Locale): Promise<TopicDetail> {
    const [row] = await this.cardQuery().where(and(visibleTopic, eq(forumTopic.slug, slug)))
    if (!row) throw this.topicNotFound()
    const [images, replies] = await Promise.all([
      this.db
        .select({ url: forumTopicImage.url })
        .from(forumTopicImage)
        .where(eq(forumTopicImage.topicId, row.id))
        .orderBy(asc(forumTopicImage.sortOrder)),
      this.db
        .select({
          id: forumReply.id,
          body: forumReply.body,
          likeCount: forumReply.likeCount,
          isBestAnswer: forumReply.isBestAnswer,
          createdAt: forumReply.createdAt,
          author: { id: user.id, name: user.name, image: user.image, role: user.role },
        })
        .from(forumReply)
        .innerJoin(user, eq(user.id, forumReply.authorId))
        .where(and(eq(forumReply.topicId, row.id), visibleReply))
        .orderBy(desc(forumReply.isBestAnswer), asc(forumReply.createdAt), asc(forumReply.id)),
    ])
    return {
      ...this.toCard(row, locale),
      categoryId: row.categoryId,
      body: row.body,
      images: images.map((i) => this.storage.publicUrl(i.url)),
      replies: replies.map((r) => this.toReply(r)),
    }
  }

  /**
   * Başlığa benzer konular (pg_trgm benzerliği): aynı kategori önce, en fazla 4. Soru sorarken yazdıkça ve konu
   * detayının sağ sütununda kullanılır.
   */
  async similar(q: SimilarTopicsQuery): Promise<SimilarTopic[]> {
    const score = sql<number>`similarity(${forumTopic.title}, ${q.title})`
    const rows = await this.db
      .select({
        id: forumTopic.id,
        slug: forumTopic.slug,
        title: forumTopic.title,
        categorySlug: forumCategory.slug,
        categoryName: forumCategory.name,
        answerCount: forumTopic.answerCount,
        isSolved: forumTopic.isSolved,
        vetAnswered,
      })
      .from(forumTopic)
      .innerJoin(forumCategory, eq(forumCategory.id, forumTopic.categoryId))
      .where(and(visibleTopic, sql`${score} > 0.12`, q.exclude ? ne(forumTopic.id, q.exclude) : undefined))
      .orderBy(
        ...(q.categoryId ? [desc(sql`${forumTopic.categoryId} = ${q.categoryId}`)] : []),
        desc(score),
        desc(forumTopic.answerCount)
      )
      .limit(4)
    return rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      category: { slug: r.categorySlug, name: localize(r.categoryName, q.locale) },
      answerCount: r.answerCount,
      isSolved: r.isSolved,
      vetAnswered: r.vetAnswered,
    }))
  }

  /** Bakan kişiye özel durum: soru sahibi mi, takip ediyor mu, hangi cevapları beğendi. */
  async viewer(meId: string, topicId: string) {
    const topic = await this.visibleTopicById(topicId)
    const [follow, likes] = await Promise.all([
      this.db
        .select({ id: forumTopicFollow.id })
        .from(forumTopicFollow)
        .where(and(eq(forumTopicFollow.topicId, topicId), eq(forumTopicFollow.userId, meId))),
      this.db
        .select({ replyId: forumReplyLike.replyId })
        .from(forumReplyLike)
        .innerJoin(forumReply, eq(forumReply.id, forumReplyLike.replyId))
        .where(and(eq(forumReply.topicId, topicId), eq(forumReplyLike.userId, meId))),
    ])
    return {
      isAuthor: topic.authorId === meId,
      following: follow.length > 0,
      likedReplyIds: likes.map((l) => l.replyId),
    }
  }

  /** Görüntülenme sayısını 1 artırır (web oturum başına bir kez çağırır; yazarın kendi bakışı sayılmaz). */
  async view(topicId: string, meId: string | null): Promise<void> {
    await this.db
      .update(forumTopic)
      .set({ viewCount: sql`${forumTopic.viewCount} + 1` })
      .where(and(eq(forumTopic.id, topicId), visibleTopic, meId ? ne(forumTopic.authorId, meId) : undefined))
  }

  // --- Yazma: konu --------------------------------------------------------------------------------------------

  /**
   * Konu açar: e-posta doğrulanmış olmalı; kategori (ve varsa tür) geçerli olmalı; istek sınırı + içerik filtresi;
   * fotoğraflar doğrulanıp forum/{konuId}/ altına taşınır. Yazar varsayılan olarak konuyu takip eder.
   */
  async create(me: SessionUser, input: CreateTopicInput): Promise<{ id: string; slug: string }> {
    this.ensureVerified(me)
    const [category] = await this.db
      .select({ id: forumCategory.id })
      .from(forumCategory)
      .where(and(eq(forumCategory.id, input.categoryId), isNull(forumCategory.deletedAt)))
    if (!category) throw new AppException(HttpStatus.BAD_REQUEST, ErrorCode.CATEGORY_INVALID, "Kategori geçersiz.")
    if (input.speciesId) {
      const [s] = await this.db.select({ id: species.id }).from(species).where(eq(species.id, input.speciesId))
      if (!s) throw new AppException(HttpStatus.BAD_REQUEST, ErrorCode.SPECIES_INVALID, "Tür geçersiz.")
    }
    if (new Set(input.images).size !== input.images.length) throw this.imageInvalid("duplicate")
    await this.rateLimit.consume("topic", me.id)
    await this.moderation.assertAllowed("topic", me.id, { title: input.title, body: input.body })
    // Fotoğraflar kayıttan önce doğrulanır (geçersizse konu hiç açılmaz).
    const checked = await Promise.all(input.images.map((key) => this.checkTmpImage(me.id, key)))

    const id = randomUUID()
    const slug = await this.uniqueSlug(input.title)
    const keys: string[] = []
    for (const { key, ext } of checked) {
      const finalKey = `forum/${id}/${randomUUID()}.${ext}`
      await this.storage.move(key, finalKey)
      keys.push(finalKey)
    }
    await this.db.transaction(async (tx) => {
      await tx.insert(forumTopic).values({
        id,
        categoryId: input.categoryId,
        speciesId: input.speciesId ?? null,
        authorId: me.id,
        title: input.title,
        slug,
        body: input.body,
      })
      if (keys.length > 0) {
        await tx.insert(forumTopicImage).values(keys.map((url, i) => ({ topicId: id, url, sortOrder: i })))
      }
      if (input.follow) await tx.insert(forumTopicFollow).values({ topicId: id, userId: me.id })
    })
    await this.moderation.remember("topic", me.id, { title: input.title, body: input.body })
    return { id, slug }
  }

  /** Konuyu siler (yumuşak): yazan ya da admin. */
  async removeTopic(me: SessionUser, topicId: string): Promise<void> {
    const topic = await this.visibleTopicById(topicId)
    if (topic.authorId !== me.id && me.role !== "admin") throw this.forbidden()
    await this.db
      .update(forumTopic)
      .set({ deletedAt: sql`now()` })
      .where(eq(forumTopic.id, topicId))
  }

  /** Konuyu takip eder / takibi bırakır (tekrar çağrılabilir). */
  async follow(meId: string, topicId: string, on: boolean): Promise<void> {
    await this.visibleTopicById(topicId)
    if (on) {
      await this.db.insert(forumTopicFollow).values({ topicId, userId: meId }).onConflictDoNothing()
    } else {
      await this.db
        .delete(forumTopicFollow)
        .where(and(eq(forumTopicFollow.topicId, topicId), eq(forumTopicFollow.userId, meId)))
    }
  }

  // --- Yazma: cevap -------------------------------------------------------------------------------------------

  /**
   * Cevap yazar: istek sınırı + içerik filtresi; konunun cevap sayısı ve son etkinliği güncellenir. Soru sahibine
   * (her durumda) ve konuyu takip eden diğerlerine bildirim gider; cevabı yazan bildirim almaz.
   */
  async reply(me: SessionUser, topicId: string, body: string): Promise<ReplyItem> {
    this.ensureVerified(me)
    const topic = await this.visibleTopicById(topicId)
    await this.rateLimit.consume("reply", me.id)
    await this.moderation.assertAllowed("reply", me.id, { body })
    const row = await this.db.transaction(async (tx) => {
      const [r] = await tx.insert(forumReply).values({ topicId, authorId: me.id, body }).returning({
        id: forumReply.id,
        body: forumReply.body,
        likeCount: forumReply.likeCount,
        isBestAnswer: forumReply.isBestAnswer,
        createdAt: forumReply.createdAt,
      })
      await tx
        .update(forumTopic)
        .set({ answerCount: sql`${forumTopic.answerCount} + 1`, lastActivityAt: r!.createdAt })
        .where(eq(forumTopic.id, topicId))
      return r!
    })
    await this.moderation.remember("reply", me.id, { body })

    const preview = body.length > PREVIEW_LENGTH ? `${body.slice(0, PREVIEW_LENGTH - 1)}…` : body
    const base = {
      topicSlug: topic.slug,
      categorySlug: topic.categorySlug,
      title: topic.title,
      authorName: me.name,
      preview,
    }
    if (topic.authorId !== me.id) {
      await this.notifications.notify(topic.authorId, { type: "forum_reply", ...base, own: true })
    }
    const followers = await this.db
      .select({ userId: forumTopicFollow.userId })
      .from(forumTopicFollow)
      .where(eq(forumTopicFollow.topicId, topicId))
    const others = followers.map((f) => f.userId).filter((id) => id !== me.id && id !== topic.authorId)
    if (others.length > 0) await this.notifications.notify(others, { type: "forum_reply", ...base, own: false })

    return this.toReply({
      ...row,
      author: { id: me.id, name: me.name, image: me.image ?? null, role: (me.role ?? "user") as Role },
    })
  }

  /** Cevabı siler (yumuşak): yazan ya da admin. Cevap sayısı düşer; en iyi cevapsa konu "çözülmedi"ye döner. */
  async removeReply(me: SessionUser, replyId: string): Promise<void> {
    const reply = await this.visibleReplyById(replyId)
    if (reply.authorId !== me.id && me.role !== "admin") throw this.forbidden()
    await this.db.transaction(async (tx) => {
      await tx
        .update(forumReply)
        .set({ deletedAt: sql`now()`, isBestAnswer: false })
        .where(eq(forumReply.id, replyId))
      await tx
        .update(forumTopic)
        .set({
          answerCount: sql`greatest(${forumTopic.answerCount} - 1, 0)`,
          ...(reply.isBestAnswer ? { isSolved: false } : {}),
        })
        .where(eq(forumTopic.id, reply.topicId))
    })
  }

  /** "Faydalı" (beğeni) ekler ya da geri alır; kendi cevabı beğenilemez. Yeni sayıyı döndürür. */
  async like(meId: string, replyId: string, on: boolean): Promise<{ liked: boolean; likeCount: number }> {
    const reply = await this.visibleReplyById(replyId)
    if (reply.authorId === meId) {
      throw new AppException(HttpStatus.BAD_REQUEST, ErrorCode.CANNOT_LIKE_OWN, "Kendi cevabınızı beğenemezsiniz.")
    }
    await this.db.transaction(async (tx) => {
      if (on) {
        const added = await tx
          .insert(forumReplyLike)
          .values({ replyId, userId: meId })
          .onConflictDoNothing()
          .returning({ id: forumReplyLike.id })
        if (added.length > 0) {
          await tx
            .update(forumReply)
            .set({ likeCount: sql`${forumReply.likeCount} + 1` })
            .where(eq(forumReply.id, replyId))
        }
      } else {
        const removed = await tx
          .delete(forumReplyLike)
          .where(and(eq(forumReplyLike.replyId, replyId), eq(forumReplyLike.userId, meId)))
          .returning({ id: forumReplyLike.id })
        if (removed.length > 0) {
          await tx
            .update(forumReply)
            .set({ likeCount: sql`greatest(${forumReply.likeCount} - 1, 0)` })
            .where(eq(forumReply.id, replyId))
        }
      }
    })
    const [row] = await this.db
      .select({ likeCount: forumReply.likeCount })
      .from(forumReply)
      .where(eq(forumReply.id, replyId))
    return { liked: on, likeCount: row?.likeCount ?? 0 }
  }

  /**
   * En iyi cevabı seçer (yalnız soru sahibi): konudaki önceki seçim kalkar, konu "Çözüldü" olur; cevabın yazarına
   * bildirim gider. `on: false` seçimi kaldırır (konu "çözülmedi"ye döner).
   */
  async bestAnswer(me: SessionUser, replyId: string, on: boolean): Promise<void> {
    const reply = await this.visibleReplyById(replyId)
    const topic = await this.visibleTopicById(reply.topicId)
    if (topic.authorId !== me.id) throw this.forbidden()
    await this.db.transaction(async (tx) => {
      await tx.update(forumReply).set({ isBestAnswer: false }).where(eq(forumReply.topicId, topic.id))
      if (on) await tx.update(forumReply).set({ isBestAnswer: true }).where(eq(forumReply.id, replyId))
      await tx.update(forumTopic).set({ isSolved: on }).where(eq(forumTopic.id, topic.id))
    })
    if (on && reply.authorId !== me.id) {
      await this.notifications.notify(reply.authorId, {
        type: "forum_best_answer",
        topicSlug: topic.slug,
        categorySlug: topic.categorySlug,
        title: topic.title,
      })
    }
  }

  // --- Yardımcılar --------------------------------------------------------------------------------------------

  /** Kart sorgusunun temeli: kategori, tür, yazar birleştirilmiş. */
  cardQuery() {
    return this.db
      .select(cardColumns)
      .from(forumTopic)
      .innerJoin(forumCategory, eq(forumCategory.id, forumTopic.categoryId))
      .innerJoin(user, eq(user.id, forumTopic.authorId))
      .leftJoin(species, eq(species.id, forumTopic.speciesId))
      .$dynamic()
  }

  /** Kart satırını yanıt biçimine çevirir (adlar istenen dilde, kapak herkese açık adres, biçimsiz özet). */
  toCard(r: Awaited<ReturnType<ForumService["cardQuery"]>>[number], locale: Locale): TopicCard {
    return {
      id: r.id,
      slug: r.slug,
      title: r.title,
      excerpt: plainExcerpt(r.body),
      category: { slug: r.categorySlug, name: localize(r.categoryName, locale) },
      species: r.speciesSlug && r.speciesName ? { slug: r.speciesSlug, name: localize(r.speciesName, locale) } : null,
      author: { id: r.author.id, name: r.author.name, image: r.author.image, role: r.author.role as Role },
      isSolved: r.isSolved,
      vetAnswered: r.vetAnswered,
      answerCount: r.answerCount,
      viewCount: r.viewCount,
      coverUrl: r.cover ? this.storage.publicUrl(r.cover) : null,
      createdAt: r.createdAt.toISOString(),
      lastActivityAt: r.lastActivityAt.toISOString(),
    }
  }

  /** Cevap satırını yanıt biçimine çevirir. */
  private toReply(r: {
    id: string
    body: string
    likeCount: number
    isBestAnswer: boolean
    createdAt: Date
    author: { id: string; name: string; image: string | null; role: string }
  }): ReplyItem {
    return {
      id: r.id,
      body: r.body,
      likeCount: r.likeCount,
      isBestAnswer: r.isBestAnswer,
      createdAt: r.createdAt.toISOString(),
      author: { id: r.author.id, name: r.author.name, image: r.author.image, role: r.author.role as Role },
    }
  }

  /** Yayındaki konuyu id ile okur; yoksa 404. */
  private async visibleTopicById(id: string) {
    const [row] = await this.db
      .select({
        id: forumTopic.id,
        authorId: forumTopic.authorId,
        slug: forumTopic.slug,
        title: forumTopic.title,
        categorySlug: forumCategory.slug,
      })
      .from(forumTopic)
      .innerJoin(forumCategory, eq(forumCategory.id, forumTopic.categoryId))
      .where(and(eq(forumTopic.id, id), visibleTopic))
    if (!row) throw this.topicNotFound()
    return row
  }

  /** Yayındaki konunun görünen cevabını id ile okur; yoksa 404. */
  private async visibleReplyById(id: string) {
    const [row] = await this.db
      .select({
        id: forumReply.id,
        topicId: forumReply.topicId,
        authorId: forumReply.authorId,
        isBestAnswer: forumReply.isBestAnswer,
      })
      .from(forumReply)
      .innerJoin(forumTopic, eq(forumTopic.id, forumReply.topicId))
      .where(and(eq(forumReply.id, id), visibleReply, visibleTopic))
    if (!row) throw new AppException(HttpStatus.NOT_FOUND, ErrorCode.NOT_FOUND, "Cevap bulunamadı.")
    return row
  }

  /**
   * Başlıktan benzersiz slug üretir ("yavru-kedi-mama-yemiyor", çakışırsa "-2", "-3"…). Silinmiş konuların slug'ı da
   * dolu sayılır (eski bağlantılar başka konuya gitmesin). Kategori slug'ları ve "soru-sor" ayrılmıştır: konu ve
   * kategori sayfası web'de aynı adres segmentini paylaşır (/topluluk/{kategori} ↔ /topluluk/{konu}).
   */
  private async uniqueSlug(title: string): Promise<string> {
    const base = slugify(title).slice(0, 80).replace(/-+$/, "") || "konu"
    const taken = await this.db
      .select({ slug: forumTopic.slug })
      .from(forumTopic)
      .where(or(eq(forumTopic.slug, base), ilike(forumTopic.slug, `${likeEscape(base)}-%`)))
    const categories = await this.db.select({ slug: forumCategory.slug }).from(forumCategory)
    const used = new Set([...taken.map((t) => t.slug), ...categories.map((c) => c.slug), ...RESERVED_SLUGS])
    if (!used.has(base)) return base
    for (let n = 2; ; n++) if (!used.has(`${base}-${n}`)) return `${base}-${n}`
  }

  /** Geçici yüklemeyi doğrular: kullanıcının kendi alanında mı, var mı, boyutu ve gerçek türü uygun mu. */
  private async checkTmpImage(userId: string, key: string): Promise<{ key: string; ext: string }> {
    const own = `${TMP_TOPIC_IMAGES}/${userId}/`
    if (!key.startsWith(own) || key.slice(own.length).includes("/")) throw this.imageInvalid("foreign")
    const head = await this.storage.head(key)
    if (!head) throw this.imageInvalid("missing")
    if (head.size <= 0 || head.size > MAX_IMAGE_UPLOAD_BYTES) throw this.imageInvalid("size")
    const sniffed = sniffImageType(await this.storage.readStart(key, 12))
    if (!sniffed || !(imageContentTypes as readonly string[]).includes(head.contentType ?? "")) {
      throw this.imageInvalid("type")
    }
    return { key, ext: imageExtensions[sniffed] }
  }

  /** E-postası doğrulanmamış kullanıcı konu/cevap yazamaz (spam'e karşı; ilan kuralıyla aynı). */
  private ensureVerified(me: SessionUser): void {
    if (!me.emailVerified) {
      throw new AppException(HttpStatus.FORBIDDEN, ErrorCode.EMAIL_NOT_VERIFIED, "E-posta adresiniz doğrulanmamış.")
    }
  }

  /** IMAGE_INVALID hatası (`reason` sorun ayıklamak içindir). */
  private imageInvalid(reason: "duplicate" | "foreign" | "missing" | "size" | "type") {
    return new AppException(HttpStatus.BAD_REQUEST, ErrorCode.IMAGE_INVALID, "Fotoğraf geçersiz.", { reason })
  }

  /** Konu yok ya da yayında değil: 404. */
  private topicNotFound() {
    return new AppException(HttpStatus.NOT_FOUND, ErrorCode.NOT_FOUND, "Konu bulunamadı.")
  }

  /** Bu işlem için yetki yok: 403. */
  private forbidden() {
    return new AppException(HttpStatus.FORBIDDEN, ErrorCode.FORBIDDEN, "Bu işlem için yetkiniz yok.")
  }
}
