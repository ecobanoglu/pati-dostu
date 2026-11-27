import { postsQuerySchema } from "@pati-dostu/validators"
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
