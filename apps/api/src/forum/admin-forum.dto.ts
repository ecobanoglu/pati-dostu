import { adminForumQuerySchema, removeForumContentSchema, updateForumTopicSchema } from "@pati-dostu/validators"
import { createZodDto } from "nestjs-zod"
import { z } from "zod"

export class AdminForumQueryDto extends createZodDto(adminForumQuerySchema) {}
export class UpdateForumTopicDto extends createZodDto(updateForumTopicSchema) {}
export class RemoveForumContentDto extends createZodDto(removeForumContentSchema) {}
export class ForumIdParamDto extends createZodDto(z.object({ id: z.uuid() })) {}

const person = z.object({ id: z.string(), name: z.string(), email: z.string() })

/** Silinmiş içeriğin silme bilgisi (yayındakilerde null). */
const removalSchema = z
  .object({
    at: z.iso.datetime(),
    /** Silen kişinin adı (bilinmiyorsa null). */
    by: z.string().nullable(),
    /** Yazar kendisi sildi. */
    byAuthor: z.boolean(),
    /** Hazır gerekçe kodu (admin silmesinde; şikâyet nedenleri). */
    reason: z.string().nullable(),
    note: z.string().nullable(),
  })
  .nullable()

const counts = z.object({
  topics: z.number().int(),
  replies: z.number().int(),
  deletedTopics: z.number().int(),
  deletedReplies: z.number().int(),
})

const adminTopicRowSchema = z
  .object({
    id: z.uuid(),
    title: z.string(),
    slug: z.string(),
    category: z.object({ id: z.uuid(), slug: z.string(), name: z.string() }),
    author: person,
    answerCount: z.number().int(),
    viewCount: z.number().int(),
    isSolved: z.boolean(),
    isPinned: z.boolean(),
    isLocked: z.boolean(),
    createdAt: z.iso.datetime(),
    removal: removalSchema,
  })
  .meta({ id: "AdminForumTopicRow" })
export type AdminTopicRow = z.infer<typeof adminTopicRowSchema>

const adminTopicPageSchema = z
  .object({
    items: z.array(adminTopicRowSchema),
    total: z.number().int(),
    page: z.number().int(),
    pageSize: z.number().int(),
    counts,
  })
  .meta({ id: "AdminForumTopicPage" })
export type AdminTopicPage = z.infer<typeof adminTopicPageSchema>
export class AdminTopicPageDto extends createZodDto(adminTopicPageSchema) {}

const adminReplyRowSchema = z
  .object({
    id: z.uuid(),
    /** Biçimsiz özet (en fazla ~180 karakter). */
    excerpt: z.string(),
    topic: z.object({
      id: z.uuid(),
      title: z.string(),
      slug: z.string(),
      categorySlug: z.string(),
      /** Konu silinmiş (bağlantı verilmez). */
      deleted: z.boolean(),
    }),
    author: person,
    likeCount: z.number().int(),
    isBestAnswer: z.boolean(),
    createdAt: z.iso.datetime(),
    removal: removalSchema,
  })
  .meta({ id: "AdminForumReplyRow" })
export type AdminReplyRow = z.infer<typeof adminReplyRowSchema>

const adminReplyPageSchema = z
  .object({
    items: z.array(adminReplyRowSchema),
    total: z.number().int(),
    page: z.number().int(),
    pageSize: z.number().int(),
    counts,
  })
  .meta({ id: "AdminForumReplyPage" })
export type AdminReplyPage = z.infer<typeof adminReplyPageSchema>
export class AdminReplyPageDto extends createZodDto(adminReplyPageSchema) {}
