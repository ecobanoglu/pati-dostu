"use client"

import { POST_TAG_MAX, POST_TAGS_MAX } from "@pati-dostu/validators"
import { X } from "lucide-react"
import { useTranslations } from "next-intl"
import { type KeyboardEvent, useId, useState } from "react"

import { cn } from "@/lib/utils"

/** Etiket adını sadeleştirir: baştaki "#" ve fazla boşluklar atılır, Türkçe küçük harf. */
const normalize = (raw: string) =>
  raw.replace(/^#+/, "").replace(/\s+/g, " ").trim().toLocaleLowerCase("tr-TR").slice(0, POST_TAG_MAX)

/**
 * Etiket girişi (tasarım: "#kedi ×" çipleri + "Etiket ekle"). Enter ya da virgül ekler, boş alanda Backspace son
 * etiketi siler; daha önce kullanılan etiketler öneri listesinde (datalist). En fazla 10 etiket; tekrar eklenmez.
 */
export function TagInput({
  id,
  value,
  onChange,
  suggestions,
  describedBy,
  invalid,
}: {
  id: string
  value: string[]
  onChange: (tags: string[]) => void
  suggestions: string[]
  describedBy?: string
  invalid?: boolean
}) {
  const t = useTranslations("AdminPosts")
  const listId = useId()
  const [draft, setDraft] = useState("")
  const full = value.length >= POST_TAGS_MAX

  /** Yazılanı etiket olarak ekler (en az 2 karakter). */
  const commit = (raw: string) => {
    const tag = normalize(raw)
    setDraft("")
    if (tag.length < 2 || full || value.includes(tag)) return
    onChange([...value, tag])
  }

  /** Enter / virgül ekler, boşken Backspace son etiketi siler. */
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      commit(draft)
    } else if (e.key === "Backspace" && !draft && value.length > 0) onChange(value.slice(0, -1))
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-lg border bg-background p-2 focus-within:border-primary focus-within:outline-2 focus-within:outline-ring",
        invalid ? "border-destructive" : "border-input"
      )}
    >
      {value.length > 0 && (
        <ul className="contents">
          {value.map((tag) => (
            <li
              key={tag}
              className="inline-flex items-center rounded-full bg-smoke pl-3 text-sm font-extrabold text-heading"
            >
              #{tag}
              <button
                type="button"
                aria-label={t("tagRemove", { tag })}
                onClick={() => onChange(value.filter((x) => x !== tag))}
                className="relative inline-flex size-8 items-center justify-center rounded-full text-body after:absolute after:-inset-1.5 after:content-[''] hover:text-destructive focus-visible:outline-2 focus-visible:outline-ring"
              >
                <X aria-hidden="true" className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <input
        id={id}
        list={listId}
        value={draft}
        disabled={full}
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        onChange={(e) => {
          const v = e.target.value
          if (v.endsWith(",")) commit(v.slice(0, -1))
          else setDraft(v)
        }}
        onKeyDown={onKeyDown}
        onBlur={() => draft.trim() && commit(draft)}
        placeholder={full ? t("tagsFull") : t("tagPlaceholder")}
        className="min-h-9 min-w-32 flex-1 bg-transparent px-1 text-[15px] text-heading placeholder:text-body/70 focus:outline-none"
      />
      <datalist id={listId}>
        {suggestions
          .filter((s) => !value.includes(s))
          .map((s) => (
            <option key={s} value={s} />
          ))}
      </datalist>
    </div>
  )
}
