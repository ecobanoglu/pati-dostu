import type { ReviewableField } from "@pati-dostu/validators"

/**
 * Admin'in "düzeltme iste" ile işaretlediği alanın etiketi (messages › ListingForm anahtarı). İlan formu ve
 * İlanlarım aynı adları gösterir.
 */
export const reviewFieldLabel = {
  type: "sectionType",
  title: "listingTitle",
  species: "species",
  breed: "breed",
  name: "name",
  ageGroup: "ageGroup",
  gender: "gender",
  size: "size",
  location: "sectionLocation",
  images: "sectionPhotos",
  description: "sectionDescription",
  features: "sectionFeatures",
  source: "sourceGroup",
  contact: "sectionContact",
} as const satisfies Record<ReviewableField, string>
