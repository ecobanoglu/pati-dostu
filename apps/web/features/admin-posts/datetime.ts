/**
 * Planlı yayın saati: `<input type="datetime-local">` değeri İstanbul saatidir. Türkiye 2016'dan beri yıl boyu
 * UTC+3 (yaz saati uygulaması yok), bu yüzden dönüşüm sabit farkla yapılır.
 */
const OFFSET_MS = 3 * 60 * 60 * 1000

/** "2026-11-25T09:00" (İstanbul) → ISO zaman damgası; biçim bozuksa null. */
export function istanbulLocalToIso(local: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local)) return null
  const date = new Date(`${local}:00+03:00`)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

/** ISO zaman damgası → "2026-11-25T09:00" (İstanbul saati, datetime-local değeri). */
export function isoToIstanbulLocal(iso: string | Date): string {
  return new Date(new Date(iso).getTime() + OFFSET_MS).toISOString().slice(0, 16)
}
