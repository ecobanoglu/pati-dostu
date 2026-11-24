import type { ListingStatus, ListingType, ReviewableField } from "@pati-dostu/validators"

/** GET /me/listings/{id} yanıtı (apps/api › OwnListingDto); düzenleme formunun başlangıç verisi. */
export type OwnListing = {
  id: string
  listingNo: number
  status: ListingStatus
  type: ListingType
  title: string | null
  description: string | null
  speciesId: string | null
  breedId: string | null
  name: string | null
  gender: "unknown" | "male" | "female"
  ageGroup: "puppy" | "young" | "adult" | "senior" | null
  size: "small" | "medium" | "large" | null
  vaccinated: boolean
  neutered: boolean
  microchipped: boolean
  microchipNumber: string | null
  childFriendly: boolean
  source: "foster_home" | "street" | "shelter" | "clinic" | null
  cityId: string | null
  districtId: string | null
  lastSeenAddress: string | null
  showPhone: boolean
  images: Array<{ key: string; url: string }>
  reviewNote: string | null
  reviewFields: ReviewableField[] | null
  rejectionReason: string | null
}

/** Form değerleri. Seçimlerde "" = seçilmedi (API'ye null gider). */
export type FormValues = {
  type: ListingType
  title: string
  description: string
  speciesId: string
  breedId: string
  name: string
  gender: "unknown" | "male" | "female"
  ageGroup: "" | "puppy" | "young" | "adult" | "senior"
  size: "" | "small" | "medium" | "large"
  vaccinated: boolean
  neutered: boolean
  microchipped: boolean
  microchipNumber: string
  childFriendly: boolean
  source: "" | "foster_home" | "street" | "shelter" | "clinic"
  cityId: string
  districtId: string
  lastSeenAddress: string
  showPhone: boolean
  images: string[]
  confirmNoFee: boolean
  /** Yalnızca formda (KVKK onayı kayıtta alındı; burada hatırlatma olarak zorunlu). */
  acceptTerms: boolean
}

export type FieldName = keyof FormValues

/** Formun başlangıç değerleri: yeni ilan ya da mevcut ilan. Mevcut ilanda onaylar yeniden istenir. */
export function initialValues(listing?: OwnListing | null): FormValues {
  return {
    type: listing?.type ?? "adoption",
    title: listing?.title ?? "",
    description: listing?.description ?? "",
    speciesId: listing?.speciesId ?? "",
    breedId: listing?.breedId ?? "",
    name: listing?.name ?? "",
    gender: listing?.gender ?? "unknown",
    ageGroup: listing?.ageGroup ?? "",
    size: listing?.size ?? "",
    vaccinated: listing?.vaccinated ?? false,
    neutered: listing?.neutered ?? false,
    microchipped: listing?.microchipped ?? false,
    microchipNumber: listing?.microchipNumber ?? "",
    childFriendly: listing?.childFriendly ?? false,
    source: listing?.source ?? "",
    cityId: listing?.cityId ?? "",
    districtId: listing?.districtId ?? "",
    lastSeenAddress: listing?.lastSeenAddress ?? "",
    showPhone: listing?.showPhone ?? false,
    images: listing?.images.map((i) => i.key) ?? [],
    confirmNoFee: false,
    acceptTerms: false,
  }
}

/** Form değerlerini API gövdesine çevirir (boş seçim/metin → null). */
export function toPayload(v: FormValues, submit: boolean) {
  const orNull = <T extends string>(s: T | "") => (s === "" ? null : s)
  return {
    type: v.type,
    title: v.title.trim() || null,
    description: v.description.trim() || null,
    speciesId: orNull(v.speciesId),
    breedId: orNull(v.breedId),
    name: v.name,
    gender: v.gender,
    ageGroup: orNull(v.ageGroup),
    size: orNull(v.size),
    vaccinated: v.vaccinated,
    neutered: v.neutered,
    microchipped: v.microchipped,
    microchipNumber: v.microchipped ? v.microchipNumber : "",
    childFriendly: v.childFriendly,
    source: orNull(v.source),
    cityId: orNull(v.cityId),
    districtId: orNull(v.districtId),
    lastSeenAddress: v.lastSeenAddress,
    showPhone: v.showPhone,
    images: v.images,
    confirmNoFee: v.confirmNoFee,
    submit,
  }
}

/** Mobil sihirbazın adımları: her adımda gösterilen bölümler ve "Devam et"te denetlenen alanlar. */
export const STEPS = [
  { sections: ["type"], fields: ["type"] },
  { sections: ["animal"], fields: ["title", "speciesId", "breedId", "name", "ageGroup", "gender", "size"] },
  { sections: ["location"], fields: ["cityId", "districtId", "lastSeenAddress"] },
  { sections: ["photos"], fields: ["images"] },
  { sections: ["description", "features"], fields: ["description", "microchipNumber", "source"] },
  { sections: ["contact"], fields: ["showPhone", "confirmNoFee", "acceptTerms"] },
] as const satisfies ReadonlyArray<{ sections: readonly SectionKey[]; fields: readonly FieldName[] }>

export type SectionKey = "type" | "animal" | "location" | "photos" | "description" | "features" | "contact"

/** Alanın bulunduğu mobil adım (hata olunca o adıma gitmek için). */
export function stepOfField(field: string): number {
  const index = STEPS.findIndex((s) => (s.fields as readonly string[]).includes(field))
  return index === -1 ? 0 : index
}
