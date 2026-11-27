import type { LocalizedText } from "../../schema/_common.js"

/** Topluluk kategorileri (tasarım 01-sayfalar/07 sırası). Admin 5. aşamada düzenler. */
export const forumCategorySeed: Array<{ slug: string; name: LocalizedText; description: LocalizedText }> = [
  {
    slug: "beslenme",
    name: { tr: "Beslenme", en: "Nutrition" },
    description: { tr: "Mama, öğün ve beslenme düzeni", en: "Food, meals and feeding routines" },
  },
  {
    slug: "saglik",
    name: { tr: "Sağlık", en: "Health" },
    description: { tr: "Aşı, hastalık, veteriner kontrolü", en: "Vaccines, illness, vet check-ups" },
  },
  {
    slug: "davranis",
    name: { tr: "Davranış", en: "Behavior" },
    description: { tr: "Alışma, eğitim ve davranış sorunları", en: "Settling in, training and behavior" },
  },
  {
    slug: "sahiplenme",
    name: { tr: "Sahiplenme", en: "Adoption" },
    description: { tr: "Sahiplenme ve geçici yuva süreci", en: "Adoption and fostering" },
  },
  {
    slug: "bakim",
    name: { tr: "Bakım", en: "Care" },
    description: { tr: "Tüy, tırnak, temizlik ve günlük bakım", en: "Grooming, hygiene and daily care" },
  },
  {
    slug: "kayip-hayvan",
    name: { tr: "Kayıp hayvan", en: "Lost pets" },
    description: { tr: "Kayıp ve bulunan hayvanlar için yardım", en: "Help with lost and found pets" },
  },
  { slug: "diger", name: { tr: "Diğer", en: "Other" }, description: { tr: "Diğer konular", en: "Everything else" } },
]
