import { Controller, Get, Header, Param, Query } from "@nestjs/common"
import { ApiOperation, ApiTags } from "@nestjs/swagger"
import { ZodResponse } from "nestjs-zod"

import { Public } from "../auth/decorators.js"
import {
  BreedListResponseDto,
  CityListResponseDto,
  DistrictListResponseDto,
  LocaleQueryDto,
  SpeciesListResponseDto,
  UuidParamDto,
} from "./dictionary.dto.js"
import { DictionaryService } from "./dictionary.service.js"

/** Sözlük nadiren değişir: tarayıcı ve CDN 1 gün önbellekleyebilir, sonra arka planda yeniler. */
const CACHE_1_DAY = "public, max-age=86400, stale-while-revalidate=604800"

@ApiTags("dictionary")
@Public()
@Controller()
export class DictionaryController {
  constructor(private readonly dictionary: DictionaryService) {}

  /** Tüm iller (kayıt formu, filtreler). */
  @Get("cities")
  @ApiOperation({ summary: "İller" })
  @Header("Cache-Control", CACHE_1_DAY)
  @ZodResponse({ status: 200, type: CityListResponseDto })
  cities(): Promise<CityListResponseDto> {
    return this.dictionary.cities()
  }

  /** Bir ilin ilçeleri (ilan formu, filtreler). */
  @Get("cities/:id/districts")
  @ApiOperation({ summary: "Bir ilin ilçeleri" })
  @Header("Cache-Control", CACHE_1_DAY)
  @ZodResponse({ status: 200, type: DistrictListResponseDto })
  districts(@Param() { id }: UuidParamDto): Promise<DistrictListResponseDto> {
    return this.dictionary.districts(id)
  }

  /** Hayvan türleri, istenen dilde. */
  @Get("species")
  @ApiOperation({ summary: "Hayvan türleri" })
  @Header("Cache-Control", CACHE_1_DAY)
  @ZodResponse({ status: 200, type: SpeciesListResponseDto })
  species(@Query() { locale }: LocaleQueryDto): Promise<SpeciesListResponseDto> {
    return this.dictionary.species(locale)
  }

  /** Bir türün ırkları, istenen dilde; "Melez / Bilinmiyor" ilk sırada. */
  @Get("species/:id/breeds")
  @ApiOperation({ summary: "Bir türün ırkları" })
  @Header("Cache-Control", CACHE_1_DAY)
  @ZodResponse({ status: 200, type: BreedListResponseDto })
  breeds(@Param() { id }: UuidParamDto, @Query() { locale }: LocaleQueryDto): Promise<BreedListResponseDto> {
    return this.dictionary.breeds(id, locale)
  }
}
