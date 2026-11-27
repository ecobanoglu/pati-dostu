import type { useFormatter } from "next-intl"

type Formatter = ReturnType<typeof useFormatter>

const TIME_ZONE = "Europe/Istanbul"
const dayKey = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})

/** Tarihin İstanbul takvimindeki günü ("2026-11-27"); gün karşılaştırmaları için. */
export function istanbulDay(date: Date): string {
  return dayKey.format(date)
}

/** İki tarih arasındaki takvim günü farkı (İstanbul saatine göre). */
export function dayDiff(now: Date, date: Date): number {
  return Math.round((Date.parse(istanbulDay(now)) - Date.parse(istanbulDay(date))) / 86_400_000)
}

/**
 * Konuşma listesindeki zaman: bugünse saat (14:32), dünse "Dün", bu yıl içindeyse gün + ay (20 Kas), değilse tam
 * tarih. Tasarım 01-sayfalar/12.
 */
export function listTime(iso: string, now: Date, format: Formatter, yesterday: string): string {
  const date = new Date(iso)
  const diff = dayDiff(now, date)
  if (diff <= 0) return format.dateTime(date, { hour: "2-digit", minute: "2-digit" })
  if (diff === 1) return yesterday
  const sameYear = istanbulDay(now).slice(0, 4) === istanbulDay(date).slice(0, 4)
  return format.dateTime(date, sameYear ? { day: "numeric", month: "short" } : { dateStyle: "medium" })
}

/** Mesaj balonundaki saat (14:20). */
export function messageTime(iso: string, format: Formatter): string {
  return format.dateTime(new Date(iso), { hour: "2-digit", minute: "2-digit" })
}

/** Mesajlar arasındaki gün ayracı: "Bugün", "Dün" ya da tarih (27 Kasım 2026). */
export function dayLabel(iso: string, now: Date, format: Formatter, today: string, yesterday: string): string {
  const diff = dayDiff(now, new Date(iso))
  if (diff <= 0) return today
  if (diff === 1) return yesterday
  return format.dateTime(new Date(iso), { day: "numeric", month: "long", year: "numeric" })
}
