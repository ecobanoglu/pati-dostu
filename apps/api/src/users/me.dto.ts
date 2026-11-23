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
