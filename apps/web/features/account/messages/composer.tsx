"use client"

import { MESSAGE_MAX } from "@pati-dostu/validators"
import { SendHorizontal } from "lucide-react"
import { useTranslations } from "next-intl"
import { type FormEvent, type KeyboardEvent, useEffect, useId, useRef, useState } from "react"

import { cn } from "@/lib/utils"

/**
 * Mesaj yazma kutusu (tasarım 01-sayfalar/12): kendiliğinden büyüyen metin alanı + gönder butonu. Enter gönderir,
 * Shift+Enter yeni satır. `onSend` başarısız olursa (false) metin kutuda kalır; hata metni `error` ile alanın altında
 * gösterilir ve alana bağlanır (aria-describedby). Sınırın son 200 karakterinde sayaç görünür.
 */
export function Composer({
  onSend,
  error,
  disabled = false,
  autoFocus = false,
}: {
  onSend: (body: string) => Promise<boolean>
  error: string | null
  disabled?: boolean
  autoFocus?: boolean
}) {
  const t = useTranslations("Messages")
  const id = useId()
  const ref = useRef<HTMLTextAreaElement>(null)
  const [value, setValue] = useState("")
  const [sending, setSending] = useState(false)

  // Yazdıkça yüksekliği içeriğe göre ayarla (en fazla ~6 satır; sonrası kaydırılır).
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }, [value])

  // Masaüstünde konuşma açılınca yazmaya hazır olsun; mobilde klavye kendiliğinden açılmasın.
  useEffect(() => {
    if (autoFocus && window.matchMedia("(min-width: 1024px)").matches) ref.current?.focus({ preventScroll: true })
  }, [autoFocus])

  /** Boş değilse gönderir; başarılıysa kutuyu boşaltır, odak kutuda kalır. */
  async function submit(event?: FormEvent) {
    event?.preventDefault()
    const body = value.trim()
    if (!body || sending || disabled) return
    setSending(true)
    setValue("")
    const ok = await onSend(body)
    setSending(false)
    if (!ok) setValue(body)
    ref.current?.focus()
  }

  /** Enter → gönder; Shift+Enter ve IME (Türkçe klavye düzeni dışı bileşim) sırasında yeni satır. */
  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      void submit()
    }
  }

  const remaining = MESSAGE_MAX - value.length
  return (
    <form onSubmit={submit} className="grid gap-1.5">
      <div className="flex items-end gap-3">
        <label htmlFor={id} className="sr-only">
          {t("composerLabel")}
        </label>
        <textarea
          ref={ref}
          id={id}
          rows={1}
          value={value}
          maxLength={MESSAGE_MAX}
          disabled={disabled}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={t("composerPlaceholder")}
          aria-invalid={error ? true : undefined}
          aria-describedby={`${id}-hint${error ? ` ${id}-error` : ""}`}
          className={cn(
            "min-h-13 flex-1 resize-none rounded-[26px] border border-border bg-background px-5 py-3.5 text-base text-heading placeholder:text-muted-foreground",
            "focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring",
            "disabled:cursor-not-allowed disabled:bg-smoke-2",
            error && "border-destructive"
          )}
        />
        <button
          type="submit"
          disabled={disabled || sending || value.trim() === ""}
          aria-label={sending ? t("sending") : t("send")}
          className="flex size-13 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
        >
          <SendHorizontal aria-hidden="true" className="size-5" />
        </button>
      </div>
      <p id={`${id}-hint`} className="sr-only">
        {t("composerHint")}
      </p>
      {remaining <= 200 && (
        <p className="px-5 text-xs text-body" aria-live="polite">
          {t("charsLeft", { count: remaining })}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="px-5 text-sm font-bold text-destructive">
          {error}
        </p>
      )}
    </form>
  )
}
