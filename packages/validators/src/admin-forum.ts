import { z } from "zod"

import { ValidationCode as C } from "./codes.js"
import { reportReasons } from "./reports.js"

/** Admin › Topluluk listelerinde sayfa boyu. */
export const ADMIN_FORUM_PAGE_SIZE = 20

/** Konu listesinin sıralamaları: en yeni, en eski, en çok cevap. */
export const adminTopicSorts = ["new", "old", "replies"] as const

/** Silme gerekçeleri: konu / cevap şikâyet nedenleriyle aynı (uygunsuz, spam, satış, yanlış bilgi, diğer). */
export const forumRemovalReasons = reportReasons.topic
export type ForumRemovalReason = (typeof forumRemovalReasons)[number]

/**
 * GET /admin/forum/topics ve /admin/forum/replies: arama (konu başlığı / metin, yazarın adı ya da e-postası),
 * kategori (slug), durum (yayında / silinmiş), sıralama (yalnız konular), sayfa.
 */
export const adminForumQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  category: z.string().trim().max(60).optional(),
  status: z.enum(["published", "deleted"]).default("published"),
  sort: z.enum(adminTopicSorts).default("new"),
  page: z.coerce.number().int().min(1).max(500).default(1),
  locale: z.enum(["tr", "en"]).default("tr"),
})
export type AdminForumQuery = z.infer<typeof adminForumQuerySchema>

/** PATCH /admin/forum/topics/{id}: kategori taşıma, sabitleme, kilitleme (en az biri). */
export const updateForumTopicSchema = z
  .object({
    categoryId: z.uuid().optional(),
    isPinned: z.boolean().optional(),
    isLocked: z.boolean().optional(),
  })
  .refine((v) => v.categoryId !== undefined || v.isPinned !== undefined || v.isLocked !== undefined, {
    message: C.REQUIRED,
  })
export type UpdateForumTopicInput = z.infer<typeof updateForumTopicSchema>

/** POST /admin/forum/{topics|replies}/{id}/remove: hazır gerekçe + not ("Diğer"de not en az 10 karakter). */
export const removeForumContentSchema = z
  .object({
    reason: z.enum(forumRemovalReasons, C.REASON_REQUIRED),
    note: z.string().trim().max(1000).optional(),
  })
  .refine((v) => v.reason !== "other" || (v.note?.length ?? 0) >= 10, {
    message: C.REASON_TOO_SHORT,
    path: ["note"],
  })
export type RemoveForumContentInput = z.infer<typeof removeForumContentSchema>
