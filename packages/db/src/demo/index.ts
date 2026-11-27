/**
 * Demo (sahte) içerik: gerçek hayvan fotoğraflı ilanlar ve demo kullanıcılar. Yalnızca geliştirme içindir;
 * yayından önce silinir.
 *
 *   pnpm db:demo         → demo içeriği (yeniden) oluşturur: önce eskisini siler, sonra ekler
 *   pnpm db:demo:clear   → tüm demo içeriği siler (kullanıcılar, ilanlar, fotoğraflar, favoriler)
 *
 * Demo kayıtlar, e-postası `@demo.pati-dostu.test` ile biten kullanıcılara aittir; silme buna göre yapılır.
 * Güvenlik: DATABASE_URL ve S3_ENDPOINT yerel değilse (localhost/127.0.0.1) çalışmaz; bilerek uzak bir ortama
 * yazmak için `--force` gerekir.
 */
import { randomUUID } from "node:crypto"
import { readFile } from "node:fs/promises"

import { DeleteObjectsCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from "@aws-sdk/client-s3"
import { and, eq, inArray, like, or, sql } from "drizzle-orm"

import { createDb } from "../client.js"
import { breed, city, conversation, district, listing, listingImage, species, user } from "../schema/index.js"
import { slugify } from "../text.js"
import { closings, DEMO_EMAIL_DOMAIN, demoListings, demoUsers } from "./data.js"
import { CACHE_DIR, preparePhotos } from "./photos.js"

const command = process.argv[2] === "clear" ? "clear" : "seed"
const force = process.argv.includes("--force")

/** Ortam değişkenini okur; yoksa açık bir hatayla durur. */
function env(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} tanımlı değil (.env)`)
  return value
}

/** Adres yerel mi (localhost, 127.0.0.1, ::1)? */
function isLocal(url: string): boolean {
  const host = new URL(url).hostname
  return host === "localhost" || host === "127.0.0.1" || host === "::1"
}

const databaseUrl = env("DATABASE_URL")
const s3Endpoint = env("S3_ENDPOINT")
if (!force && (!isLocal(databaseUrl) || !isLocal(s3Endpoint))) {
  throw new Error(
    "Demo içerik yalnızca yerel veritabanı ve depoya yazılır. Uzak bir ortamda çalıştırmak için --force ekleyin."
  )
}

const db = createDb(databaseUrl, { max: 1 })
const bucket = env("S3_BUCKET")
const s3 = new S3Client({
  endpoint: s3Endpoint,
  region: env("S3_REGION"),
  credentials: { accessKeyId: env("S3_ACCESS_KEY_ID"), secretAccessKey: env("S3_SECRET_ACCESS_KEY") },
  forcePathStyle: true,
})

const demoEmail = (key: string) => `${key}@${DEMO_EMAIL_DOMAIN}`

/** Depodaki bir klasörü (önek) tamamen siler. */
async function deletePrefix(prefix: string) {
  let token: string | undefined
  do {
    const page = await s3.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, ContinuationToken: token }))
    const keys = (page.Contents ?? []).flatMap((o) => (o.Key ? [{ Key: o.Key }] : []))
    if (keys.length > 0) await s3.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: keys } }))
    token = page.NextContinuationToken
  } while (token)
}

/**
 * Tüm demo içeriği siler: demo konuşmaları (mesajlarıyla), demo kullanıcıların ilanlarının fotoğrafları (depo),
 * ilanlar (fotoğraf satırları ve favoriler cascade ile), yükleme klasörleri ve kullanıcılar (oturum/hesap cascade ile).
 */
async function clearDemo() {
  const users = await db
    .select({ id: user.id })
    .from(user)
    .where(like(user.email, `%@${DEMO_EMAIL_DOMAIN}`))
  if (users.length === 0) return console.log("  silinecek demo içerik yok")
  const userIds = users.map((u) => u.id)
  const listings = await db.select({ id: listing.id }).from(listing).where(inArray(listing.ownerId, userIds))

  // Demo kullanıcının katıldığı ya da demo ilandaki konuşmalar (gerçek kullanıcı demo ilana yazmış olabilir);
  // mesajlar cascade ile silinir.
  const listingIds = listings.map((l) => l.id)
  await db
    .delete(conversation)
    .where(
      or(
        inArray(conversation.starterId, userIds),
        inArray(conversation.ownerId, userIds),
        listingIds.length > 0 ? inArray(conversation.listingId, listingIds) : undefined
      )
    )

  for (const { id } of listings) await deletePrefix(`listings/${id}/`)
  for (const id of userIds) await deletePrefix(`tmp/listing-images/${id}/`)
  if (listings.length > 0) {
    await db.delete(listing).where(
      inArray(
        listing.id,
        listings.map((l) => l.id)
      )
    )
  }
  await db.delete(user).where(inArray(user.id, userIds))
  console.log(`  silindi: ${users.length} kullanıcı, ${listings.length} ilan`)
}

/** Demo kullanıcıları ekler (giriş yapılamaz; yalnızca içerik sahibi). */
async function seedUsers(): Promise<Map<string, string>> {
  const rows = demoUsers.map((u, i) => ({
    id: `demo-${u.key}`,
    name: u.name,
    email: demoEmail(u.key),
    emailVerified: true,
    role: u.role,
    phone: u.phone,
    locale: "tr" as const,
    termsAcceptedAt: new Date(),
    // Üyelik tarihleri birkaç ay geriye yayılır ("üye olduğu tarih" gerçekçi görünsün).
    createdAt: new Date(Date.now() - (120 + i * 45) * 86_400_000),
  }))
  await db.insert(user).values(rows)
  return new Map(demoUsers.map((u) => [u.key, `demo-${u.key}`]))
}

/** Sözlük kimlikleri: tür (slug), ırk (tür + Türkçe ad), il (slug), ilçe (il + ad). */
async function loadDictionary() {
  const [speciesRows, breedRows, cityRows] = await Promise.all([
    db.select({ id: species.id, slug: species.slug }).from(species),
    db.select({ id: breed.id, speciesId: breed.speciesId, name: breed.name, isMixed: breed.isMixed }).from(breed),
    db.select({ id: city.id, slug: city.slug }).from(city),
  ])
  const citySlugs = [...new Set(demoListings.map((l) => l.city))]
  const cityIds = cityRows.filter((c) => citySlugs.includes(c.slug)).map((c) => c.id)
  const districtRows = await db
    .select({ id: district.id, cityId: district.cityId, name: district.name })
    .from(district)
    .where(inArray(district.cityId, cityIds))

  const speciesId = (slug: string) => {
    const row = speciesRows.find((s) => s.slug === slug)
    if (!row) throw new Error(`Tür yok: ${slug} (önce pnpm db:seed)`)
    return row.id
  }
  const breedId = (speciesSlug: string, name: string | null) => {
    const sid = speciesId(speciesSlug)
    const row = breedRows.find((b) => b.speciesId === sid && (name ? b.name.tr === name : b.isMixed))
    if (!row) throw new Error(`Irk yok: ${speciesSlug} / ${name ?? "melez"}`)
    return row.id
  }
  const cityId = (slug: string) => {
    const row = cityRows.find((c) => c.slug === slug)
    if (!row) throw new Error(`İl yok: ${slug}`)
    return row.id
  }
  const districtId = (citySlug: string, name: string) => {
    const cid = cityId(citySlug)
    const row = districtRows.find((d) => d.cityId === cid && d.name === name)
    if (!row) throw new Error(`İlçe yok: ${citySlug} / ${name}`)
    return row.id
  }
  return { speciesId, breedId, cityId, districtId }
}

/** Demo ilanları, fotoğraflarıyla birlikte ekler. */
async function seedListings(owners: Map<string, string>) {
  const dict = await loadDictionary()
  console.log("  fotoğraflar hazırlanıyor (Wikimedia Commons; önbellekteyse indirilmez)…")
  const photos = await preparePhotos(demoListings.map((l) => ({ key: l.key, query: l.query, count: l.photos })))

  let imageCount = 0
  for (const [i, d] of demoListings.entries()) {
    const ownerId = owners.get(d.owner)
    if (!ownerId) throw new Error(`Sahip yok: ${d.owner}`)
    const published = new Date(Date.now() - d.daysAgo * 86_400_000 - i * 37 * 60_000)
    const status = d.status ?? "active"
    const [row] = await db
      .insert(listing)
      .values({
        ownerId,
        type: d.type,
        title: d.title,
        slug: slugify(d.title),
        description: `${d.about}\n\n${closings[d.type]}`,
        speciesId: dict.speciesId(d.species),
        breedId: dict.breedId(d.species, d.breed),
        name: d.name,
        gender: d.gender,
        ageGroup: d.age,
        size: d.size,
        vaccinated: d.vaccinated ?? false,
        neutered: d.neutered ?? false,
        microchipped: d.microchipped ?? false,
        childFriendly: d.childFriendly ?? false,
        source: d.type === "lost" || d.type === "found" ? null : (d.source ?? null),
        cityId: dict.cityId(d.city),
        districtId: dict.districtId(d.city, d.district),
        lastSeenAddress: d.type === "lost" || d.type === "found" ? (d.lastSeen ?? null) : null,
        showPhone: d.showPhone ?? false,
        status,
        submittedAt: published,
        reviewedAt: published,
        publishedAt: published,
        closedAt: status === "active" ? null : new Date(),
        viewCount: 15 + ((i * 53) % 340),
        createdAt: published,
        updatedAt: published,
      })
      .returning({ id: listing.id })
    if (!row) throw new Error(`İlan eklenemedi: ${d.key}`)

    const files = photos.get(d.key) ?? []
    for (const [order, file] of files.entries()) {
      const key = `listings/${row.id}/${randomUUID()}.jpg`
      await s3.send(
        new PutObjectCommand({ Bucket: bucket, Key: key, Body: await readFile(file), ContentType: "image/jpeg" })
      )
      await db.insert(listingImage).values({ listingId: row.id, url: key, sortOrder: order, isCover: order === 0 })
      imageCount++
    }
  }
  const [{ total } = { total: 0 }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(listing)
    .where(and(inArray(listing.ownerId, [...owners.values()]), eq(listing.status, "active")))
  console.log(`  ilan: ${demoListings.length} (yayında ${total}), fotoğraf: ${imageCount}`)
  console.log(`  fotoğraf kaynakları ve lisansları: ${CACHE_DIR}/attributions.json`)
}

try {
  console.log("Demo içerik siliniyor…")
  await clearDemo()
  if (command === "seed") {
    console.log("Demo içerik ekleniyor…")
    const owners = await seedUsers()
    await seedListings(owners)
    console.log("Tamam. Silmek için: pnpm db:demo:clear")
  }
} finally {
  await db.close()
}
