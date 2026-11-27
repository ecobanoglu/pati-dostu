import { commentsQuerySchema, createCommentSchema } from "@pati-dostu/validators"
import { createZodDto } from "nestjs-zod"
import { z } from "zod"

export class CreateCommentDto extends createZodDto(createCommentSchema) {}
export class CommentsQueryDto extends createZodDto(commentsQuerySchema) {}
export class CommentIdParamDto extends createZodDto(z.object({ id: z.uuid() })) {}

// --- Yanıt -------------------------------------------------------------------

const commentItemSchema = z
  .object({
    id: z.uuid(),
    body: z.string(),
    createdAt: z.iso.datetime(),
    /** Yazan (hesabını kapatan kişinin yorumları gizlendiği için hep etkin bir hesap). */
    author: z.object({
      id: z.string(),
      name: z.string(),
      image: z.string().nullable(),
      role: z.enum(["user", "clinic", "shelter", "admin"]),
    }),
    /** Yazan ilan sahibi mi ("İlan sahibi" rozeti). */
    byOwner: z.boolean(),
  })
  .meta({ id: "ListingComment" })
export type CommentItem = z.infer<typeof commentItemSchema>
export class CommentDto extends createZodDto(commentItemSchema) {}

const commentPageSchema = z
  .object({
    items: z.array(commentItemSchema),
    /** Yayındaki yorumların toplam sayısı ("Yorumlar (12)"). */
    total: z.number().int(),
    nextCursor: z.string().nullable(),
  })
  .meta({ id: "ListingCommentPage" })
export type CommentPage = z.infer<typeof commentPageSchema>
export class CommentPageDto extends createZodDto(commentPageSchema) {}
