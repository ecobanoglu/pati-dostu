/** Sitenin sabit bilgileri: iletişim ve sosyal medya (taslak › Alınan kararlar; hesap adları uygunluğa göre değişebilir). */
export const site = {
  /** Alan adı (admin editöründe adres ve arama görünümü önizlemesi). */
  host: "pati-dostu.com",
  email: "iletisim@pati-dostu.com",
  socialHandle: "@pati_dostu",
  social: [
    { name: "Instagram", href: "https://www.instagram.com/pati_dostu" },
    { name: "X", href: "https://x.com/pati_dostu" },
    { name: "Facebook", href: "https://www.facebook.com/pati_dostu" },
    { name: "YouTube", href: "https://www.youtube.com/@pati_dostu" },
  ],
} as const

/** Ad soyaddan avatar baş harfleri: "Zeynep Demir" → "ZD" (aktif dilin büyük harf kuralıyla; Türkçede i → İ). */
export function initials(name: string, locale: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const letters = parts.length > 1 ? [parts[0], parts[parts.length - 1]] : parts
  return letters
    .map((p) => p?.[0] ?? "")
    .join("")
    .toLocaleUpperCase(locale)
}
