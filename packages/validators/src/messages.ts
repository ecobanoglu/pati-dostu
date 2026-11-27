import { z } from "zod"

import { ValidationCode as C } from "./codes.js"

/** Bir mesajın en fazla uzunluğu (karakter). */
export const MESSAGE_MAX = 2000

/** Mesaj metni: boşluklar kırpılır, boş olamaz. */
const body = z.string().trim().min(1, C.REQUIRED).max(MESSAGE_MAX, C.MESSAGE_TOO_LONG)

/** POST /conversations/{id}/messages gövdesi. */
export const sendMessageSchema = z.object({ body })
export type SendMessageInput = z.infer<typeof sendMessageSchema>

/**
 * POST /conversations gövdesi: ilan için konuşma başlatır (ilk mesajla). Aynı ilanda zaten konuşma varsa mesaj
 * ona eklenir (tekrar çağrılabilir).
 */
export const startConversationSchema = z.object({ listingId: z.uuid(), body })
export type StartConversationInput = z.infer<typeof startConversationSchema>

/** GET /conversations sorgusu: kişi adı ya da ilan başlığında arama, sayfa boyutu, sonraki sayfa (cursor). */
export const conversationsQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().max(100).optional(),
})
export type ConversationsQuery = z.infer<typeof conversationsQuerySchema>

/**
 * GET /conversations/{id}/messages sorgusu. Parametresiz: en yeni `limit` mesaj. `before`: daha eskiler (yukarı
 * kaydırınca). `after`: yalnız yenileri (polling — açık konuşma birkaç saniyede bir sorar). Cursor = mesaj id'si.
 * Mesajlar her durumda eskiden yeniye sıralı döner.
 */
export const messagesQuerySchema = z
  .object({
    before: z.uuid().optional(),
    after: z.uuid().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(30),
  })
  .refine((q) => !(q.before && q.after), { message: C.REQUIRED, path: ["after"] })
export type MessagesQuery = z.infer<typeof messagesQuerySchema>
