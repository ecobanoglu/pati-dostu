import { z } from "zod"

import { ValidationCode as C } from "./codes.js"
import { countryCodes } from "./countries.js"
import { POST_CONTENT_MAX, postWordCount } from "./post-content.js"

/** Yazı türleri: blog yazısı ve haber. */
export const postTypes = ["blog", "news"] as const
export type PostType = (typeof postTypes)[number]

/** Haber bölgesi süzgeci: Türkiye (country = TR) ya da dünya (diğer ülkeler). */
export const newsRegions = ["tr", "world"] as const
export type NewsRegion = (typeof newsRegions)[number]

/** Liste sayfa boyutu: blogda 3 sütuna tam bölünür, haberde tek sütun. */
export const POSTS_PAGE_SIZE: Record<PostType, number> = { blog: 9, news: 10 }

/** GET /posts sorgusu: tür, kategori slug'ı, (haberde) bölge, sayfa. */
export const postsQuerySchema = z.object({
  type: z.enum(postTypes),
  category: z.string().max(60).optional(),
  region: z.enum(newsRegions).optional(),
  page: z.coerce.number().int().min(1).max(500).default(1),
  locale: z.enum(["tr", "en"]).default("tr"),
})
export type PostsQuery = z.infer<typeof postsQuerySchema>

// --- Admin: yazı editörü ------------------------------------------------------------------------------------------

/** Başlık sınırları (yayında; taslakta en az 1 karakter yeter). */
export const POST_TITLE_MIN = 10
export const POST_TITLE_MAX = 150
/** Özet: kartlarda ve arama sonuçlarında görünür (tasarım "74 / 160"). */
export const POST_EXCERPT_MAX = 160
/** Adres parçası (slug) en fazla. */
export const POST_SLUG_MAX = 100
/** Etiket: yazı başına en fazla, etiket adı en fazla. */
export const POST_TAGS_MAX = 10
export const POST_TAG_MAX = 30
/** Admin listesi sayfa boyutu. */
export const ADMIN_POSTS_PAGE_SIZE = 20

/** Editörde seçilebilen durumlar ("pending"/"rejected" kurum önerileri içindir — sonraki sürüm). */
export const editablePostStatuses = ["draft", "published", "scheduled"] as const
export type EditablePostStatus = (typeof editablePostStatuses)[number]

/** Adres parçası biçimi: küçük harf, rakam ve tire ("ilk-kedi-rehberi"). */
export const POST_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const optionalText = (max: number, code: string) =>
  z
    .string()
    .trim()
    .max(max, code)
    .nullish()
    .transform((v) => v || null)

/**
 * POST /admin/posts ve PATCH /admin/posts/{id} gövdesi (tam kayıt). Taslakta yalnız başlık zorunlu; yayın ve planlı
 * yayında başlık ≥ 10, özet, kategori, içerik ve (haberde) ülke de gerekir. `slug` boşsa API başlıktan üretir
 * (hiç yayınlanmamış yazıda başlık değiştikçe yenilenir); doluysa olduğu gibi kullanılır, başkasınınsa SLUG_TAKEN.
 * `coverKey` ve içerikteki görseller POST /uploads/post-image ile yüklenen depo anahtarlarıdır. `content` Tiptap
 * belgesidir; API `sanitizePostContent` ile temizler. Planlı yayın saati (`publishedAt`) gelecekte olmalıdır.
 */
export const savePostSchema = z
  .object({
    type: z.enum(postTypes),
    status: z.enum(editablePostStatuses),
    title: z.string().trim().min(1, C.REQUIRED).max(POST_TITLE_MAX, C.POST_TITLE_TOO_LONG),
    slug: z
      .string()
      .trim()
      .max(POST_SLUG_MAX, C.SLUG_INVALID)
      .regex(POST_SLUG_PATTERN, C.SLUG_INVALID)
      .nullish()
      .or(z.literal("").transform(() => null)),
    excerpt: z.string().trim().max(POST_EXCERPT_MAX, C.EXCERPT_TOO_LONG).default(""),
    content: z
      .record(z.string(), z.unknown())
      .refine((d) => JSON.stringify(d).length <= POST_CONTENT_MAX, C.CONTENT_TOO_LARGE),
    coverKey: z.string().max(300).nullish(),
    categoryId: z.uuid().nullish(),
    tags: z
      .array(
        z
          .string()
          .trim()
          .transform((t) => t.replace(/^#+/, "").trim())
          .pipe(z.string().min(2, C.TAG_INVALID).max(POST_TAG_MAX, C.TAG_INVALID))
      )
      .max(POST_TAGS_MAX, C.TOO_MANY_TAGS)
      .default([]),
    featured: z.boolean().default(false),
    country: z.enum(countryCodes, C.COUNTRY_INVALID).nullish(),
    sourceName: optionalText(100, C.SOURCE_NAME_TOO_LONG),
    sourceUrl: z
      .string()
      .trim()
      .max(500, C.URL_INVALID)
      .regex(/^https?:\/\/\S+$/i, C.URL_INVALID)
      .nullish()
      .or(z.literal("").transform(() => null)),
    publishedAt: z.iso.datetime({ offset: true }).nullish(),
  })
  .superRefine((v, ctx) => {
    const issue = (path: string, message: string) => ctx.addIssue({ code: "custom", path: [path], message })
    if (v.type === "news" && v.sourceUrl && !v.sourceName) issue("sourceName", C.REQUIRED)
    if (v.status === "scheduled" && !v.publishedAt) issue("publishedAt", C.REQUIRED)
    if (v.status === "draft") return
    if (v.title.length < POST_TITLE_MIN) issue("title", C.TITLE_TOO_SHORT)
    if (!v.excerpt) issue("excerpt", C.REQUIRED)
    if (!v.categoryId) issue("categoryId", C.REQUIRED)
    if (postWordCount(v.content) === 0) issue("content", C.CONTENT_REQUIRED)
    if (v.type === "news" && !v.country) issue("country", C.REQUIRED)
  })
export type SavePostInput = z.input<typeof savePostSchema>
export type SavePost = z.infer<typeof savePostSchema>

/** Admin listesi sıralaması: en yeni (yayın/güncelleme zamanı), en eski, en çok okunan. */
export const adminPostSorts = ["new", "old", "views"] as const
export type AdminPostSort = (typeof adminPostSorts)[number]

/** GET /admin/posts sorgusu: tür, durum ("published" = yayında + saati gelmiş planlı), kategori, başlıkta arama. */
export const adminPostsQuerySchema = z.object({
  type: z.enum(postTypes).optional(),
  status: z.enum(editablePostStatuses).optional(),
  category: z.uuid().optional(),
  q: z.string().trim().max(100).optional(),
  sort: z.enum(adminPostSorts).default("new"),
  page: z.coerce.number().int().min(1).max(500).default(1),
  locale: z.enum(["tr", "en"]).default("tr"),
})
export type AdminPostsQuery = z.infer<typeof adminPostsQuerySchema>

/** POST /admin/posts/bulk: seçilenleri yayından kaldır (taslağa al) ya da sil (yumuşak). */
export const bulkPostsSchema = z.object({
  ids: z.array(z.uuid()).min(1).max(100),
  action: z.enum(["unpublish", "delete"]),
})
export type BulkPostsInput = z.infer<typeof bulkPostsSchema>
