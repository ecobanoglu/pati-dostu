/**
 * Başlangıç verisi: il/ilçe, tür/ırk, içerik filtresi kuralları ve örnek yasaklı kelimeler.
 * Tekrar çalıştırılabilir: var olan kayıtlar atlanır (ON CONFLICT DO NOTHING).
 *
 * Çalıştır: pnpm db:seed
 *
 * il/ilçe kaynağı: turkey-neighbourhoods 4.0.3 (MIT, github.com/muratgozel/turkey-neighbourhoods),
 * memleketim-tr-cities 1.0.0 ile karşılaştırıldı: 81 il, 973 ilçe, fark yok.
 */
import { readFileSync } from "node:fs"

import { and, eq } from "drizzle-orm"

import { createDb } from "../client.js"
import { bannedTerm, breed, city, district, moderationRule, species } from "../schema/index.js"
import { normalizeTurkish, slugify } from "../text.js"
import { bannedTermSeed, moderationRuleSeed } from "./data/moderation.js"
import { speciesSeed } from "./data/species.js"

type CitySeed = { plate: number; name: string; districts: string[] }

const url = process.env.DATABASE_URL
if (!url) throw new Error("DATABASE_URL tanımlı değil (.env)")

const db = createDb(url, { max: 1 })

async function seedCities() {
  const cities = JSON.parse(readFileSync(new URL("./data/cities.json", import.meta.url), "utf8")) as CitySeed[]

  await db
    .insert(city)
    .values(cities.map((c) => ({ name: c.name, slug: slugify(c.name), plateCode: c.plate })))
    .onConflictDoNothing()

  const rows = await db.select({ id: city.id, plateCode: city.plateCode }).from(city)
  const idByPlate = new Map(rows.map((r) => [r.plateCode, r.id]))

  const districts = cities.flatMap((c) => {
    const cityId = idByPlate.get(c.plate)
    if (!cityId) throw new Error(`İl bulunamadı: ${c.plate}`)
    return c.districts.map((name) => ({ cityId, name, slug: slugify(name) }))
  })
  await db.insert(district).values(districts).onConflictDoNothing()

  console.log(`  il: ${cities.length}, ilçe: ${districts.length}`)
}

async function seedSpecies() {
  let breedCount = 0
  for (const [index, s] of speciesSeed.entries()) {
    await db
      .insert(species)
      .values({ name: s.name, slug: s.slug, icon: s.icon, sortOrder: index })
      .onConflictDoNothing()
    const [row] = await db.select({ id: species.id }).from(species).where(eq(species.slug, s.slug))
    if (!row) throw new Error(`Tür bulunamadı: ${s.slug}`)

    const breeds = [
      { speciesId: row.id, name: "Melez / Bilinmiyor", slug: "melez", isMixed: true },
      ...s.breeds.map((b) => ({ speciesId: row.id, name: b.name, slug: slugify(b.name), size: b.size })),
    ]
    await db.insert(breed).values(breeds).onConflictDoNothing()
    breedCount += breeds.length
  }
  console.log(`  tür: ${speciesSeed.length}, ırk: ${breedCount}`)
}

async function seedModeration() {
  await db.insert(moderationRule).values(moderationRuleSeed).onConflictDoNothing()
  await db
    .insert(bannedTerm)
    .values(bannedTermSeed.map((t) => ({ ...t, term: normalizeTurkish(t.term) })))
    .onConflictDoNothing()
  console.log(`  içerik kuralı: ${moderationRuleSeed.length}, yasaklı kelime: ${bannedTermSeed.length}`)
}

async function verify() {
  const [ist] = await db
    .select({ id: city.id })
    .from(city)
    .where(and(eq(city.plateCode, 34), eq(city.slug, "istanbul")))
  if (!ist) throw new Error("Doğrulama: İstanbul bulunamadı")
  const count = await db.$count(district, eq(district.cityId, ist.id))
  if (count !== 39) throw new Error(`Doğrulama: İstanbul'da 39 ilçe bekleniyordu, ${count} bulundu`)
}

try {
  console.log("Seed başlıyor…")
  await seedCities()
  await seedSpecies()
  await seedModeration()
  await verify()
  console.log("Seed tamamlandı.")
} finally {
  await db.close()
}
