import { HttpStatus, Injectable } from "@nestjs/common"
import { type Database, localize, post, postCategory, postTag, tag, user } from "@pati-dostu/db"
import { mapPostImages, type PostNode, POSTS_PAGE_SIZE, type PostsQuery } from "@pati-dostu/validators"
import { and, asc, count, desc, eq, isNull, ne, or, type SQL, sql } from "drizzle-orm"

import { AppException, ErrorCode } from "../common/errors.js"
import { InjectDb } from "../database/database.module.js"
import { StorageService } from "../storage/storage.service.js"
import type { PostCard, PostDetail, PostPage } from "./posts.dto.js"

type Locale = "tr" | "en"

/**
 * Yayındaki yazı: durumu "published" ya da zamanı gelmiş "scheduled" (planlı yayın — ayrı bir iş gerekmeden, saati
 * gelince görünür), silinmemiş.
 */
const visible = and(
  isNull(post.deletedAt),
  or(eq(post.status, "published"), and(eq(post.status, "scheduled"), sql`${post.publishedAt} <= now()`))
)

const cardColumns = {
  id: post.id,
  type: post.type,
  slug: post.slug,
  title: post.title,
  excerpt: post.excerpt,
  coverUrl: post.coverUrl,
  country: post.country,
  sourceName: post.sourceName,
  readingTime: post.readingTime,
  featured: post.featured,
  publishedAt: post.publishedAt,
  createdAt: post.createdAt,
  categorySlug: postCategory.slug,
  categoryName: postCategory.name,
  authorName: user.name,
  authorImage: user.image,
}

/**
 * Blog ve haberler (4. aşama): herkese açık liste ve detay. Yazıları admin hazırlar (editör 7. adımda); içerik Tiptap
 * JSON'u olarak saklanır, web izinli düğümleri çizer. Blog listesinin ilk sayfasında en yeni "öne çıkan" yazı ayrı
 * döner; haberlerde bölge (Türkiye / dünya) ve tür (kategori: Haber / Duyuru / Etkinlik) süzgeci vardır.
 */
@Injectable()
export class PostsService {
  constructor(
    @InjectDb() private readonly db: Database,
    private readonly storage: StorageService
  ) {}

  /** Liste: tür, kategori, bölge süzgeci; en yeni önce; blogun ilk sayfasında öne çıkan yazı ayrı. */
  async list(q: PostsQuery): Promise<PostPage> {
    const pageSize = POSTS_PAGE_SIZE[q.type]
    const where = and(
      visible,
      eq(post.type, q.type),
      q.category ? eq(postCategory.slug, q.category) : undefined,
      // Ülkesi boş haber "dünya" sayılır (kart da öyle gösterir).
      q.type === "news" && q.region
        ? q.region === "tr"
          ? eq(post.country, "TR")
          : or(isNull(post.country), ne(post.country, "TR"))
        : undefined
    )
    // Öne çıkan (yalnız blog): ilk sayfada ayrı döner; hiçbir sayfada listede yer almaz ki sayfalar kaymasın.
    const [featuredRow] =
      q.type === "blog"
        ? await this.cardQuery()
            .where(and(where, eq(post.featured, true)))
            .orderBy(desc(post.publishedAt), desc(post.id))
            .limit(1)
        : []
    const listWhere = featuredRow ? and(where, ne(post.id, featuredRow.id)) : where
    const [rows, [total], categories] = await Promise.all([
      this.cardQuery()
        .where(listWhere)
        .orderBy(desc(post.publishedAt), desc(post.id))
        .limit(pageSize)
        .offset((q.page - 1) * pageSize),
      this.db
        .select({ value: count() })
        .from(post)
        .leftJoin(postCategory, eq(postCategory.id, post.categoryId))
        .where(listWhere),
      this.db
        .select({ slug: postCategory.slug, name: postCategory.name })
        .from(postCategory)
        .where(and(eq(postCategory.type, q.type), isNull(postCategory.deletedAt)))
        .orderBy(asc(postCategory.sortOrder)),
    ])
    return {
      items: rows.map((r) => this.toCard(r, q.locale)),
      featured: featuredRow && q.page === 1 ? this.toCard(featuredRow, q.locale) : null,
      total: total?.value ?? 0,
      page: q.page,
      pageSize,
      categories: categories.map((c) => ({ slug: c.slug, name: localize(c.name, q.locale) })),
    }
  }

  /** Detay (slug ile): içerik, etiketler, kaynak ve ilgili yazılar (aynı tür; aynı kategori önce). Yoksa 404. */
  async detail(slug: string, locale: Locale): Promise<PostDetail> {
    const [row] = await this.db
      .select({ ...cardColumns, content: post.content, sourceUrl: post.sourceUrl, categoryId: post.categoryId })
      .from(post)
      .innerJoin(user, eq(user.id, post.authorId))
      .leftJoin(postCategory, eq(postCategory.id, post.categoryId))
      .where(and(visible, eq(post.slug, slug)))
    if (!row) throw new AppException(HttpStatus.NOT_FOUND, ErrorCode.NOT_FOUND, "Yazı bulunamadı.")
    const sameCategory: SQL = row.categoryId ? sql`${post.categoryId} = ${row.categoryId}` : sql`false`
    const [tags, related] = await Promise.all([
      this.db
        .select({ slug: tag.slug, name: tag.name })
        .from(postTag)
        .innerJoin(tag, eq(tag.id, postTag.tagId))
        .where(eq(postTag.postId, row.id))
        .orderBy(asc(tag.name)),
      this.cardQuery()
        .where(and(visible, eq(post.type, row.type), ne(post.id, row.id)))
        .orderBy(desc(sameCategory), desc(post.publishedAt))
        .limit(3),
    ])
    return {
      ...this.toCard(row, locale),
      content: mapPostImages(row.content as PostNode, (src) =>
        src.startsWith("http") ? src : this.storage.publicUrl(src)
      ) as Record<string, unknown>,
      sourceUrl: row.sourceUrl,
      tags,
      related: related.map((r) => this.toCard(r, locale)),
    }
  }

  /**
   * Okunma sayısını 1 artırır (web oturum başına bir kez çağırır). Yalnız yayındaki yazıda; yazarın kendi bakışı
   * sayılmaz.
   */
  async view(id: string, meId: string | null): Promise<void> {
    await this.db
      .update(post)
      .set({ viewCount: sql`${post.viewCount} + 1` })
      .where(and(eq(post.id, id), visible, meId ? ne(post.authorId, meId) : undefined))
  }

  /** Kart sorgusunun temeli: yazar ve kategori birleştirilmiş. */
  private cardQuery() {
    return this.db
      .select(cardColumns)
      .from(post)
      .innerJoin(user, eq(user.id, post.authorId))
      .leftJoin(postCategory, eq(postCategory.id, post.categoryId))
      .$dynamic()
  }

  /** Kart satırını yanıt biçimine çevirir (kategori adı istenen dilde, kapak herkese açık adres). */
  private toCard(r: Awaited<ReturnType<PostsService["cardQuery"]>>[number], locale: Locale): PostCard {
    return {
      id: r.id,
      type: r.type,
      slug: r.slug,
      title: r.title,
      excerpt: r.excerpt,
      coverUrl: r.coverUrl ? (r.coverUrl.startsWith("http") ? r.coverUrl : this.storage.publicUrl(r.coverUrl)) : null,
      category:
        r.categorySlug && r.categoryName ? { slug: r.categorySlug, name: localize(r.categoryName, locale) } : null,
      region: r.type === "news" ? (r.country === "TR" ? "tr" : "world") : null,
      sourceName: r.sourceName,
      readingTime: r.readingTime,
      featured: r.featured,
      publishedAt: (r.publishedAt ?? r.createdAt).toISOString(),
      author: { name: r.authorName, image: r.authorImage },
    }
  }
}
