import { z } from "zod"

import { ValidationCode as C } from "./codes.js"
import { MAX_LISTING_IMAGES } from "./uploads.js"

// --- Seçenekler (veritabanı pgEnum'larıyla aynı) -----------------------------

export const listingTypes = ["adoption", "foster", "lost", "found"] as const
export const genders = ["unknown", "male", "female"] as const
export const ageGroups = ["puppy", "young", "adult", "senior"] as const
export const sizes = ["small", "medium", "large"] as const
export const listingSources = ["foster_home", "street", "shelter", "clinic"] as const
export const listingStatuses = [
  "draft",
  "pending",
  "changes_requested",
  "active",
  "adopted",
  "closed",
  "rejected",
] as const

export type ListingType = (typeof listingTypes)[number]
export type ListingStatus = (typeof listingStatuses)[number]

/** Son görülme konumu yalnızca kayıp ve bulunan ilanlarında. */
export const LOCATION_TYPES: readonly ListingType[] = ["lost", "found"]

export const TITLE_MIN = 10
export const TITLE_MAX = 80
export const DESCRIPTION_MIN = 50
export const DESCRIPTION_MAX = 5000

/** Admin'in "düzeltme iste" derken işaretleyebileceği alanlar (formdaki bölümlerle eşleşir). */
export const reviewableFields = [
  "type",
  "title",
  "species",
  "breed",
  "name",
  "ageGroup",
  "gender",
  "size",
  "location",
  "images",
  "description",
  "features",
  "source",
  "contact",
] as const
export type ReviewableField = (typeof reviewableFields)[number]

// --- Alanlar -------------------------------------------------------------------

/** Boş metni "girilmedi" (null) sayar: formlardaki boş alanlar için. */
const optionalText = (max: number, code: string) =>
  z
    .string()
    .trim()
    .max(max, code)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional()

const fields = {
  type: z.enum(listingTypes, C.REQUIRED),
  title: z.string(C.REQUIRED).trim().min(TITLE_MIN, C.TITLE_TOO_SHORT).max(TITLE_MAX, C.TITLE_TOO_LONG),
  description: z
    .string(C.REQUIRED)
    .trim()
    .min(DESCRIPTION_MIN, C.DESCRIPTION_TOO_SHORT)
    .max(DESCRIPTION_MAX, C.DESCRIPTION_TOO_LONG),
  speciesId: z.uuid(C.REQUIRED),
  breedId: z.uuid().nullable().optional(),
  name: optionalText(40, C.NAME_TOO_LONG),
  gender: z.enum(genders).default("unknown"),
  ageGroup: z.enum(ageGroups, C.REQUIRED),
  size: z.enum(sizes, C.REQUIRED),
  vaccinated: z.boolean().default(false),
  neutered: z.boolean().default(false),
  microchipped: z.boolean().default(false),
  /** 15 haneli ISO çip numarası; yalnızca admin görür. */
  microchipNumber: z
    .string()
    .trim()
    .regex(/^\d{15}$/, C.MICROCHIP_INVALID)
    .or(z.literal("").transform(() => null))
    .nullable()
    .optional(),
  childFriendly: z.boolean().default(false),
  source: z.enum(listingSources).nullable().optional(),
  cityId: z.uuid(C.REQUIRED),
  districtId: z.uuid(C.REQUIRED),
  lastSeenAddress: optionalText(200, C.ADDRESS_TOO_LONG),
  lastSeenLat: z.number().min(-90).max(90).nullable().optional(),
  lastSeenLng: z.number().min(-180).max(180).nullable().optional(),
  showPhone: z.boolean().default(false),
  /** Sıralı fotoğraf anahtarları (ilk = kapak): yeni yüklemeler tmp/…, mevcutlar listings/{id}/…. */
  images: z.array(z.string().min(1)).max(MAX_LISTING_IMAGES, C.TOO_MANY_IMAGES).default([]),
}

/** Çapraz kurallar: çip numarası yalnız "mikroçipli" ise, son görülme konumu yalnız kayıp/bulunanda. */
function crossChecks(v: { microchipped?: boolean; microchipNumber?: string | null }, ctx: z.RefinementCtx) {
  if (v.microchipNumber && !v.microchipped) {
    ctx.addIssue({ code: "custom", message: C.MICROCHIP_INVALID, path: ["microchipNumber"] })
  }
}

/**
 * "Onaya gönder": tüm zorunlu alanlar ve en az 1 fotoğraf. Ücret talep etmeme onayı zorunludur (satış yasağı).
 * POST /listings ve PATCH /listings/{id} gövdesi (submit: true).
 */
export const submitListingSchema = z
  .object({
    ...fields,
    images: fields.images.refine((v) => v.length >= 1, C.IMAGES_REQUIRED),
    confirmNoFee: z.literal(true, C.NO_FEE_NOT_CONFIRMED),
    submit: z.literal(true),
  })
  .superRefine(crossChecks)

/**
 * "Taslak olarak kaydet": yalnızca ilan türü zorunlu, diğer alanlar boş olabilir; girilen alanlar yine kurallara
 * uymalıdır (ör. başlık girilmişse 10–80 karakter). Onaya gönderirken tam şema uygulanır.
 */
export const draftListingSchema = z
  .object({
    type: fields.type,
    title: fields.title.nullable().optional(),
    description: z.string().trim().max(DESCRIPTION_MAX, C.DESCRIPTION_TOO_LONG).nullable().optional(),
    speciesId: fields.speciesId.nullable().optional(),
    breedId: fields.breedId,
    name: fields.name,
    gender: fields.gender,
    ageGroup: fields.ageGroup.nullable().optional(),
    size: fields.size.nullable().optional(),
    vaccinated: fields.vaccinated,
    neutered: fields.neutered,
    microchipped: fields.microchipped,
    microchipNumber: fields.microchipNumber,
    childFriendly: fields.childFriendly,
    source: fields.source,
    cityId: fields.cityId.nullable().optional(),
    districtId: fields.districtId.nullable().optional(),
    lastSeenAddress: fields.lastSeenAddress,
    lastSeenLat: fields.lastSeenLat,
    lastSeenLng: fields.lastSeenLng,
    showPhone: fields.showPhone,
    images: fields.images,
    confirmNoFee: z.boolean().optional(),
  })
  .superRefine(crossChecks)

/**
 * İlan kaydetme gövdesi (POST /listings, PATCH /listings/{id}); form her zaman ilanın tamamını gönderir.
 * submit: false → taslak kuralları; submit: true → ayrıca onaya gönderim kuralları (submitListingSchema) uygulanır
 * ve hatalar aynı alan yollarıyla döner. (İki şemanın birleşimi yerine tek nesne: API'de DTO sınıfı türetilebilsin.)
 */
export const saveListingSchema = draftListingSchema.safeExtend({ submit: z.boolean() }).superRefine((value, ctx) => {
  if (!value.submit) return
  const full = submitListingSchema.safeParse(value)
  if (!full.success) {
    for (const issue of full.error.issues) ctx.addIssue({ code: "custom", message: issue.message, path: issue.path })
  }
})
export type SaveListingInput = z.input<typeof saveListingSchema>
export type SaveListing = z.output<typeof saveListingSchema>
export type SubmitListing = z.output<typeof submitListingSchema>

/** İlan sahibinin durum değişikliği: yayındaki ilanı "sahiplendirildi" ya da "kapatıldı" yapar. */
export const listingOwnerStatusSchema = z.object({
  status: z.enum(["adopted", "closed"]),
})

/** Fotoğraf sırası / kapak (PUT /listings/{id}/images). */
export const listingImagesSchema = z.object({
  images: fields.images,
})

// --- Listeleme ---------------------------------------------------------------

const csv = <T extends readonly [string, ...string[]]>(values: T) =>
  z
    .string()
    .transform((s) => s.split(",").filter(Boolean))
    .pipe(z.array(z.enum(values)))
    .optional()

export const listingFeatures = ["vaccinated", "neutered", "microchipped", "childFriendly"] as const

/**
 * GET /listings sorgusu. Tür, il, ilçe ve ırk slug ile verilir (URL'lerde okunaklı ve SEO dostu):
 * ?type=adoption&species=kedi&city=izmir&district=bornova&features=vaccinated,neutered&q=tekir&sort=newest&page=2
 */
export const listingQuerySchema = z.object({
  type: csv(listingTypes),
  species: z.string().max(60).optional(),
  breed: z.string().max(80).optional(),
  city: z.string().max(60).optional(),
  district: z.string().max(60).optional(),
  gender: csv(genders),
  ageGroup: csv(ageGroups),
  size: csv(sizes),
  source: csv(listingSources),
  features: csv(listingFeatures),
  q: z.string().trim().max(100).optional(),
  sort: z.enum(["newest", "oldest"]).default("newest"),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  pageSize: z.coerce.number().int().min(1).max(48).default(24),
  locale: z.enum(["tr", "en"]).default("tr"),
})
export type ListingQuery = z.output<typeof listingQuerySchema>

// --- Admin -------------------------------------------------------------------

/** Admin notu sınırı (red / düzeltme isteğinde kullanıcıya giden açıklama). */
export const REVIEW_NOTE_MAX = 1000

/**
 * POST /admin/listings/{id}/reject: hazır gerekçe (`reasonId`, Sözlük › Red gerekçeleri) ve/veya kullanıcıya not.
 * Gerekçe seçilmezse not en az 10 karakter olmalı (eski istemciler `reason` gönderir — not olarak kabul edilir).
 * Kullanıcının gördüğü metin: gerekçenin adı + not.
 */
export const rejectListingSchema = z
  .object({
    reasonId: z.uuid().optional(),
    note: z.string().trim().max(REVIEW_NOTE_MAX).optional(),
    reason: z.string().trim().max(REVIEW_NOTE_MAX).optional(),
  })
  .transform(({ reasonId, note, reason }) => ({ reasonId, note: note || reason || "" }))
  .superRefine((v, ctx) => {
    if (!v.reasonId && v.note.length < 10)
      ctx.addIssue({ code: "custom", path: ["reasonId"], message: C.REASON_REQUIRED })
  })
export type RejectListingInput = z.input<typeof rejectListingSchema>

/** POST /admin/listings/{id}/request-changes: kullanıcıya not (zorunlu) ve düzeltilecek bölümler (isteğe bağlı). */
export const requestChangesSchema = z.object({
  note: z.string().trim().min(10, C.REASON_TOO_SHORT).max(REVIEW_NOTE_MAX),
  fields: z.array(z.enum(reviewableFields)).default([]),
})
export type RequestChangesInput = z.input<typeof requestChangesSchema>

/**
 * Onay kuyruğundaki işaretler (basit otomatik kontroller — karar): yeni üye (hesap 7 günden yeni ve yayında ilanı
 * yok), içerik (yasaklı kelime / telefon / fiyat vb. kalıp), benzer ilan (aynı kullanıcının benzer başlıklı başka
 * ilanı), kurum hesabı (bilgi), düzenlenmiş (daha önce incelenmiş). İlk üçü "İşaretli" süzgecine girer.
 */
export const reviewFlags = ["new_user", "content", "similar", "organization", "resubmitted"] as const
export type ReviewFlag = (typeof reviewFlags)[number]
export const warningFlags: readonly ReviewFlag[] = ["new_user", "content", "similar"]

/** GET /admin/listings/queue: süzgeç (tümü / işaretli / kurum / düzenlenmiş) ve sıralama. */
export const reviewQueueQuerySchema = z.object({
  filter: z.enum(["all", "flagged", "organization", "resubmitted"]).default("all"),
  sort: z.enum(["oldest", "newest"]).default("oldest"),
  locale: z.enum(["tr", "en"]).default("tr"),
})
export type ReviewQueueQuery = z.infer<typeof reviewQueueQuerySchema>
