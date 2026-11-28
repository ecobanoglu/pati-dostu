"use client"

import { MAX_RANGES_PER_DAY } from "@pati-dostu/validators"
import { X } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"

import { fieldClass } from "@/components/form/input"
import { cn } from "@/lib/utils"

import type { DayHours } from "./types"

/** "HH:MM" saatine dakika ekler (gün sonunu aşmaz: en fazla 23:59). */
function addMinutes(time: string, minutes: number): string {
  const [h = 0, m = 0] = time.split(":").map(Number)
  const total = Math.min(h * 60 + m + minutes, 23 * 60 + 59)
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`
}

/** Bir günün aralıklarından hatalı olanların sırası: açılış kapanıştan sonra ya da önceki aralıkla çakışıyor. */
function invalidRanges(day: DayHours): Set<number> {
  const bad = new Set<number>()
  const order = day.ranges.map((r, i) => ({ ...r, i })).sort((a, b) => a.opensAt.localeCompare(b.opensAt))
  order.forEach((r, k) => {
    if (!r.opensAt || !r.closesAt || r.opensAt >= r.closesAt) bad.add(r.i)
    const prev = order[k - 1]
    if (prev && r.opensAt < prev.closesAt) bad.add(r.i)
  })
  return bad
}

/**
 * Haftalık çalışma saatleri (tasarım 09 › Hizmetler ve çalışma saatleri): her gün Açık/Kapalı anahtarı, saat
 * aralıkları (yerel saat seçici), "+ Ara ekle" (öğle arası için ikinci aralık; günde en fazla 3), fazladan aralığı
 * kaldırma (×) ve pazartesiyi "Tüm günlere kopyala". Hatalı aralık (ters ya da çakışan) aria-invalid ile işaretlenir.
 */
export function HoursEditor({
  value,
  onChange,
  errorId,
}: {
  value: DayHours[]
  onChange: (week: DayHours[]) => void
  /** Bölümün hata metninin kimliği (varsa aralıklar ona bağlanır). */
  errorId?: string
}) {
  const t = useTranslations("OrgApplication")
  const locale = useLocale()
  // 2024-01-01 pazartesi: haftanın günleri aktif dilde (0 = pazartesi).
  const dayName = (day: number) =>
    new Intl.DateTimeFormat(locale, { weekday: "long", timeZone: "UTC" }).format(Date.UTC(2024, 0, 1 + day))

  /** Tek günü günceller. */
  const setDay = (day: number, next: DayHours) => onChange(value.map((d, i) => (i === day ? next : d)))

  return (
    <ul className="divide-y divide-border border-y border-border">
      {value.map((d, day) => {
        const name = dayName(day)
        const labelId = `hours-day-${day}`
        const bad = d.open ? invalidRanges(d) : new Set<number>()
        return (
          <li
            key={day}
            className="grid gap-3 py-3 sm:grid-cols-[120px_120px_minmax(0,1fr)] sm:items-center"
            aria-labelledby={labelId}
          >
            <div className="flex items-center justify-between gap-3 sm:contents">
              <span id={labelId} className="font-extrabold text-heading">
                {name}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={d.open}
                aria-label={t("dayOpen", { day: name })}
                onClick={() => setDay(day, { ...d, open: !d.open })}
                className="inline-flex min-h-tap items-center gap-2 rounded-full font-bold text-heading focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring max-sm:flex-row-reverse"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors",
                    d.open ? "bg-primary" : "bg-input/60"
                  )}
                >
                  <span
                    className={cn(
                      "inline-block size-5 rounded-full bg-white shadow transition-transform motion-reduce:transition-none",
                      d.open ? "translate-x-6" : "translate-x-1"
                    )}
                  />
                </span>
                <span className="text-sm">{d.open ? t("open") : t("closed")}</span>
              </button>
            </div>

            {d.open ? (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <div className="grid gap-2">
                  {d.ranges.map((r, i) => {
                    const invalid = bad.has(i)
                    const setRange = (patch: Partial<typeof r>) =>
                      setDay(day, { ...d, ranges: d.ranges.map((x, k) => (k === i ? { ...x, ...patch } : x)) })
                    return (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          type="time"
                          value={r.opensAt}
                          onChange={(e) => setRange({ opensAt: e.target.value })}
                          aria-label={t("opensAt", { day: name, n: i + 1 })}
                          aria-invalid={invalid || undefined}
                          aria-describedby={invalid ? errorId : undefined}
                          className={cn(fieldClass, "w-[124px] px-3")}
                        />
                        <span aria-hidden="true">–</span>
                        <input
                          type="time"
                          value={r.closesAt}
                          onChange={(e) => setRange({ closesAt: e.target.value })}
                          aria-label={t("closesAt", { day: name, n: i + 1 })}
                          aria-invalid={invalid || undefined}
                          aria-describedby={invalid ? errorId : undefined}
                          className={cn(fieldClass, "w-[124px] px-3")}
                        />
                        {i > 0 && (
                          <button
                            type="button"
                            onClick={() => setDay(day, { ...d, ranges: d.ranges.filter((_, k) => k !== i) })}
                            aria-label={t("removeRange", { day: name, n: i + 1 })}
                            className="inline-flex size-tap items-center justify-center rounded-full text-body hover:bg-smoke focus-visible:outline-2 focus-visible:outline-ring"
                          >
                            <X aria-hidden="true" className="size-4" />
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
                <div className="flex flex-wrap gap-x-4">
                  {d.ranges.length < MAX_RANGES_PER_DAY && (
                    <button
                      type="button"
                      onClick={() => {
                        const last = d.ranges.at(-1)?.closesAt ?? "12:00"
                        const opensAt = addMinutes(last, 60)
                        setDay(day, { ...d, ranges: [...d.ranges, { opensAt, closesAt: addMinutes(opensAt, 180) }] })
                      }}
                      aria-label={t("addRangeFor", { day: name })}
                      className="min-h-tap text-sm font-extrabold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                    >
                      {t("addRange")}
                    </button>
                  )}
                  {day === 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        onChange(value.map(() => ({ open: d.open, ranges: d.ranges.map((r) => ({ ...r })) })))
                      }
                      className="min-h-tap text-sm font-extrabold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                    >
                      {t("copyAll")}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-body">{t("closedNote")}</p>
            )}
          </li>
        )
      })}
    </ul>
  )
}
