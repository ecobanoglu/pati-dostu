"use client"

import { Check } from "lucide-react"
import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type Option<T extends string> = { value: T; label: ReactNode; hint?: ReactNode }

/**
 * Tek seçimli kartlar (radio grubu): ilan türü, "Kimden" gibi. Yerel <input type="radio"> kullanır;
 * ok tuşlarıyla gezinme ve ekran okuyucu desteği tarayıcıdan gelir. Seçili kart mor kenarlı.
 */
export function RadioCards<T extends string>({
  name,
  legend,
  options,
  value,
  onChange,
  error,
  variant = "card",
  className,
}: {
  name: string
  legend: ReactNode
  options: Option<T>[]
  value: T | null | undefined
  onChange: (value: T) => void
  error?: string
  /** card: büyük seçim kartı (ilan türü); chip: hap şeklinde (Kimden). */
  variant?: "card" | "chip"
  className?: string
}) {
  const errorId = error ? `${name}-error` : undefined
  return (
    <fieldset className={className} aria-describedby={errorId}>
      <legend className="mb-2 text-[15px] font-extrabold text-heading">{legend}</legend>
      <div className={cn("flex flex-wrap gap-2.5", variant === "card" && "max-lg:flex-col")}>
        {options.map((option) => {
          const checked = value === option.value
          return (
            <label
              key={option.value}
              className={cn(
                "cursor-pointer border-2 transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring",
                variant === "card"
                  ? "flex min-h-tap items-center gap-3 rounded-2xl px-4 py-3 lg:flex-col lg:items-start lg:gap-1.5"
                  : "inline-flex min-h-tap items-center gap-1.5 rounded-full px-4 font-bold",
                checked ? "border-primary bg-smoke" : "border-border bg-background hover:border-primary/60",
                variant === "chip" && checked && "bg-primary text-primary-foreground"
              )}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={checked}
                onChange={() => onChange(option.value)}
                className={cn(variant === "card" ? "size-5 accent-primary lg:sr-only" : "sr-only")}
              />
              {variant === "chip" && checked && <Check aria-hidden="true" className="size-4" />}
              <span className="flex flex-col gap-1">
                <span className={variant === "card" ? "font-extrabold text-heading" : undefined}>{option.label}</span>
                {option.hint && <span className="text-sm text-body">{option.hint}</span>}
              </span>
            </label>
          )
        })}
      </div>
      {error && (
        <p id={errorId} className="mt-2 text-sm font-bold text-destructive">
          {error}
        </p>
      )}
    </fieldset>
  )
}

/** Çok seçimli haplar (Aşılı, Kısır…): her biri aria-pressed'li bir buton. */
export function ToggleChips<T extends string>({
  legend,
  options,
  value,
  onToggle,
}: {
  legend: ReactNode
  options: Array<{ value: T; label: ReactNode }>
  value: ReadonlySet<T>
  onToggle: (value: T) => void
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-[15px] font-extrabold text-heading">{legend}</legend>
      <div className="flex flex-wrap gap-2.5">
        {options.map((option) => {
          const pressed = value.has(option.value)
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={pressed}
              onClick={() => onToggle(option.value)}
              className={cn(
                "inline-flex min-h-tap items-center gap-1.5 rounded-full border-2 px-4 font-bold transition-colors",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                pressed
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-heading hover:border-primary/60"
              )}
            >
              {pressed && <Check aria-hidden="true" className="size-4" />}
              {option.label}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

/** Açma/kapama anahtarı (role="switch"), etiketi ve açıklamasıyla. */
export function Switch({
  id,
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  id: string
  checked: boolean
  onChange: (checked: boolean) => void
  label: ReactNode
  description?: ReactNode
  disabled?: boolean
}) {
  const descriptionId = description ? `${id}-description` : undefined
  return (
    <div className="flex items-start gap-3">
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={descriptionId}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50",
          checked ? "bg-primary" : "bg-input/60"
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "inline-block size-5 rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-6" : "translate-x-1"
          )}
        />
      </button>
      <label htmlFor={id} className="cursor-pointer">
        <span className="block font-extrabold text-heading">{label}</span>
        {description && (
          <span id={descriptionId} className="block text-sm text-body">
            {description}
          </span>
        )}
      </label>
    </div>
  )
}
