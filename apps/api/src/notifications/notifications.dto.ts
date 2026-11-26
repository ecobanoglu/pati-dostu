import { markNotificationsReadSchema, notificationsQuerySchema, notificationTypeList } from "@pati-dostu/validators"
import { createZodDto } from "nestjs-zod"
import { z } from "zod"

export class NotificationsQueryDto extends createZodDto(notificationsQuerySchema) {}
export class MarkNotificationsReadDto extends createZodDto(markNotificationsReadSchema) {}

/** Tek bildirim: tür + veri (metin istemcide kullanıcının dilinde üretilir). */
const notificationItemSchema = z
  .object({
    id: z.uuid(),
    type: z.enum(notificationTypeList as [string, ...string[]]),
    /** Türe göre: ilan no/başlık/slug, red gerekçesi, admin notu, favori sonucu (outcome). */
    payload: z.record(z.string(), z.unknown()),
    readAt: z.iso.datetime().nullable(),
    createdAt: z.iso.datetime(),
  })
  .meta({ id: "Notification" })

export class NotificationPageDto extends createZodDto(
  z
    .object({
      items: z.array(notificationItemSchema),
      unreadCount: z.number().int(),
      /** Sonraki sayfa için; yoksa null. */
      nextCursor: z.string().nullable(),
    })
    .meta({ id: "NotificationPage" })
) {}

export class UnreadCountDto extends createZodDto(z.object({ count: z.number().int() }).meta({ id: "UnreadCount" })) {}
