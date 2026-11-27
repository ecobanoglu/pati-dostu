import {
  createReplySchema,
  createTopicSchema,
  similarTopicsQuerySchema,
  topicsQuerySchema,
} from "@pati-dostu/validators"
import { createZodDto } from "nestjs-zod"
import { z } from "zod"

export class CreateTopicDto extends createZodDto(createTopicSchema) {}
export class CreateReplyDto extends createZodDto(createReplySchema) {}
export class TopicsQueryDto extends createZodDto(topicsQuerySchema) {}
export class SimilarTopicsQueryDto extends createZodDto(similarTopicsQuerySchema) {}
export class ForumIdParamDto extends createZodDto(z.object({ id: z.uuid() })) {}
export class TopicSlugParamDto extends createZodDto(z.object({ slug: z.string().min(1).max(200) })) {}
export class ForumLocaleQueryDto extends createZodDto(z.object({ locale: z.enum(["tr", "en"]).default("tr") })) {}

// --- Yanıt -------------------------------------------------------------------

const role = z.enum(["user", "clinic", "shelter", "admin"])
const author = z.object({ id: z.string(), name: z.string(), image: z.string().nullable(), role })
const named = z.object({ slug: z.string(), name: z.string() })

const categorySchema = z
  .object({
    id: z.uuid(),
    slug: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    topicCount: z.number(),
  })
  .meta({ id: "ForumCategory" })
export type ForumCategoryItem = z.infer<typeof categorySchema>
export class ForumCategoryListDto extends createZodDto(z.array(categorySchema)) {}

const topicCardSchema = z
  .object({
    id: z.uuid(),
    slug: z.string(),
    title: z.string(),
    /** Ayrıntının biçimsiz ilk ~180 karakteri. */
    excerpt: z.string(),
    category: named,
    species: named.nullable(),
    author,
    isSolved: z.boolean(),
    /** Veteriner kliniği hesabı cevap yazdı ("Veteriner cevapladı" rozeti). */
    vetAnswered: z.boolean(),
    answerCount: z.number().int(),
    viewCount: z.number().int(),
    coverUrl: z.string().nullable(),
    createdAt: z.iso.datetime(),
    lastActivityAt: z.iso.datetime(),
  })
  .meta({ id: "ForumTopicCard" })
export type TopicCard = z.infer<typeof topicCardSchema>

const topicPageSchema = z
  .object({
    items: z.array(topicCardSchema),
    total: z.number().int(),
    page: z.number().int(),
    pageSize: z.number().int(),
  })
  .meta({ id: "ForumTopicPage" })
export type TopicPage = z.infer<typeof topicPageSchema>
export class TopicPageDto extends createZodDto(topicPageSchema) {}

const replySchema = z
  .object({
    id: z.uuid(),
    body: z.string(),
    author,
    likeCount: z.number().int(),
    isBestAnswer: z.boolean(),
    createdAt: z.iso.datetime(),
  })
  .meta({ id: "ForumReply" })
export type ReplyItem = z.infer<typeof replySchema>
export class ReplyDto extends createZodDto(replySchema) {}

const topicDetailSchema = topicCardSchema
  .extend({
    categoryId: z.uuid(),
    body: z.string(),
    images: z.array(z.string()),
    /** En iyi cevap başta, sonra eskiden yeniye. */
    replies: z.array(replySchema),
  })
  .meta({ id: "ForumTopicDetail" })
export type TopicDetail = z.infer<typeof topicDetailSchema>
export class TopicDetailDto extends createZodDto(topicDetailSchema) {}

const similarSchema = z
  .object({
    id: z.uuid(),
    slug: z.string(),
    title: z.string(),
    category: named,
    answerCount: z.number().int(),
    isSolved: z.boolean(),
    vetAnswered: z.boolean(),
  })
  .meta({ id: "ForumSimilarTopic" })
export type SimilarTopic = z.infer<typeof similarSchema>
export class SimilarTopicListDto extends createZodDto(z.array(similarSchema)) {}

export class CreatedTopicDto extends createZodDto(
  z.object({ id: z.uuid(), slug: z.string() }).meta({ id: "ForumCreatedTopic" })
) {}

/** Bakan kişiye özel durum (detay sayfası önbellekli olduğu için ayrı okunur). */
export class TopicViewerDto extends createZodDto(
  z
    .object({ isAuthor: z.boolean(), following: z.boolean(), likedReplyIds: z.array(z.uuid()) })
    .meta({ id: "ForumTopicViewer" })
) {}

export class LikeResultDto extends createZodDto(
  z.object({ liked: z.boolean(), likeCount: z.number().int() }).meta({ id: "ForumLikeResult" })
) {}
