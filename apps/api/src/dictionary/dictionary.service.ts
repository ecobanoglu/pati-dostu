import { HttpStatus, Injectable } from "@nestjs/common"
import { breed, city, type Database, district, localize, species } from "@pati-dostu/db"
import type { Locale } from "@pati-dostu/validators"
import { and, asc, eq, isNull } from "drizzle-orm"

import { AppException, ErrorCode } from "../common/errors.js"
import { InjectDb } from "../database/database.module.js"

/** Dile göre alfabetik karşılaştırma (Ç, Ğ, İ, Ö, Ş, Ü doğru yerde); veritabanı harmanlamasına güvenmez. */
const byName = (locale: Locale) => (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, locale)

/** Sözlük verileri: il, ilçe, tür, ırk. Yalnızca silinmemiş kayıtlar döner. */
@Injectable()
export class DictionaryService {
  constructor(@InjectDb() private readonly db: Database) {}

  /** Tüm iller, Türkçe alfabetik. */
  async cities() {
    const rows = await this.db
      .select({ id: city.id, name: city.name, slug: city.slug, plateCode: city.plateCode })
      .from(city)
      .where(isNull(city.deletedAt))
    return rows.sort(byName("tr"))
  }

  /** Bir ilin ilçeleri, Türkçe alfabetik. İl yoksa 404. */
  async districts(cityId: string) {
    await this.ensureExists(city, cityId)
    const rows = await this.db
      .select({ id: district.id, name: district.name, slug: district.slug })
      .from(district)
      .where(and(eq(district.cityId, cityId), isNull(district.deletedAt)))
    return rows.sort(byName("tr"))
  }

  /** Hayvan türleri, sıralama alanına göre; adlar istenen dilde. */
  async species(locale: Locale) {
    const rows = await this.db
      .select({ id: species.id, name: species.name, slug: species.slug, icon: species.icon })
      .from(species)
      .where(isNull(species.deletedAt))
      .orderBy(asc(species.sortOrder))
    return rows.map((r) => ({ ...r, name: localize(r.name, locale) }))
  }

  /** Bir türün ırkları: "Melez / Bilinmiyor" ilk sırada, diğerleri istenen dilde alfabetik. Tür yoksa 404. */
  async breeds(speciesId: string, locale: Locale) {
    await this.ensureExists(species, speciesId)
    const rows = await this.db
      .select({ id: breed.id, name: breed.name, slug: breed.slug, size: breed.size, isMixed: breed.isMixed })
      .from(breed)
      .where(and(eq(breed.speciesId, speciesId), isNull(breed.deletedAt)))
    const localized = rows.map((r) => ({ ...r, name: localize(r.name, locale) }))
    const sorted = localized.filter((r) => !r.isMixed).sort(byName(locale))
    return [...localized.filter((r) => r.isMixed), ...sorted]
  }

  /** Üst kayıt (il, tür) yoksa veya silinmişse 404 fırlatır. */
  private async ensureExists(table: typeof city | typeof species, id: string) {
    const [row] = await this.db
      .select({ id: table.id })
      .from(table)
      .where(and(eq(table.id, id), isNull(table.deletedAt)))
      .limit(1)
    if (!row) throw new AppException(HttpStatus.NOT_FOUND, ErrorCode.NOT_FOUND, "Kayıt bulunamadı.")
  }
}
