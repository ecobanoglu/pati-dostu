import {
  ageGroups,
  genders,
  listingImagesSchema,
  listingOwnerStatusSchema,
  listingQuerySchema,
  listingSources,
  listingStatuses,
  listingTypes,
  rejectListingSchema,
  requestChangesSchema,
  reviewableFields,
  saveListingSchema,
  sizes,
} from "@pati-dostu/validators"
import { createZodDto } from "nestjs-zod"
import { z } from "zod"

// --- İstek -------------------------------------------------------------------

/** İlan kaydetme: taslak (submit: false) ya da onaya gönderim (submit: true); form ilanın tamamını gönderir. */
export class SaveListingDto extends createZodDto(saveListingSchema) {}
export class ListingOwnerStatusDto extends createZodDto(listingOwnerStatusSchema) {}
export class ListingImagesDto extends createZodDto(listingImagesSchema) {}
export class ListingQueryDto extends createZodDto(listingQuerySchema) {}
export class RejectListingDto extends createZodDto(rejectListingSchema) {}
export class RequestChangesDto extends createZodDto(requestChangesSchema) {}

/** /listings/{ref}: ilan numarası (100001) ya da uuid. */
export class ListingRefParamDto extends createZodDto(
  z.object({ ref: z.string().regex(/^(\d{6,10}|[0-9a-f-]{36})$/i) })
) {}
export class ListingIdParamDto extends createZodDto(z.object({ id: z.uuid() })) {}
export class LocaleQueryDto extends createZodDto(z.object({ locale: z.enum(["tr", "en"]).default("tr") })) {}
export class AdminQueueQueryDto extends createZodDto(
  z.object({
    status: z.enum(listingStatuses).default("pending"),
    page: z.coerce.number().int().min(1).default(1),
    locale: z.enum(["tr", "en"]).default("tr"),
  })
) {}

// --- Yanıt -------------------------------------------------------------------

const named = z.object({ name: z.string(), slug: z.string() })

/** Listelerde kullanılan ilan kartı. */
export const listingCardSchema = z
  .object({
    id: z.uuid(),
    listingNo: z.number().int(),
    /** Başlıktan üretilen kısa ad; adres /ilan/{slug}-{listingNo}. Taslakta boş olabilir. */
    slug: z.string().nullable(),
    title: z.string().nullable(),
    type: z.enum(listingTypes),
    status: z.enum(listingStatuses),
    coverUrl: z.string().nullable(),
    /** Kartın görseli üzerindeki ikonlar: cinsiyet, aşılı, kısır. */
    gender: z.enum(genders),
    vaccinated: z.boolean(),
    neutered: z.boolean(),
    species: named.nullable(),
    city: named.nullable(),
    district: z.string().nullable(),
    publishedAt: z.iso.datetime().nullable(),
    createdAt: z.iso.datetime(),
  })
  .meta({ id: "ListingCard" })
export type ListingCard = z.infer<typeof listingCardSchema>

export class ListingPageDto extends createZodDto(
  z
    .object({
      items: z.array(listingCardSchema),
      total: z.number().int(),
      page: z.number().int(),
      pageSize: z.number().int(),
    })
    .meta({ id: "ListingPage" })
) {}

export class ListingCardListDto extends createZodDto(z.array(listingCardSchema).meta({ id: "ListingCardList" })) {}

const detailFields = {
  description: z.string().nullable(),
  breed: named.nullable(),
  name: z.string().nullable(),
  gender: z.enum(genders),
  ageGroup: z.enum(ageGroups).nullable(),
  size: z.enum(sizes).nullable(),
  vaccinated: z.boolean(),
  neutered: z.boolean(),
  microchipped: z.boolean(),
  childFriendly: z.boolean(),
  source: z.enum(listingSources).nullable(),
  lastSeenAddress: z.string().nullable(),
  lastSeenLat: z.number().nullable(),
  lastSeenLng: z.number().nullable(),
  viewCount: z.number().int(),
}

/** Herkese açık ilan detayı. Telefon yalnızca ilan sahibi izin verdiyse ve bakan giriş yapmışsa döner. */
export class ListingDetailDto extends createZodDto(
  listingCardSchema
    .extend({
      ...detailFields,
      images: z.array(z.object({ url: z.string() })),
      owner: z.object({
        id: z.string(),
        name: z.string(),
        image: z.string().nullable(),
        role: z.enum(["user", "clinic", "shelter", "admin"]),
        memberSince: z.iso.datetime(),
        /** Sahibinin yayındaki ilan sayısı ("Bireysel · 3 ilan"). */
        activeListings: z.number().int(),
      }),
      /**
       * İletişim: "Telefonumu göster" açıksa maskeli numara (0532 *** ** 67). Tam numara yalnızca giriş yapmış
       * kullanıcıya, ayrı uçtan (GET /listings/{ref}/phone) verilir; böylece detay herkese açık önbelleğe alınabilir
       * ve numara sayfa kaynağında yer almaz.
       */
      contact: z.object({ showPhone: z.boolean(), phoneMasked: z.string().nullable() }),
      /** Yalnızca admin görür; diğerlerine null. */
      microchipNumber: z.string().nullable(),
    })
    .meta({ id: "ListingDetail" })
) {}

/** İlan sahibinin düzenleme formu için ilanı: ham kimlikler, fotoğraf anahtarları ve onay notları. */
export class OwnListingDto extends createZodDto(
  listingCardSchema
    .extend({
      ...detailFields,
      speciesId: z.uuid().nullable(),
      breedId: z.uuid().nullable(),
      cityId: z.uuid().nullable(),
      districtId: z.uuid().nullable(),
      microchipNumber: z.string().nullable(),
      showPhone: z.boolean(),
      images: z.array(z.object({ key: z.string(), url: z.string() })),
      /** changes_requested: admin notu ve düzeltilecek alanlar. */
      reviewNote: z.string().nullable(),
      reviewFields: z.array(z.enum(reviewableFields)).nullable(),
      /** rejected: gerekçe. */
      rejectionReason: z.string().nullable(),
      submittedAt: z.iso.datetime().nullable(),
    })
    .meta({ id: "OwnListing" })
) {}

/** GET /listings/{ref}/phone: ilan sahibinin tam telefon numarası (E.164, +90…). */
export class ListingPhoneDto extends createZodDto(z.object({ phone: z.string() }).meta({ id: "ListingPhone" })) {}

/** Admin onay kuyruğundaki ilan: kart + gönderen. */
export class AdminListingPageDto extends createZodDto(
  z
    .object({
      items: z.array(
        listingCardSchema.extend({
          owner: z.object({ id: z.string(), name: z.string(), email: z.string() }),
          submittedAt: z.iso.datetime().nullable(),
        })
      ),
      total: z.number().int(),
      page: z.number().int(),
      pageSize: z.number().int(),
    })
    .meta({ id: "AdminListingPage" })
) {}
