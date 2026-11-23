import { useTranslations } from "next-intl"

import { Link } from "@/i18n/navigation"
import { cn } from "@/lib/utils"

type Tone = "light" | "dark"

/**
 * "PD" pati izi işareti (docs/marka/pati-dostu-isaret*.svg). Dekoratiftir; erişilebilir ad, yanındaki metinden gelir.
 * tone="light": açık zemin (mor pati, beyaz PD) · tone="dark": koyu zemin (beyaz pati, mor PD).
 * Renkler marka değerleridir (SVG içinde Tailwind yardımcıları yerine currentColor kullanmak işareti bozar).
 */
export function PdMark({ tone = "light", className }: { tone?: Tone; className?: string }) {
  const pad = tone === "light" ? "#6839cc" : "#ffffff"
  const letters = tone === "light" ? "#ffffff" : "#6839cc"
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false" className={cn("shrink-0", className)}>
      <ellipse cx="20" cy="35" rx="7" ry="9" transform="rotate(-22 20 35)" fill="#ff781f" />
      <ellipse cx="38" cy="22" rx="7.5" ry="9.5" transform="rotate(-6 38 22)" fill="#ff781f" />
      <ellipse cx="62" cy="22" rx="7.5" ry="9.5" transform="rotate(6 62 22)" fill="#ff781f" />
      <ellipse cx="80" cy="35" rx="7" ry="9" transform="rotate(22 80 35)" fill="#ff781f" />
      <path
        d="M50 40 C70 40 84 54 84 70 C84 82 74 88 62 86 C56 85 54 83 50 83 C46 83 44 85 38 86 C26 88 16 82 16 70 C16 54 30 40 50 40 Z"
        fill={pad}
      />
      <path
        d="M31 76 V54 H38 A6.5 6.5 0 0 1 38 67 H31"
        fill="none"
        stroke={letters}
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M55 54 V76 H57 A11 11 0 0 0 57 54 Z"
        fill="none"
        stroke={letters}
        strokeWidth="7"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Anasayfaya giden logo: işaret + "Pati Dostu" yazısı. Koyu zeminde (footer) tone="dark". */
export function Logo({ tone = "light", className }: { tone?: Tone; className?: string }) {
  const t = useTranslations("Common")
  return (
    <Link
      href="/"
      aria-label={t("homeLink")}
      className={cn(
        "inline-flex min-h-tap items-center gap-2 rounded-lg text-[22px] font-extrabold leading-none",
        tone === "light" ? "text-heading" : "text-white",
        className
      )}
    >
      <PdMark tone={tone} className="size-9" />
      <span aria-hidden="true">
        {t("brandFirst")} <span className={tone === "light" ? "text-primary" : undefined}>{t("brandSecond")}</span>
      </span>
    </Link>
  )
}
