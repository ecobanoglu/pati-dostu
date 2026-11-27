import {
  conversationsQuerySchema,
  listingStatuses,
  messagesQuerySchema,
  sendMessageSchema,
  startConversationSchema,
} from "@pati-dostu/validators"
import { createZodDto } from "nestjs-zod"
import { z } from "zod"

export class StartConversationDto extends createZodDto(startConversationSchema) {}
export class SendMessageDto extends createZodDto(sendMessageSchema) {}
export class ConversationsQueryDto extends createZodDto(conversationsQuerySchema) {}
export class MessagesQueryDto extends createZodDto(messagesQuerySchema) {}
export class ConversationIdParamDto extends createZodDto(z.object({ id: z.uuid() })) {}

// --- Yanıt -------------------------------------------------------------------

const messageItemSchema = z
  .object({
    id: z.uuid(),
    body: z.string(),
    /** Mesajı ben mi yazdım (balonun yönü). */
    mine: z.boolean(),
    createdAt: z.iso.datetime(),
    readAt: z.iso.datetime().nullable(),
  })
  .meta({ id: "Message" })
export type MessageItem = z.infer<typeof messageItemSchema>

const conversationSchema = z
  .object({
    id: z.uuid(),
    /** İlan benim mi (ben ilan sahibiyim, karşı taraf yazan kişi). */
    isOwner: z.boolean(),
    /** Karşı taraf; hesabını kapattıysa `deleted` (ad "Silinmiş kullanıcı"; yeni mesaj gönderilemez). */
    other: z.object({ id: z.string(), name: z.string(), image: z.string().nullable(), deleted: z.boolean() }),
    /** Konuşmanın ilanı; sonradan kapanmış ya da silinmiş olabilir (bağlantı yalnız yayındaysa verilmeli). */
    listing: z.object({
      id: z.uuid(),
      listingNo: z.number().int(),
      slug: z.string().nullable(),
      title: z.string().nullable(),
      status: z.enum(listingStatuses),
      deleted: z.boolean(),
      coverUrl: z.string().nullable(),
    }),
    lastMessage: z
      .object({ body: z.string(), mine: z.boolean(), createdAt: z.iso.datetime(), readAt: z.iso.datetime().nullable() })
      .nullable(),
    /** Bana gelen okunmamış mesaj sayısı. */
    unreadCount: z.number().int(),
    lastMessageAt: z.iso.datetime().nullable(),
  })
  .meta({ id: "Conversation" })
export type Conversation = z.infer<typeof conversationSchema>

export class ConversationDto extends createZodDto(conversationSchema) {}

const conversationPageSchema = z
  .object({ items: z.array(conversationSchema), nextCursor: z.string().nullable() })
  .meta({ id: "ConversationPage" })
export type ConversationPage = z.infer<typeof conversationPageSchema>
export class ConversationPageDto extends createZodDto(conversationPageSchema) {}

export class MessageDto extends createZodDto(messageItemSchema) {}

const messagePageSchema = z
  .object({
    items: z.array(messageItemSchema),
    /** İstenen yönde (eskiler ya da yeniler) daha mesaj var mı. */
    hasMore: z.boolean(),
    /** Karşı tarafın okuduğu benim son mesajımın zamanı; bu ve öncesindeki mesajlarım "Okundu". */
    readUpTo: z.iso.datetime().nullable(),
  })
  .meta({ id: "MessagePage" })
export type MessagePage = z.infer<typeof messagePageSchema>
export class MessagePageDto extends createZodDto(messagePageSchema) {}

export class MessagesUnreadDto extends createZodDto(
  z.object({ count: z.number().int() }).meta({ id: "MessagesUnread" })
) {}
