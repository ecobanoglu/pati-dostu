import {
  adminPostsQuerySchema,
  bulkPostsSchema,
  editablePostStatuses,
  postsQuerySchema,
  savePostSchema,
} from "@pati-dostu/validators"
import { createZodDto } from "nestjs-zod"
import { z } from "zod"

export class PostsQueryDto extends createZodDto(postsQuerySchema) {}
export class PostSlugParamDto extends createZodDto(z.object({ slug: z.string().min(1).max(200) })) {}
export class PostLocaleQueryDto extends createZodDto(z.object({ locale: z.enum(["tr", "en"]).default("tr") })) {}

// --- Yanıt -------------------------------------------------------------------

const named = z.object({ slug: z.string(), name: z.string() })

const postCardSchema = z
  .object({
    id: z.uuid(),
    type: z.enum(["blog", "news"]),
    slug: z.string(),
    title: z.string(),
    excerpt: z.string().nullable(),
    coverUrl: z.string().nullable(),
    category: named.nullable(),
    /** Haber: "tr" (Türkiye) ya da "world". Blogda null. */
    region: z.enum(["tr", "world"]).nullable(),
    sourceName: z.string().nullable(),
    readingTime: z.number().int().nullable(),
    featured: z.boolean(),
    publishedAt: z.iso.datetime(),
    author: z.object({ name: z.string(), image: z.string().nullable() }),
  })
  .meta({ id: "PostCard" })
export type PostCard = z.infer<typeof postCardSchema>

const postPageSchema = z
  .object({
    items: z.array(postCardSchema),
    /** Blogun ilk sayfasında "Öne çıkan" yazı (listede tekrar edilmez); yoksa null. */
    featured: postCardSchema.nullable(),
    total: z.number().int(),
    page: z.number().int(),
    pageSize: z.number().int(),
    categories: z.array(named),
  })
  .meta({ id: "PostPage" })
export type PostPage = z.infer<typeof postPageSchema>
export class PostPageDto extends createZodDto(postPageSchema) {}

const postDetailSchema = postCardSchema
  .extend({
    /** Tiptap belgesi (JSON); istemci izinli düğümleri çizer. */
    content: z.record(z.string(), z.unknown()),
    tags: z.array(named),
    sourceUrl: z.string().nullable(),
    /** İlgili yazılar (aynı tür, aynı kategori önce; en fazla 3). */
    related: z.array(postCardSchema),
  })
  .meta({ id: "PostDetail" })
export type PostDetail = z.infer<typeof postDetailSchema>
export class PostDetailDto extends createZodDto(postDetailSchema) {}

// --- Admin ---------------------------------------------------------------------------------------------------------

export class SavePostDto extends createZodDto(savePostSchema) {}
export class AdminPostsQueryDto extends createZodDto(adminPostsQuerySchema) {}
export class BulkPostsDto extends createZodDto(bulkPostsSchema) {}
export class PostIdParamDto extends createZodDto(z.object({ id: z.uuid() })) {}

const adminStatus = z.enum(editablePostStatuses)

const adminPostRowSchema = z
  .object({
    id: z.uuid(),
    type: z.enum(["blog", "news"]),
    title: z.string(),
    slug: z.string(),
    /** Görünen durum: saati gelmiş planlı yazı "published". */
    status: adminStatus,
    category: z.object({ id: z.uuid(), name: z.string() }).nullable(),
    region: z.enum(["tr", "world"]).nullable(),
    featured: z.boolean(),
    publishedAt: z.iso.datetime().nullable(),
    viewCount: z.number().int(),
    updatedAt: z.iso.datetime(),
  })
  .meta({ id: "AdminPostRow" })

const adminPostPageSchema = z
  .object({
    items: z.array(adminPostRowSchema),
    total: z.number().int(),
    page: z.number().int(),
    pageSize: z.number().int(),
    /** Tür sayıları (süzgeçsiz) ve seçili türdeki durum sayıları. */
    counts: z.object({
      all: z.number().int(),
      blog: z.number().int(),
      news: z.number().int(),
      published: z.number().int(),
      scheduled: z.number().int(),
      draft: z.number().int(),
    }),
  })
  .meta({ id: "AdminPostPage" })
export type AdminPostPage = z.infer<typeof adminPostPageSchema>
export class AdminPostPageDto extends createZodDto(adminPostPageSchema) {}

const adminPostDetailSchema = z
  .object({
    id: z.uuid(),
    type: z.enum(["blog", "news"]),
    status: adminStatus,
    title: z.string(),
    slug: z.string(),
    excerpt: z.string(),
    /** Tiptap belgesi; görsel adresleri herkese açık adres. */
    content: z.record(z.string(), z.unknown()),
    cover: z.object({ key: z.string(), url: z.string() }).nullable(),
    categoryId: z.uuid().nullable(),
    tags: z.array(z.string()),
    featured: z.boolean(),
    country: z.string().nullable(),
    sourceName: z.string().nullable(),
    sourceUrl: z.string().nullable(),
    publishedAt: z.iso.datetime().nullable(),
    /** Yazı en az bir kez yayına girdi mi (adres parçası artık başlıkla değişmez). */
    everPublished: z.boolean(),
    readingTime: z.number().int(),
    viewCount: z.number().int(),
    updatedAt: z.iso.datetime(),
  })
  .meta({ id: "AdminPostDetail" })
export type AdminPostDetail = z.infer<typeof adminPostDetailSchema>
export class AdminPostDetailDto extends createZodDto(adminPostDetailSchema) {}

const adminPostOptionsSchema = z
  .object({
    categories: z.array(z.object({ id: z.uuid(), type: z.enum(["blog", "news"]), slug: z.string(), name: z.string() })),
    /** Kullanılan etiketler (öneri listesi). */
    tags: z.array(z.string()),
  })
  .meta({ id: "AdminPostOptions" })
export type AdminPostOptions = z.infer<typeof adminPostOptionsSchema>
export class AdminPostOptionsDto extends createZodDto(adminPostOptionsSchema) {}

export class BulkPostsResultDto extends createZodDto(
  z.object({ count: z.number().int() }).meta({ id: "BulkPostsResult" })
) {}
