import { z } from "zod"

import { ValidationCode as C } from "./codes.js"

/** Bir ilan yorumunun en fazla uzunluğu (karakter). */
export const COMMENT_MAX = 1000

/** POST /listings/{ref}/comments gövdesi: boşluklar kırpılır, boş olamaz. */
export const createCommentSchema = z.object({
  body: z.string().trim().min(1, C.REQUIRED).max(COMMENT_MAX, C.COMMENT_TOO_LONG),
})
export type CreateCommentInput = z.infer<typeof createCommentSchema>

/** GET /listings/{ref}/comments sorgusu: en yeni önce, sayfa boyutu ve sonraki sayfa (cursor "zaman|id"). */
export const commentsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
  cursor: z.string().max(100).optional(),
})
export type CommentsQuery = z.infer<typeof commentsQuerySchema>
