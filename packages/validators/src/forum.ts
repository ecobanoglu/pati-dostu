import { z } from "zod"

import { ValidationCode as C } from "./codes.js"

/** Konu başlığı sınırları (tasarım: "33 / 120"). */
export const TOPIC_TITLE_MIN = 10
export const TOPIC_TITLE_MAX = 120
/** Konu ayrıntısı ve cevap metni sınırları. */
export const TOPIC_BODY_MIN = 20
export const TOPIC_BODY_MAX = 5000
export const REPLY_BODY_MAX = 3000
/** Konuya eklenebilecek en fazla fotoğraf. */
export const TOPIC_IMAGES_MAX = 3
/** Liste sayfa boyutu. */
export const TOPICS_PAGE_SIZE = 20

/** Liste sıralaması: en yeni, popüler (cevap + görüntülenme), cevapsız (hiç cevabı olmayanlar, en yeni önce). */
export const topicSorts = ["new", "popular", "unanswered"] as const
export type TopicSort = (typeof topicSorts)[number]

/**
 * POST /forum/topics gövdesi. Metin sınırlı Markdown'dur (**kalın**, *italik*, "- " liste; bağlantı yok — karar).
 * `images`: sıralı geçici yükleme anahtarları (POST /uploads/topic-image), ilk = kapak. `follow`: "Cevap geldiğinde
 * bildirim al" (varsayılan açık).
 */
export const createTopicSchema = z.object({
  categoryId: z.uuid({ message: C.REQUIRED }),
  speciesId: z.uuid().nullish(),
  title: z.string().trim().min(TOPIC_TITLE_MIN, C.TOPIC_TITLE_TOO_SHORT).max(TOPIC_TITLE_MAX, C.TOPIC_TITLE_TOO_LONG),
  body: z.string().trim().min(TOPIC_BODY_MIN, C.TOPIC_BODY_TOO_SHORT).max(TOPIC_BODY_MAX, C.TOPIC_BODY_TOO_LONG),
  images: z.array(z.string().min(1).max(300)).max(TOPIC_IMAGES_MAX, C.TOO_MANY_IMAGES).default([]),
  follow: z.boolean().default(true),
})
export type CreateTopicInput = z.infer<typeof createTopicSchema>

/** POST /forum/topics/{id}/replies gövdesi (sınırlı Markdown). */
export const createReplySchema = z.object({
  body: z.string().trim().min(2, C.REQUIRED).max(REPLY_BODY_MAX, C.REPLY_TOO_LONG),
})
export type CreateReplyInput = z.infer<typeof createReplySchema>

/** GET /forum/topics sorgusu: kategori ve tür slug'ları, arama, sıralama, sayfa. */
export const topicsQuerySchema = z.object({
  category: z.string().max(60).optional(),
  species: z.string().max(60).optional(),
  q: z.string().trim().max(100).optional(),
  sort: z.enum(topicSorts).default("new"),
  page: z.coerce.number().int().min(1).max(500).default(1),
  locale: z.enum(["tr", "en"]).default("tr"),
})
export type TopicsQuery = z.infer<typeof topicsQuerySchema>

/** GET /forum/similar sorgusu: başlığa göre benzer konular (soru sorarken ve konu detayında). */
export const similarTopicsQuerySchema = z.object({
  title: z.string().trim().min(3).max(TOPIC_TITLE_MAX),
  categoryId: z.uuid().optional(),
  exclude: z.uuid().optional(),
  locale: z.enum(["tr", "en"]).default("tr"),
})
export type SimilarTopicsQuery = z.infer<typeof similarTopicsQuerySchema>
