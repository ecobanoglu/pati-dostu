import { normalizeTurkish } from "@pati-dostu/db"
import { describe, expect, it } from "vitest"

import {
  findBannedTerm,
  findPattern,
  hasEmail,
  hasIban,
  hasPhone,
  hasPrice,
  hasUrl,
  type PatternKind,
} from "./matchers.js"

/** Testlerde metni servisin yaptığı gibi normalize eder. */
const n = (s: string) => normalizeTurkish(s)

describe("hasPhone", () => {
  it.each([
    "Bana 0532 123 45 67'den ulaşın",
    "05321234567",
    "+90 532 123 45 67",
    "532-123-45-67 numaralı telefon",
    "(0212) 555 44 33",
    "tel: 0 532 123 4567",
  ])("telefonu yakalar: %s", (text) => expect(hasPhone(n(text))).toBe(true))

  it.each([
    "Luna 2 aylık, 3 kardeşiyle bulundu",
    "23.11.2026 tarihinde kayboldu",
    "Kazımdirik Mah. 372. Sokak No: 15",
    "Çip numarası 900123456789012", // 15 hane: telefon değil
    "Ağırlığı 4,5 kg",
  ])("masum metne dokunmaz: %s", (text) => expect(hasPhone(n(text))).toBe(false))
})

describe("hasEmail", () => {
  it.each([
    "zeynep@eposta.com",
    "zeynep (at) eposta nokta com",
    "zeynep [at] eposta [dot] com",
    "ZEYNEP@EPOSTA.COM.TR",
  ])("e-postayı yakalar: %s", (text) => expect(hasEmail(n(text))).toBe(true))
  it.each(["@pati_dostu hesabını takip edin", "Kedimiz @ evde"])("masum metne dokunmaz: %s", (text) =>
    expect(hasEmail(n(text))).toBe(false)
  )
})

describe("hasUrl", () => {
  it.each(["https://ornek.com/ilan", "www.ornek.com", "instagram.com/pati", "wa.me/905321234567", "bit.ly/abc"])(
    "bağlantıyı yakalar: %s",
    (text) => expect(hasUrl(n(text))).toBe(true)
  )
  it.each(["Saat 10.30'da", "Yaklaşık 2.5 kg", "Kısır. Aşıları tam."])("masum metne dokunmaz: %s", (text) =>
    expect(hasUrl(n(text))).toBe(false)
  )
})

describe("hasIban", () => {
  it.each(["TR12 0006 1005 1978 6457 8413 26", "iban: tr120006100519786457841326"])("IBAN'ı yakalar: %s", (text) =>
    expect(hasIban(n(text))).toBe(true)
  )
  it("masum metne dokunmaz", () => expect(hasIban(n("Trabzon'da 2 yaşında kedi"))).toBe(false))
})

describe("hasPrice", () => {
  it.each(["Fiyatı 1500 TL", "1.500₺", "5 bin lira", "₺500", "200$", "100 euro kapora"])("fiyatı yakalar: %s", (text) =>
    expect(hasPrice(n(text))).toBe(true)
  )
  it.each(["Tamamen ücretsiz sahiplendirme", "2 yaşında, 4 kg", "Tlçe merkezinde", "Atlas adında"])(
    "masum metne dokunmaz: %s",
    (text) => expect(hasPrice(n(text))).toBe(false)
  )
})

describe("findPattern", () => {
  const all = new Set<PatternKind>(["phone", "email", "url", "iban", "price"])

  it("IBAN'ı telefon olarak değil IBAN olarak bildirir", () => {
    expect(findPattern(n("TR12 0006 1005 1978 6457 8413 26"), all)).toBe("iban")
  })
  it("kapalı kuralı uygulamaz", () => {
    expect(findPattern(n("0532 123 45 67"), new Set<PatternKind>(["email"]))).toBeNull()
  })
  it("temiz metinde null döner", () => {
    expect(findPattern(n("Luna çok uysal, kum kabını kullanıyor."), all)).toBeNull()
  })
})

describe("findBannedTerm", () => {
  const terms = [
    { id: "1", term: "satilik", match: "contains" as const },
    { id: "2", term: "aptal", match: "exact" as const },
    { id: "3", term: "yavrularini satiyoruz", match: "contains" as const },
  ]

  it("Türkçe karakter ve büyük harf farkını gözetmez", () => {
    expect(findBannedTerm(n("SATILIK yavru kedi"), terms)?.id).toBe("1")
  })
  it("contains: kelime içinde de yakalar", () => {
    expect(findBannedTerm(n("acil satılıktır"), terms)?.id).toBe("1")
  })
  it("exact: yalnız tam kelime", () => {
    expect(findBannedTerm(n("Ne aptal bir soru"), terms)?.id).toBe("2")
    expect(findBannedTerm(n("Aptalya değil Antalya"), terms)).toBeNull()
  })
  it("çok kelimeli ifade", () => {
    expect(findBannedTerm(n("Yavrularını satıyoruz, arayın"), terms)?.id).toBe("3")
  })
})
