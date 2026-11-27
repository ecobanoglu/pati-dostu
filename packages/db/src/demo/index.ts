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
import { and, eq, inArray, isNull, like, or, sql } from "drizzle-orm"

import { createDb } from "../client.js"
import {
  breed,
  city,
  conversation,
  district,
  forumCategory,
  forumReply,
  forumReplyLike,
  forumTopic,
  forumTopicFollow,
  forumTopicImage,
  listing,
  listingComment,
  listingImage,
  message,
  report,
  species,
  user,
} from "../schema/index.js"
import { slugify } from "../text.js"
import {
  closings,
  DEMO_EMAIL_DOMAIN,
  demoComments,
  demoConversations,
  demoListings,
  demoReports,
  demoUsers,
} from "./data.js"
import { demoTopics } from "./data-forum.js"
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

/** Demo konu ve cevap kimliklerinin öneki (gerçek hesaba yazılan demo içerik de bununla bulunup silinir). */
const DEMO_TOPIC_PREFIX = "de000000-"
const DEMO_REPLY_PREFIX = "de000001-"
/** Sabit demo kimliği: önek + sıra (uuid biçiminde). */
const demoId = (prefix: string, n: number) => `${prefix}0000-4000-8000-${n.toString(16).padStart(12, "0")}`

/** `.env › DEMO_INBOX_EMAIL`'deki gerçek hesabın kimliği (yoksa null; yerine demo kullanıcı "can" kullanılır). */
async function inboxUserId(): Promise<string | null> {
  const email = process.env.DEMO_INBOX_EMAIL?.trim()
  if (!email) return null
  const [row] = await db
    .select({ id: user.id })
    .from(user)
    .where(and(eq(user.email, email), isNull(user.deletedAt)))
  return row?.id ?? null
}

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

  // Topluluk: sabit kimlikli demo konular (gerçek DEMO_INBOX_EMAIL hesabınınkiler dahil) ve demo kullanıcıların
  // konuları; cevaplar, beğeniler, takipler ve fotoğraf satırları cascade ile silinir. Demo kullanıcıların başka
  // konulardaki cevapları da silinir.
  const topics = await db
    .select({ id: forumTopic.id })
    .from(forumTopic)
    .where(or(sql`${forumTopic.id}::text like ${`${DEMO_TOPIC_PREFIX}%`}`, inArray(forumTopic.authorId, userIds)))
  const topicIds = topics.map((t) => t.id)
  const demoReplies = await db
    .select({ id: forumReply.id })
    .from(forumReply)
    .where(or(sql`${forumReply.id}::text like ${`${DEMO_REPLY_PREFIX}%`}`, inArray(forumReply.authorId, userIds)))
  const replyIds = demoReplies.map((r) => r.id)
  if (topicIds.length + replyIds.length > 0) {
    await db.delete(report).where(inArray(report.targetId, [...topicIds, ...replyIds]))
  }
  if (replyIds.length > 0) await db.delete(forumReply).where(inArray(forumReply.id, replyIds))
  for (const id of topicIds) await deletePrefix(`forum/${id}/`)
  if (topicIds.length > 0) await db.delete(forumTopic).where(inArray(forumTopic.id, topicIds))

  // Demo kullanıcıların açtığı ya da demo kullanıcı/ilan hakkındaki şikâyetler (yorum şikâyetleri demo kullanıcılarındır).
  await db
    .delete(report)
    .where(
      or(
        inArray(report.reporterId, userIds),
        inArray(report.targetId, userIds),
        listingIds.length > 0 ? inArray(report.targetId, listingIds) : undefined
      )
    )
  // Demo kullanıcıların yorumları (demo ilanlardakiler ilanla birlikte cascade silinir).
  await db.delete(listingComment).where(inArray(listingComment.authorId, userIds))

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
async function seedListings(owners: Map<string, string>): Promise<Map<string, { id: string; ownerId: string }>> {
  const dict = await loadDictionary()
  console.log("  fotoğraflar hazırlanıyor (Wikimedia Commons; önbellekteyse indirilmez)…")
  const photos = await preparePhotos(demoListings.map((l) => ({ key: l.key, query: l.query, count: l.photos })))

  let imageCount = 0
  const created = new Map<string, { id: string; ownerId: string }>()
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
    created.set(d.key, { id: row.id, ownerId })

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
  return created
}

/**
 * Demo topluluk konuları: kategoriler (db:seed), tür, fotoğraf (Commons, forum/{konuId}/), cevaplar, "Faydalı"
 * beğenileri, en iyi cevap, takipler. "inbox" yazar/takipçi `DEMO_INBOX_EMAIL` hesabıdır (Sorularım dolu görünsün).
 */
async function seedForum(owners: Map<string, string>) {
  const inbox = await inboxUserId()
  const who = (key: string) => {
    const id = key === "inbox" ? (inbox ?? owners.get("can")) : owners.get(key)
    if (!id) throw new Error(`Topluluk için kullanıcı yok: ${key}`)
    return id
  }
  const [categories, speciesRows] = await Promise.all([
    db.select({ id: forumCategory.id, slug: forumCategory.slug }).from(forumCategory),
    db.select({ id: species.id, slug: species.slug }).from(species),
  ])
  if (categories.length === 0) throw new Error("Topluluk kategorisi yok (önce pnpm db:seed)")
  const photos = await preparePhotos(
    demoTopics
      .filter((t) => t.photos)
      .map((t) => ({ key: `topic-${t.key}`, query: t.photos!.query, count: t.photos!.count }))
  )
  const now = Date.now()
  const at = (ago: number) => new Date(now - ago * 60_000)
  let replyNo = 0
  let replyCount = 0
  for (const [i, t] of demoTopics.entries()) {
    if (t.replies.some((r, j) => j > 0 && r.ago >= t.replies[j - 1]!.ago) || t.replies.some((r) => r.ago >= t.ago)) {
      throw new Error(`Cevaplar sırasız (${t.key}): "ago" konu ve önceki cevaptan küçük olmalı`)
    }
    const id = demoId(DEMO_TOPIC_PREFIX, i + 1)
    const categoryId = categories.find((c) => c.slug === t.category)?.id
    if (!categoryId) throw new Error(`Kategori yok: ${t.category}`)
    const authorId = who(t.author)
    const last = t.replies.at(-1)
    await db.insert(forumTopic).values({
      id,
      categoryId,
      speciesId: t.species ? (speciesRows.find((s) => s.slug === t.species)?.id ?? null) : null,
      authorId,
      title: t.title,
      slug: slugify(t.title),
      body: t.body,
      isSolved: t.replies.some((r) => r.best),
      viewCount: t.views,
      answerCount: t.replies.length,
      lastActivityAt: at(last?.ago ?? t.ago),
      createdAt: at(t.ago),
      updatedAt: at(last?.ago ?? t.ago),
    })
    for (const [order, file] of (photos.get(`topic-${t.key}`) ?? []).entries()) {
      const key = `forum/${id}/${randomUUID()}.jpg`
      await s3.send(
        new PutObjectCommand({ Bucket: bucket, Key: key, Body: await readFile(file), ContentType: "image/jpeg" })
      )
      await db.insert(forumTopicImage).values({ topicId: id, url: key, sortOrder: order })
    }
    const followers = new Set([authorId, ...(t.followers ?? []).map(who)])
    await db.insert(forumTopicFollow).values([...followers].map((userId) => ({ topicId: id, userId })))
    for (const r of t.replies) {
      const replyId = demoId(DEMO_REPLY_PREFIX, ++replyNo)
      const replyAuthor = who(r.author)
      const likers = [...new Set((r.likes ?? []).map(who))].filter((u) => u !== replyAuthor)
      await db.insert(forumReply).values({
        id: replyId,
        topicId: id,
        authorId: replyAuthor,
        body: r.body,
        isBestAnswer: Boolean(r.best),
        likeCount: likers.length,
        createdAt: at(r.ago),
        updatedAt: at(r.ago),
      })
      if (likers.length > 0) {
        await db.insert(forumReplyLike).values(likers.map((userId) => ({ replyId, userId })))
      }
      replyCount++
    }
  }
  console.log(
    `  topluluk: ${demoTopics.length} konu, ${replyCount} cevap${inbox ? " (DEMO_INBOX_EMAIL hesabı dahil)" : ""}`
  )
}

/** Demo ilan yorumlarını ekler (yazanlar demo kullanıcılar; ilan sahibinin yorumu "İlan sahibi" rozetli görünür). */
async function seedComments(
  owners: Map<string, string>,
  listings: Map<string, { id: string; ownerId: string }>
): Promise<Map<string, string[]>> {
  const now = Date.now()
  const rows = await db
    .insert(listingComment)
    .values(
      demoComments.map((c) => {
        const target = listings.get(c.listing)
        const authorId = owners.get(c.author)
        if (!target || !authorId) throw new Error(`Yorum için ilan/yazan yok: ${c.listing} / ${c.author}`)
        const at = new Date(now - c.ago * 60_000)
        return { listingId: target.id, authorId, body: c.body, createdAt: at, updatedAt: at }
      })
    )
    .returning({ id: listingComment.id, listingId: listingComment.listingId })
  console.log(`  yorum: ${demoComments.length}`)
  // İlan anahtarı → o ilanın yorum id'leri (demoComments sırasıyla).
  const byListing = new Map<string, string[]>()
  demoComments.forEach((c, i) => byListing.set(c.listing, [...(byListing.get(c.listing) ?? []), rows[i]!.id]))
  return byListing
}

/** Demo şikâyetleri ekler (açık durumda; admin paneli 5. aşamada listeler). */
async function seedReports(
  owners: Map<string, string>,
  listings: Map<string, { id: string; ownerId: string }>,
  comments: Map<string, string[]>
) {
  const now = Date.now()
  await db.insert(report).values(
    demoReports.map((r) => {
      const reporterId = owners.get(r.reporter)
      const targetId =
        r.target.type === "listing"
          ? listings.get(r.target.listing)?.id
          : r.target.type === "comment"
            ? comments.get(r.target.listing)?.[r.target.index]
            : owners.get(r.target.user)
      if (!reporterId || !targetId) throw new Error(`Şikâyet için yazan/hedef yok: ${r.reporter}`)
      const at = new Date(now - r.ago * 60_000)
      return {
        reporterId,
        targetType: r.target.type,
        targetId,
        reason: r.reason,
        details: r.details ?? null,
        createdAt: at,
        updatedAt: at,
      }
    })
  )
  console.log(`  şikâyet: ${demoReports.length}`)
}

/**
 * Demo konuşmaları ekler. "inbox" konuşmalarını `.env › DEMO_INBOX_EMAIL`'deki gerçek hesap başlatmış sayılır
 * (Mesajlar sayfası o hesapta dolu görünsün; karar). Değişken yoksa ya da hesap bulunamazsa yerine demo kullanıcı
 * "can" yazar. Konuşmalar demo ilanlarda olduğu için clearDemo hepsini siler.
 */
async function seedConversations(owners: Map<string, string>, listings: Map<string, { id: string; ownerId: string }>) {
  const inboxEmail = process.env.DEMO_INBOX_EMAIL?.trim()
  const [inbox] = inboxEmail
    ? await db
        .select({ id: user.id })
        .from(user)
        .where(and(eq(user.email, inboxEmail), isNull(user.deletedAt)))
    : []
  if (inboxEmail && !inbox) console.log(`  DEMO_INBOX_EMAIL hesabı bulunamadı; demo kullanıcı yazacak`)
  const now = Date.now()
  let messageCount = 0
  for (const c of demoConversations) {
    const target = listings.get(c.listing)
    if (!target) throw new Error(`Konuşma ilanı yok: ${c.listing}`)
    const starterId = c.starter === "inbox" ? (inbox?.id ?? owners.get("can")) : owners.get(c.starter)
    if (!starterId) throw new Error(`Yazan yok: ${c.starter}`)
    if (starterId === target.ownerId) continue
    if (c.messages.some((m, i) => i > 0 && m.ago >= c.messages[i - 1]!.ago)) {
      throw new Error(`Konuşma mesajları sırasız (${c.listing}): sonraki mesajın "ago" değeri daha küçük olmalı`)
    }
    const at = (ago: number) => new Date(now - ago * 60_000)
    const last = c.messages.at(-1)!
    const [row] = await db
      .insert(conversation)
      .values({
        listingId: target.id,
        starterId,
        ownerId: target.ownerId,
        lastMessageAt: at(last.ago),
        createdAt: at(c.messages[0]!.ago),
        updatedAt: at(last.ago),
      })
      .returning({ id: conversation.id })
    await db.insert(message).values(
      c.messages.map((m) => ({
        conversationId: row!.id,
        senderId: m.from === "starter" ? starterId : target.ownerId,
        body: m.body,
        // Okunanlar birkaç dakika sonra okunmuş sayılır (gelecekte olmasın).
        readAt: m.unread ? null : new Date(Math.min(now, at(m.ago).getTime() + 3 * 60_000)),
        createdAt: at(m.ago),
        updatedAt: at(m.ago),
      }))
    )
    messageCount += c.messages.length
  }
  console.log(
    `  konuşma: ${demoConversations.length}, mesaj: ${messageCount}${inbox ? ` (DEMO_INBOX_EMAIL hesabına)` : ""}`
  )
}

try {
  console.log("Demo içerik siliniyor…")
  await clearDemo()
  if (command === "seed") {
    console.log("Demo içerik ekleniyor…")
    const owners = await seedUsers()
    const listings = await seedListings(owners)
    await seedConversations(owners, listings)
    const comments = await seedComments(owners, listings)
    await seedReports(owners, listings, comments)
    await seedForum(owners)
    console.log("Tamam. Silmek için: pnpm db:demo:clear")
  }
} finally {
  await db.close()
}
