import { randomUUID } from "node:crypto"

import { HttpStatus, Injectable } from "@nestjs/common"
import { auditLog, type Database, localize, post, postCategory, postTag, tag } from "@pati-dostu/db"
import {
  ADMIN_POSTS_PAGE_SIZE,
  type AdminPostsQuery,
  type BulkPostsInput,
  editablePostStatuses,
  imageContentTypes,
  MAX_IMAGE_UPLOAD_BYTES,
  mapPostImages,
  type PostNode,
  postWordCount,
  readingMinutes,
  type SavePost,
  sanitizePostContent,
  slugifyTitle,
} from "@pati-dostu/validators"
import { and, asc, count, desc, eq, ilike, inArray, isNull, ne, or, type SQL, sql } from "drizzle-orm"

import type { AuthSession } from "../auth/auth.js"
import { AppException, ErrorCode } from "../common/errors.js"
import { InjectDb } from "../database/database.module.js"
import { StorageService } from "../storage/storage.service.js"
import type { AdminPostDetail, AdminPostOptions, AdminPostPage } from "./posts.dto.js"

type SessionUser = AuthSession["user"]
type Locale = "tr" | "en"
type Executor = Pick<Database, "select" | "insert" | "update" | "delete">

/** Admin'in yüklediği yazı görselleri (kapak ve içerik): herkese açık okunur, hemen önizlenebilir. */
export const POST_MEDIA_PREFIX = "posts/media"
/** Yazıya bağlanabilecek depo anahtarı: posts/media/… (yükleme) ya da posts/{yazıId}/… (demo / eski kapaklar). */
const POST_KEY = /^posts\/[a-z0-9-]+\/[a-z0-9-]+\.(jpg|png|webp)$/

/** Planlı yazının saati geldi mi (o andan itibaren herkese açık ve "yayında" sayılır). */
const scheduledLive = and(eq(post.status, "scheduled"), sql`${post.publishedAt} <= now()`)
/** Arayüzde görünen durum: saati gelmiş planlı yazı "published". */
const effectiveStatus = sql<
  "draft" | "published" | "scheduled"
>`case when ${post.status} = 'scheduled' and ${post.publishedAt} <= now() then 'published' else ${post.status}::text end`
/** Editörde yönetilen yazılar (kurum önerileri — pending/rejected — sonraki sürümde). */
const managed = and(isNull(post.deletedAt), inArray(post.status, [...editablePostStatuses]))

/** Durum süzgeci: "published" = yayında + saati gelmiş planlı; "scheduled" = saati gelmemiş planlı. */
function statusCondition(status: AdminPostsQuery["status"]): SQL | undefined {
  if (status === "published") return or(eq(post.status, "published"), scheduledLive)
  if (status === "scheduled") return and(eq(post.status, "scheduled"), sql`${post.publishedAt} > now()`)
  if (status === "draft") return eq(post.status, "draft")
  return undefined
}

/** Belgedeki görsel adresleri (depo anahtarı olarak saklanır). */
function imageKeys(doc: PostNode): string[] {
  const out: string[] = []
  mapPostImages(doc, (src) => {
    out.push(src)
    return src
  })
  return out
}

/** ILIKE kalıbında `%` ve `_` düz karakter olsun. */
const likeEscape = (q: string) => q.replace(/[\\%_]/g, (c) => `\\${c}`)

/**
 * Blog / haber yönetimi (admin; 4. aşama 7. adım). Yazı taslak, yayında ya da planlı olabilir; planlı yazı saati
 * gelince ayrı bir iş olmadan görünür. İçerik Tiptap JSON'u olarak temizlenip saklanır; görseller depo anahtarıyla
 * tutulur (yanıtta herkese açık adrese çevrilir). Yayın kararları denetim kaydına yazılır.
 */
@Injectable()
export class AdminPostsService {
  constructor(
    @InjectDb() private readonly db: Database,
    private readonly storage: StorageService
  ) {}

  /** Liste: tür, durum, kategori, başlıkta arama, sıralama; tür ve durum sekmeleri için sayılar. */
  async list(q: AdminPostsQuery): Promise<AdminPostPage> {
    const typeFilter = q.type ? eq(post.type, q.type) : undefined
    const where = and(
      managed,
      typeFilter,
      statusCondition(q.status),
      q.category ? eq(post.categoryId, q.category) : undefined,
      q.q ? ilike(post.title, `%${likeEscape(q.q)}%`) : undefined
    )
    const sortDate = sql`coalesce(${post.publishedAt}, ${post.updatedAt})`
    const order =
      q.sort === "views"
        ? [desc(post.viewCount), desc(sortDate)]
        : q.sort === "old"
          ? [asc(sortDate), asc(post.id)]
          : [desc(sortDate), desc(post.id)]
    const [rows, [total], byType, byStatus] = await Promise.all([
      this.db
        .select({
          id: post.id,
          type: post.type,
          title: post.title,
          slug: post.slug,
          status: effectiveStatus,
          country: post.country,
          featured: post.featured,
          publishedAt: post.publishedAt,
          viewCount: post.viewCount,
          updatedAt: post.updatedAt,
          categoryId: postCategory.id,
          categoryName: postCategory.name,
        })
        .from(post)
        .leftJoin(postCategory, eq(postCategory.id, post.categoryId))
        .where(where)
        .orderBy(...order)
        .limit(ADMIN_POSTS_PAGE_SIZE)
        .offset((q.page - 1) * ADMIN_POSTS_PAGE_SIZE),
      this.db.select({ value: count() }).from(post).where(where),
      this.db.select({ type: post.type, value: count() }).from(post).where(managed).groupBy(post.type),
      this.db
        .select({ status: effectiveStatus, value: count() })
        .from(post)
        .where(and(managed, typeFilter))
        .groupBy(effectiveStatus),
    ])
    const typeCount = (t: string) => byType.find((r) => r.type === t)?.value ?? 0
    const statusCount = (s: string) => byStatus.filter((r) => r.status === s).reduce((n, r) => n + r.value, 0)
    return {
      items: rows.map((r) => ({
        id: r.id,
        type: r.type,
        title: r.title,
        slug: r.slug,
        status: r.status,
        category:
          r.categoryId && r.categoryName ? { id: r.categoryId, name: localize(r.categoryName, q.locale) } : null,
        region: r.type === "news" ? (r.country === "TR" ? "tr" : "world") : null,
        featured: r.featured,
        publishedAt: r.publishedAt?.toISOString() ?? null,
        viewCount: r.viewCount,
        updatedAt: r.updatedAt.toISOString(),
      })),
      total: total?.value ?? 0,
      page: q.page,
      pageSize: ADMIN_POSTS_PAGE_SIZE,
      counts: {
        all: typeCount("blog") + typeCount("news"),
        blog: typeCount("blog"),
        news: typeCount("news"),
        published: statusCount("published"),
        scheduled: statusCount("scheduled"),
        draft: statusCount("draft"),
      },
    }
  }

  /** Editör seçenekleri: iki türün kategorileri (istenen dilde) ve kullanılan etiketler (en çok kullanılan önce). */
  async options(locale: Locale): Promise<AdminPostOptions> {
    const [categories, tags] = await Promise.all([
      this.db
        .select({ id: postCategory.id, type: postCategory.type, slug: postCategory.slug, name: postCategory.name })
        .from(postCategory)
        .where(isNull(postCategory.deletedAt))
        .orderBy(asc(postCategory.type), asc(postCategory.sortOrder)),
      this.db
        .select({ name: tag.name })
        .from(tag)
        .leftJoin(postTag, eq(postTag.tagId, tag.id))
        .groupBy(tag.id)
        .orderBy(desc(count(postTag.postId)), asc(tag.name))
        .limit(300),
    ])
    return {
      categories: categories.map((c) => ({ id: c.id, type: c.type, slug: c.slug, name: localize(c.name, locale) })),
      tags: tags.map((t) => t.name),
    }
  }

  /** Editör için yazının tamamı (görseller herkese açık adresle). Silinmiş ya da kurum önerisi → 404. */
  async get(id: string): Promise<AdminPostDetail> {
    const row = await this.find(this.db, id)
    const tags = await this.db
      .select({ name: tag.name })
      .from(postTag)
      .innerJoin(tag, eq(tag.id, postTag.tagId))
      .where(eq(postTag.postId, id))
      .orderBy(asc(postTag.createdAt), asc(tag.name))
    const live = row.publishedAt !== null && row.publishedAt.getTime() <= Date.now()
    return {
      id: row.id,
      type: row.type,
      status: row.status === "scheduled" && live ? "published" : (row.status as AdminPostDetail["status"]),
      title: row.title,
      slug: row.slug,
      excerpt: row.excerpt ?? "",
      content: mapPostImages(row.content as PostNode, (src) => this.url(src)),
      cover: row.coverUrl ? { key: row.coverUrl, url: this.url(row.coverUrl) } : null,
      categoryId: row.categoryId,
      tags: tags.map((t) => t.name),
      featured: row.featured,
      country: row.country,
      sourceName: row.sourceName,
      sourceUrl: row.sourceUrl,
      publishedAt: row.publishedAt?.toISOString() ?? null,
      everPublished: live,
      readingTime: row.readingTime ?? 1,
      viewCount: row.viewCount,
      updatedAt: row.updatedAt.toISOString(),
    }
  }

  /** Yeni yazı (yazar oturumdaki admin). */
  async create(me: SessionUser, input: SavePost): Promise<AdminPostDetail> {
    const id = randomUUID()
    const values = await this.prepare(id, null, input)
    await this.db.transaction(async (tx) => {
      await tx.insert(post).values({ id, authorId: me.id, ...values })
      await this.syncTags(tx, id, input.tags)
    })
    await this.audit(me.id, `post.create.${values.status}`, id)
    return this.get(id)
  }

  /** Yazıyı günceller (tam kayıt). Durum değiştiyse denetim kaydına yazılır. */
  async update(me: SessionUser, id: string, input: SavePost): Promise<AdminPostDetail> {
    const existing = await this.find(this.db, id)
    const values = await this.prepare(id, existing, input)
    await this.db.transaction(async (tx) => {
      await tx
        .update(post)
        .set({ ...values, updatedAt: new Date() })
        .where(eq(post.id, id))
      await this.syncTags(tx, id, input.tags)
    })
    if (existing.status !== values.status) {
      await this.audit(me.id, `post.status.${values.status}`, id, { from: existing.status })
    }
    return this.get(id)
  }

  /** Yazıyı siler (yumuşak; adresi bir daha kullanılmaz). */
  async remove(me: SessionUser, id: string): Promise<void> {
    await this.find(this.db, id)
    await this.db.update(post).set({ deletedAt: new Date() }).where(eq(post.id, id))
    await this.audit(me.id, "post.delete", id)
  }

  /**
   * Toplu işlem: "unpublish" yayındaki/planlı yazıları taslağa alır (yayın tarihi korunur, saati gelmemiş planlı
   * yazınınki silinir), "delete" yumuşak siler. Etkilenen yazı sayısını döndürür.
   */
  async bulk(me: SessionUser, { ids, action }: BulkPostsInput): Promise<{ count: number }> {
    const target = and(managed, inArray(post.id, ids))
    const changed =
      action === "delete"
        ? await this.db.update(post).set({ deletedAt: new Date() }).where(target).returning({ id: post.id })
        : await this.db
            .update(post)
            .set({
              status: "draft",
              publishedAt: sql`case when ${post.publishedAt} <= now() then ${post.publishedAt} else null end`,
              updatedAt: new Date(),
            })
            .where(and(target, ne(post.status, "draft")))
            .returning({ id: post.id })
    if (changed.length > 0) {
      await this.db.insert(auditLog).values(
        changed.map((c) => ({
          actorId: me.id,
          action: action === "delete" ? "post.delete" : "post.status.draft",
          entity: "post",
          entityId: c.id,
        }))
      )
    }
    return { count: changed.length }
  }

  // --- Yardımcılar ----------------------------------------------------------------------------------------------

  /** Yönetilen yazıyı bulur; yoksa 404. */
  private async find(db: Executor, id: string) {
    const [row] = await db
      .select()
      .from(post)
      .where(and(eq(post.id, id), managed))
    if (!row) throw new AppException(HttpStatus.NOT_FOUND, ErrorCode.NOT_FOUND, "Yazı bulunamadı.")
    return row
  }

  /**
   * Kaydedilecek sütunları hazırlar: kategori türe ait mi, içerik temizliği ve görsel anahtarları, kapak, adres
   * parçası, yayın zamanı (taslak → hiç yayınlanmadıysa boş; yayında → ilk yayın anı korunur; planlı → gelecekte
   * olmalı), türe özgü alanlar ve okuma süresi.
   */
  private async prepare(id: string, existing: Awaited<ReturnType<AdminPostsService["find"]>> | null, input: SavePost) {
    if (input.categoryId) {
      const [c] = await this.db
        .select({ id: postCategory.id })
        .from(postCategory)
        .where(
          and(eq(postCategory.id, input.categoryId), eq(postCategory.type, input.type), isNull(postCategory.deletedAt))
        )
      if (!c) throw new AppException(HttpStatus.BAD_REQUEST, ErrorCode.CATEGORY_INVALID, "Kategori geçersiz.")
    }

    const clean = sanitizePostContent(input.content)
    if (!clean.ok) {
      const code = clean.code === "LINK_INVALID" ? ErrorCode.LINK_INVALID : ErrorCode.CONTENT_INVALID
      throw new AppException(HttpStatus.BAD_REQUEST, code, "İçerik geçersiz.", { field: "content" })
    }
    const content = mapPostImages(clean.doc, (src) => this.toKey(src))
    const known = new Set(existing ? [...imageKeys(existing.content as PostNode), existing.coverUrl ?? ""] : [])
    const coverUrl = input.coverKey ? this.toKey(input.coverKey) : null
    const fresh = [...new Set([...imageKeys(content), ...(coverUrl ? [coverUrl] : [])])].filter((k) => !known.has(k))
    await Promise.all(fresh.map((key) => this.checkImage(key)))

    const now = Date.now()
    const everPublished = existing?.publishedAt != null && existing.publishedAt.getTime() <= now
    let publishedAt: Date | null
    if (input.status === "scheduled") {
      publishedAt = new Date(input.publishedAt!)
      if (publishedAt.getTime() <= now) {
        throw new AppException(HttpStatus.BAD_REQUEST, ErrorCode.SCHEDULE_IN_PAST, "Yayın saati geçmişte.", {
          field: "publishedAt",
        })
      }
    } else if (input.status === "published") publishedAt = everPublished ? existing!.publishedAt : new Date(now)
    else publishedAt = everPublished ? existing!.publishedAt : null

    let slug: string
    if (input.slug) {
      if (await this.slugTaken(input.slug, id)) {
        throw new AppException(HttpStatus.CONFLICT, ErrorCode.SLUG_TAKEN, "Bu adres kullanılıyor.", { field: "slug" })
      }
      slug = input.slug
    } else if (existing && everPublished) slug = existing.slug
    else slug = await this.uniqueSlug(input.title, id)

    const news = input.type === "news"
    return {
      type: input.type,
      status: input.status,
      title: input.title,
      slug,
      excerpt: input.excerpt || null,
      content: content as Record<string, unknown>,
      coverUrl,
      categoryId: input.categoryId ?? null,
      featured: news ? false : input.featured,
      country: news ? (input.country ?? null) : null,
      sourceName: news ? input.sourceName : null,
      sourceUrl: news ? (input.sourceUrl ?? null) : null,
      publishedAt,
      readingTime: readingMinutes(postWordCount(content)),
    }
  }

  /** Etiketleri yazıya bağlar: ad sadeleşir (küçük harf), aynı adres parçası tek etiket; yoksa oluşturulur. */
  private async syncTags(tx: Executor, postId: string, names: string[]): Promise<void> {
    const wanted = new Map<string, string>()
    for (const raw of names) {
      const name = raw.toLocaleLowerCase("tr-TR").replace(/\s+/g, " ").trim()
      const slug = slugifyTitle(name, 40)
      if (slug && !wanted.has(slug)) wanted.set(slug, name)
    }
    await tx.delete(postTag).where(eq(postTag.postId, postId))
    if (wanted.size === 0) return
    await tx
      .insert(tag)
      .values([...wanted].map(([slug, name]) => ({ slug, name })))
      .onConflictDoNothing({ target: tag.slug })
    const rows = await tx
      .select({ id: tag.id })
      .from(tag)
      .where(inArray(tag.slug, [...wanted.keys()]))
    await tx.insert(postTag).values(rows.map((r) => ({ postId, tagId: r.id })))
  }

  /** Adres parçası başka bir yazıda (silinmiş olanlar dahil — eski bağlantılar karışmasın) kullanılıyor mu. */
  private async slugTaken(slug: string, exceptId: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: post.id })
      .from(post)
      .where(and(eq(post.slug, slug), ne(post.id, exceptId)))
    return Boolean(row)
  }

  /** Başlıktan benzersiz adres parçası: alınmışsa `-2`, `-3`… */
  private async uniqueSlug(title: string, exceptId: string): Promise<string> {
    const base = slugifyTitle(title) || "yazi"
    const taken = await this.db
      .select({ slug: post.slug })
      .from(post)
      .where(and(ne(post.id, exceptId), or(eq(post.slug, base), sql`${post.slug} like ${`${base}-%`}`)))
    const used = new Set(taken.map((t) => t.slug))
    if (!used.has(base)) return base
    for (let n = 2; ; n++) if (!used.has(`${base}-${n}`)) return `${base}-${n}`
  }

  /** Görsel adresini depo anahtarına çevirir (herkese açık adres ya da anahtar kabul edilir); başka adres → 400. */
  private toKey(src: string): string {
    const base = this.storage.publicUrl("")
    const key = src.startsWith(base) ? src.slice(base.length) : src
    if (!POST_KEY.test(key)) {
      throw new AppException(HttpStatus.BAD_REQUEST, ErrorCode.IMAGE_INVALID, "Görsel geçersiz.", {
        reason: "foreign",
      })
    }
    return key
  }

  /** Depo anahtarını herkese açık adrese çevirir (tam adres olarak saklanmış eski veri olduğu gibi). */
  private url(key: string): string {
    return key.startsWith("http") ? key : this.storage.publicUrl(key)
  }

  /** Yeni bağlanan görsel depoda var mı, boyutu ve türü uygun mu. */
  private async checkImage(key: string): Promise<void> {
    const head = await this.storage.head(key)
    const ok =
      head &&
      head.size > 0 &&
      head.size <= MAX_IMAGE_UPLOAD_BYTES &&
      (imageContentTypes as readonly string[]).includes(head.contentType ?? "")
    if (!ok) {
      throw new AppException(HttpStatus.BAD_REQUEST, ErrorCode.IMAGE_INVALID, "Görsel bulunamadı.", {
        reason: head ? "type" : "missing",
      })
    }
  }

  /** Denetim kaydı (yalnızca eklenir). */
  private async audit(actorId: string, action: string, entityId: string, diff?: object): Promise<void> {
    await this.db
      .insert(auditLog)
      .values({ actorId, action, entity: "post", entityId, diff: diff as Record<string, unknown> })
  }
}
