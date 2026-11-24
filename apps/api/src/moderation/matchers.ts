/*
 * İçerik filtresinin kalıp eşleştiricileri (saf fonksiyonlar, Nest'ten bağımsız; birim testleri: matchers.test.ts).
 * Hepsi normalizeTurkish ile sadeleştirilmiş metin üzerinde çalışır: küçük harf, ı→i, ş→s… ("İBAN" = "iban").
 * Amaç kişisel iletişim bilgisi ve satışın yayınlanmasını önlemek; masum metinde yanlış alarm vermemek için
 * kalıplar bilinçli olarak dar tutuldu (ör. tarih, yaş, adres numarası telefon sayılmaz).
 */

export type PatternKind = "phone" | "email" | "url" | "iban" | "price"

/** Rakam grupları arasındaki ayraçları kaldırır: "0532 123-45.67" → "05321234567" (telefon/IBAN gizleme denemeleri). */
function joinDigitGroups(text: string): string {
  return text.replace(/(?<=\d)[\s.\-()/]+(?=\d)/g, "")
}

/** IBAN: "TR" + 24 rakam (aralarında boşluk olabilir). */
export function hasIban(text: string): boolean {
  return /\btr\d{24}\b/.test(joinDigitGroups(text).replace(/tr\s+(?=\d)/g, "tr"))
}

/**
 * Telefon: ayraçlar kaldırıldıktan sonra 10–13 haneli rakam dizisi (05xx…, 5xx…, 905xx…, 0212…).
 * Daha kısa sayılar (yaş, tarih, fiyat, adres) ve 14+ haneli diziler (çip numarası gibi) telefon sayılmaz.
 */
export function hasPhone(text: string): boolean {
  const joined = joinDigitGroups(text.replace(/\+(?=\s*\d)/g, ""))
  return /(?<!\d)(?:90)?0?[2-5]\d{9}(?!\d)/.test(joined)
}

/** E-posta, gizleme denemeleriyle birlikte: "ad@site.com", "ad (at) site nokta com", "ad [at] site [dot] com". */
export function hasEmail(text: string): boolean {
  const at = String.raw`(?:@|\(at\)|\[at\]|\s+at\s+)`
  const dot = String.raw`(?:\.|\(dot\)|\[dot\]|\s+nokta\s+|\s+dot\s+)`
  return new RegExp(String.raw`[a-z0-9._%+-]+\s*${at}\s*[a-z0-9-]+(?:\s*${dot}\s*[a-z]{2,})+`).test(text)
}

/** Yaygın alan adı uzantıları (yalnız bunlar URL sayılır; "ör.com" gibi rastlantısal eşleşmeyi daraltır). */
const TLDS = "com|net|org|info|biz|io|co|me|app|dev|tr|ly|gl|link|site|online|shop|store|xyz|club|live|tv|page"

/** Bağlantı: http(s)://, www. ya da bilinen uzantılı alan adı (instagram.com/…, wa.me/…, bit.ly/…). */
export function hasUrl(text: string): boolean {
  if (/\b(?:https?:\/\/|www\.)\S+/.test(text)) return true
  return new RegExp(String.raw`\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:${TLDS})(?:\.tr)?\b(?:\/\S*)?`).test(text)
}

/** Para birimi (sayının önünde ya da arkasında). */
const CURRENCY = String.raw`(?:tl|try|lira|₺|usd|dolar|\$|eur|euro|avro|€)`

/** Fiyat ifadesi: sayı + para birimi ("1500 tl", "1.500₺", "5 bin lira", "₺500", "$200"). */
export function hasPrice(text: string): boolean {
  const amountThenCurrency = new RegExp(String.raw`\d[\d.,]*\s*(?:bin\s*|milyon\s*)?${CURRENCY}(?![a-z])`)
  const currencyThenAmount = new RegExp(String.raw`(?<![a-z])${CURRENCY}\s*\d`)
  return amountThenCurrency.test(text) || currencyThenAmount.test(text)
}

const CHECKS: Array<[PatternKind, (text: string) => boolean]> = [
  // IBAN telefondan önce: 24 haneli IBAN telefon kalıbına da uyabilir, doğru neden gösterilsin.
  ["iban", hasIban],
  ["email", hasEmail],
  ["url", hasUrl],
  ["phone", hasPhone],
  ["price", hasPrice],
]

/** Metinde, verilen türlerden ilk eşleşeni döndürür (yoksa null). `kinds` admin'in açık bıraktığı kurallardır. */
export function findPattern(normalizedText: string, kinds: ReadonlySet<PatternKind>): PatternKind | null {
  for (const [kind, test] of CHECKS) {
    if (kinds.has(kind) && test(normalizedText)) return kind
  }
  return null
}

export type BannedTermRule = { id: string; term: string; match: "exact" | "contains" }

/** Regex özel karakterlerini kaçışlar. */
const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

/**
 * Yasaklı kelime eşleşmesi. `term` ve metin normalize edilmiş olmalı.
 * exact: tam kelime/ifade (harf veya rakamla bitişik değilse); contains: metnin herhangi bir yerinde.
 */
export function findBannedTerm(normalizedText: string, terms: readonly BannedTermRule[]): BannedTermRule | null {
  for (const rule of terms) {
    if (rule.match === "contains" ? normalizedText.includes(rule.term) : matchesWord(normalizedText, rule.term)) {
      return rule
    }
  }
  return null
}

/** Terim, metinde tam kelime olarak geçiyor mu? */
function matchesWord(text: string, term: string): boolean {
  return new RegExp(String.raw`(?<![a-z0-9])${escapeRegExp(term)}(?![a-z0-9])`).test(text)
}
