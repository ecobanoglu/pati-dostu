import { createZodDto } from "nestjs-zod"
import { z } from "zod"

export const cityResponseSchema = z
  .object({
    id: z.uuid(),
    name: z.string(),
    slug: z.string(),
    plateCode: z.number().int(),
  })
  .meta({ id: "City" })

export class CityListResponseDto extends createZodDto(z.array(cityResponseSchema).meta({ id: "CityList" })) {}
