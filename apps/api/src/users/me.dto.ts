import { listingStatuses } from "@pati-dostu/validators"
import { createZodDto } from "nestjs-zod"
import { z } from "zod"

export const meResponseSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    email: z.email(),
    emailVerified: z.boolean(),
    image: z.string().nullable(),
    role: z.enum(["user", "clinic", "shelter", "admin"]),
    phone: z.string().nullable(),
    cityId: z.uuid().nullable(),
    locale: z.enum(["tr", "en"]),
    marketingOptIn: z.boolean(),
    /** Boşsa (Google ile ilk giriş) web KVKK onay ekranını gösterir. */
    termsAcceptedAt: z.iso.datetime().nullable(),
  })
  .meta({ id: "Me" })

export class MeResponseDto extends createZodDto(meResponseSchema) {}

/** GET /me/summary: Hesabım › Panel özeti sayıları. */
export const meSummarySchema = z
  .object({
    /** İlan sayısı, duruma göre (tüm durumlar; olmayan 0). */
    listings: z.object(
      Object.fromEntries(listingStatuses.map((s) => [s, z.number().int()])) as Record<
        (typeof listingStatuses)[number],
        z.ZodNumber
      >
    ),
    favorites: z.number().int(),
    /** İlanlarının toplam görüntülenme sayısı. */
    views: z.number().int(),
  })
  .meta({ id: "MeSummary" })

export class MeSummaryDto extends createZodDto(meSummarySchema) {}
