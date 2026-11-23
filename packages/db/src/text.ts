const TURKISH_ASCII: Record<string, string> = {
  ç: "c",
  ğ: "g",
  ı: "i",
  i: "i",
  ö: "o",
  ş: "s",
  ü: "u",
}

/**
 * Karşılaştırma için metni sadeleştirir: Türkçe küçük harf, Türkçe karakterleri ASCII karşılığına çevirir
 * (ı/i, ş/s, ğ/g, ü/u, ö/o, ç/c), diğer aksanları atar ve boşlukları teke indirir.
 * Yasaklı kelime eşleştirmesi ve slug üretimi bunu kullanır.
 */
export function normalizeTurkish(input: string): string {
  return input
    .toLocaleLowerCase("tr-TR")
    .replace(/[çğıiöşü]/g, (ch) => TURKISH_ASCII[ch] ?? ch)
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
}

/** URL'de kullanılacak kısa ad: "Kahramanmaraş" → "kahramanmaras", "Afyonkarahisar Merkez" → "afyonkarahisar-merkez". */
export function slugify(input: string): string {
  return normalizeTurkish(input)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}
