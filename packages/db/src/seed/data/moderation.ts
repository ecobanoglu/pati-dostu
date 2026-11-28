import type { LocalizedText } from "../../schema/_common.js"

type Area = "listing" | "comment" | "topic" | "reply" | "message" | "contact"
type Kind = "phone" | "email" | "url" | "iban" | "price" | "duplicate"

const PUBLIC_CONTENT: Area[] = ["listing", "comment", "topic", "reply"]
/** Para alışverişi kuralları (IBAN, fiyat) özel mesajlarda da geçerli: satış yasağı mesajla aşılmasın. */
const MONEY_CONTENT: Area[] = [...PUBLIC_CONTENT, "message"]

/**
 * Hazır kalıp kuralları. Alanlar başlangıç değeridir; admin "Sözlük › İçerik filtreleri"nden değiştirir.
 * Mesajlarda yalnızca IBAN ve fiyat kuralları açık (telefon/e-posta özelde paylaşılabilir — karar, 3. aşama);
 * yasaklı kelimeler her alanda geçerli. İletişim formu başlangıçta kapsam dışı.
 */
export const moderationRuleSeed: Array<{ kind: Kind; areas: Area[]; userMessage: string }> = [
  {
    kind: "phone",
    areas: PUBLIC_CONTENT,
    userMessage:
      "Telefon numarası paylaşılamaz. İletişim için site içi mesajlaşmayı ya da ilandaki “Telefonumu göster” seçeneğini kullanın.",
  },
  {
    kind: "email",
    areas: PUBLIC_CONTENT,
    userMessage: "E-posta adresi paylaşılamaz. İletişim için site içi mesajlaşmayı kullanın.",
  },
  {
    kind: "url",
    areas: PUBLIC_CONTENT,
    userMessage: "Bağlantı (link) paylaşılamaz.",
  },
  {
    kind: "iban",
    areas: MONEY_CONTENT,
    userMessage: "IBAN veya hesap numarası paylaşılamaz. Pati Dostu'da para alışverişi yapılmaz.",
  },
  {
    kind: "price",
    areas: MONEY_CONTENT,
    userMessage: "Ücret, kapora veya fiyat içeren içerik yayınlanamaz. Pati Dostu'da hayvan satışı yasaktır.",
  },
  {
    kind: "duplicate",
    areas: ["comment", "topic", "reply"],
    userMessage: "Aynı içeriği kısa süre içinde tekrar gönderdiniz.",
  },
]

/**
 * Örnek yasaklı kelimeler (admin listeyi genişletir). Seed betiği `term`'i normalizeTurkish ile sadeleştirir.
 * exact: tam kelime, contains: kelimenin içinde geçmesi yeterli.
 */
export const bannedTermSeed: Array<{
  term: string
  category: "insult" | "sale" | "other"
  match: "exact" | "contains"
}> = [
  // Satış
  { term: "satılık", category: "sale", match: "contains" },
  { term: "satıyorum", category: "sale", match: "contains" },
  { term: "satışta", category: "sale", match: "contains" },
  { term: "kapora", category: "sale", match: "contains" },
  { term: "pazarlık", category: "sale", match: "contains" },
  { term: "ücretli", category: "sale", match: "exact" },
  { term: "fiyatı", category: "sale", match: "exact" },
  { term: "takas", category: "sale", match: "exact" },
  { term: "yavrularını satıyoruz", category: "sale", match: "contains" },
  // Hakaret
  { term: "aptal", category: "insult", match: "exact" },
  { term: "salak", category: "insult", match: "exact" },
  { term: "gerizekalı", category: "insult", match: "contains" },
  { term: "şerefsiz", category: "insult", match: "contains" },
  { term: "haysiyetsiz", category: "insult", match: "contains" },
]

/** İlan red gerekçeleri (admin › İlan onayı). Slug sabit; ad ve sıra seed'de güncellenir. */
export const rejectionReasonSeed: Array<{ slug: string; label: LocalizedText }> = [
  { slug: "satis", label: { tr: "Satış, ücret ya da kapora içeriyor", en: "Contains a sale, fee or deposit" } },
  { slug: "yaniltici", label: { tr: "Yanıltıcı ya da gerçek dışı ilan", en: "Misleading or fake listing" } },
  { slug: "uygunsuz", label: { tr: "Uygunsuz metin ya da fotoğraf", en: "Inappropriate text or photo" } },
  {
    slug: "ilgisiz-fotograf",
    label: { tr: "Fotoğraf ilanla ilgisiz ya da hayvan görünmüyor", en: "Photo is unrelated or shows no animal" },
  },
  { slug: "tekrar", label: { tr: "Aynı ilan daha önce verilmiş", en: "Duplicate of an earlier listing" } },
  { slug: "kurallara-aykiri", label: { tr: "Platform kurallarına aykırı", en: "Violates platform rules" } },
  { slug: "diger", label: { tr: "Diğer (nota bakın)", en: "Other (see note)" } },
]
