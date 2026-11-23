import { localeQuerySchema, uuidParamSchema } from "@pati-dostu/validators"
import { createZodDto } from "nestjs-zod"
import { z } from "zod"

// --- İstek ---

/** ?locale=tr|en (varsayılan tr): tür ve ırk adlarının dili. */
export class LocaleQueryDto extends createZodDto(localeQuerySchema) {}

/** /cities/{id}/…, /species/{id}/… yol parametresi. */
export class UuidParamDto extends createZodDto(uuidParamSchema) {}

// --- Yanıt ---

export const cityResponseSchema = z
  .object({
    id: z.uuid(),
    name: z.string(),
    slug: z.string(),
    plateCode: z.number().int(),
  })
  .meta({ id: "City" })

export class CityListResponseDto extends createZodDto(z.array(cityResponseSchema).meta({ id: "CityList" })) {}

export const districtResponseSchema = z
  .object({
    id: z.uuid(),
    name: z.string(),
    slug: z.string(),
  })
  .meta({ id: "District" })

export class DistrictListResponseDto extends createZodDto(
  z.array(districtResponseSchema).meta({ id: "DistrictList" })
) {}

export const speciesResponseSchema = z
  .object({
    id: z.uuid(),
    /** İstenen dildeki ad (çevirisi yoksa Türkçe). */
    name: z.string(),
    slug: z.string(),
    /** lucide ikon adı */
    icon: z.string().nullable(),
  })
  .meta({ id: "Species" })

export class SpeciesListResponseDto extends createZodDto(z.array(speciesResponseSchema).meta({ id: "SpeciesList" })) {}

export const breedResponseSchema = z
  .object({
    id: z.uuid(),
    name: z.string(),
    slug: z.string(),
    size: z.enum(["small", "medium", "large"]).nullable(),
    /** "Melez / Bilinmiyor"; listede her zaman ilk sırada. */
    isMixed: z.boolean(),
  })
  .meta({ id: "Breed" })

export class BreedListResponseDto extends createZodDto(z.array(breedResponseSchema).meta({ id: "BreedList" })) {}
