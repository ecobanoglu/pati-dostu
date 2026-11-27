import { z } from "zod"

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
