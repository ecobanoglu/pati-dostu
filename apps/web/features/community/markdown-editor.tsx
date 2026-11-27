"use client"

import { Bold, Italic, List } from "lucide-react"
import { useTranslations } from "next-intl"
import { type ComponentProps, useRef } from "react"

import { cn } from "@/lib/utils"

/**
 * Sınırlı Markdown düzenleyicisi (karar: kalın, italik, liste): üstte küçük araç çubuğu, altında metin alanı.
 * Butonlar seçili metni **…** / *…* ile sarar ya da seçili satırların başına "- " ekler; klavyede Ctrl/Cmd+B ve
 * Ctrl/Cmd+I da çalışır. Metin düz kalır (önizleme `Markdown` bileşeniyle). Konu formu ve cevap formu kullanır.
 */
export function MarkdownEditor({
  value,
  onChange,
  className,
  textareaClassName,
  ...props
}: Omit<ComponentProps<"textarea">, "value" | "onChange"> & {
  value: string
  onChange: (value: string) => void
  textareaClassName?: string
}) {
  const t = useTranslations("Community")
  const ref = useRef<HTMLTextAreaElement>(null)

  /** Seçimi verilen işaretle sarar (seçim yoksa işaretleri imlecin yerine ekler). */
  function wrap(mark: string) {
    const el = ref.current
    if (!el) return
    const { selectionStart: a, selectionEnd: b } = el
    const selected = value.slice(a, b)
    const next = `${value.slice(0, a)}${mark}${selected}${mark}${value.slice(b)}`
    onChange(next)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(a + mark.length, b + mark.length)
    })
  }

  /** Seçili satırları (seçim yoksa imlecin satırını) "- " ile madde yapar. */
  function bullet() {
    const el = ref.current
    if (!el) return
    const { selectionStart: a, selectionEnd: b } = el
    const lineStart = value.lastIndexOf("\n", a - 1) + 1
    const block = value.slice(lineStart, b)
    const lines = block.split("\n").map((l) => (/^\s*-\s/.test(l) ? l : `- ${l}`))
    const replaced = lines.join("\n")
    onChange(value.slice(0, lineStart) + replaced + value.slice(b))
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(lineStart + replaced.length, lineStart + replaced.length)
    })
  }

  const tool =
    "flex size-tap items-center justify-center rounded-lg text-heading hover:bg-smoke-2 focus-visible:outline-2 focus-visible:outline-ring"
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-border bg-background focus-within:border-primary focus-within:outline-2 focus-within:outline-offset-1 focus-within:outline-ring",
        props["aria-invalid"] && "border-destructive",
        className
      )}
    >
      <div
        role="toolbar"
        aria-label={t("formatToolbar")}
        className="flex gap-1 border-b border-border bg-smoke-2/50 px-2 py-1"
      >
        <button type="button" className={tool} onClick={() => wrap("**")} aria-label={t("formatBold")}>
          <Bold aria-hidden="true" className="size-4" />
        </button>
        <button type="button" className={tool} onClick={() => wrap("*")} aria-label={t("formatItalic")}>
          <Italic aria-hidden="true" className="size-4" />
        </button>
        <button type="button" className={tool} onClick={bullet} aria-label={t("formatList")}>
          <List aria-hidden="true" className="size-4" />
        </button>
      </div>
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (!(e.ctrlKey || e.metaKey)) return
          const key = e.key.toLowerCase()
          if (key === "b" || key === "i") {
            e.preventDefault()
            wrap(key === "b" ? "**" : "*")
          }
        }}
        className={cn(
          "block min-h-32 w-full resize-y bg-transparent px-4 py-3 text-base leading-relaxed text-heading placeholder:text-muted-foreground focus:outline-none",
          textareaClassName
        )}
        {...props}
      />
    </div>
  )
}
