import type { LocalizedText } from "../../schema/_common.js"

/**
 * Blog ve haber kategorileri (tasarım 03-icerik/01, 03). Blogda konu, haberde tür (Haber / Duyuru / Etkinlik).
 * Slug'lar türler arasında da benzersizdir. Admin 5. aşamada düzenler.
 */
export const postCategorySeed: Array<{ type: "blog" | "news"; slug: string; name: LocalizedText }> = [
  { type: "blog", slug: "sahiplenme", name: { tr: "Sahiplenme", en: "Adoption" } },
  { type: "blog", slug: "saglik", name: { tr: "Sağlık", en: "Health" } },
  { type: "blog", slug: "bakim", name: { tr: "Bakım", en: "Care" } },
  { type: "blog", slug: "beslenme", name: { tr: "Beslenme", en: "Nutrition" } },
  { type: "blog", slug: "davranis", name: { tr: "Davranış", en: "Behavior" } },
  { type: "news", slug: "haber", name: { tr: "Haber", en: "News" } },
  { type: "news", slug: "duyuru", name: { tr: "Duyuru", en: "Announcement" } },
  { type: "news", slug: "etkinlik", name: { tr: "Etkinlik", en: "Event" } },
]
