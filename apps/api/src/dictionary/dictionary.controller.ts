import { Controller, Get, Header } from "@nestjs/common"
import { ApiOperation, ApiTags } from "@nestjs/swagger"
import { type Database, city } from "@pati-dostu/db"
import { asc, isNull } from "drizzle-orm"
import { ZodResponse } from "nestjs-zod"

import { Public } from "../auth/decorators.js"
import { InjectDb } from "../database/database.module.js"
import { CityListResponseDto } from "./dictionary.dto.js"

@ApiTags("dictionary")
@Public()
@Controller()
export class DictionaryController {
  constructor(@InjectDb() private readonly db: Database) {}

  /** Tüm iller, Türkçe alfabetik sırayla (kayıt formu, filtreler). Liste nadiren değiştiği için 1 gün önbelleklenebilir. */
  @Get("cities")
  @ApiOperation({ summary: "İller" })
  @Header("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800")
  @ZodResponse({ status: 200, type: CityListResponseDto })
  async cities(): Promise<CityListResponseDto> {
    const rows = await this.db
      .select({ id: city.id, name: city.name, slug: city.slug, plateCode: city.plateCode })
      .from(city)
      .where(isNull(city.deletedAt))
      .orderBy(asc(city.name))
    // Veritabanı harmanlaması (collation) Türkçe olmayabilir: Ç, Ğ, İ, Ö, Ş, Ü doğru yere gelsin diye burada sıralanır.
    return rows.sort((a, b) => a.name.localeCompare(b.name, "tr"))
  }
}
