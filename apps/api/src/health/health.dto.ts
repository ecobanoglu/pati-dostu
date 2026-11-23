import { createZodDto } from "nestjs-zod"
import { z } from "zod"

export const healthResponseSchema = z
  .object({
    status: z.literal("ok"),
    uptime: z.number().describe("Sürecin çalışma süresi (saniye)"),
    timestamp: z.iso.datetime().describe("Sunucu saati (ISO 8601, UTC)"),
  })
  .meta({ id: "HealthResponse" })

export class HealthResponseDto extends createZodDto(healthResponseSchema) {}
