"use client"

import { LoaderCircle } from "lucide-react"
import { useEffect, useId, useRef } from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/**
 * Geri alınamaz işlemler için onay penceresi (yerel <dialog>: odak hapsi, Esc ve arka plana tıklayınca kapanma
 * tarayıcıdan). `open` ile açılır; "Vazgeç" ya da Esc `onCancel`'ı, onay butonu `onConfirm`'u çağırır. Masaüstünde
 * ortada, mobilde alttan açılır. Açılınca odak "Vazgeç"tedir (yanlışlıkla onaylanmasın).
 */
export function ConfirmDialog({
  open,
  title,
  text,
  confirmLabel,
  cancelLabel,
  destructive = false,
  pending = false,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  text: string
  confirmLabel: string
  cancelLabel: string
  destructive?: boolean
  pending?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const textId = useId()

  // open değişince pencereyi aç/kapat.
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={textId}
      onCancel={(e) => {
        e.preventDefault()
        if (!pending) onCancel()
      }}
      onClick={(e) => e.target === e.currentTarget && !pending && onCancel()}
      className={cn(
        "m-0 w-full max-w-none bg-background p-0 text-heading backdrop:bg-heading/60",
        "max-sm:top-auto max-sm:bottom-0 max-sm:rounded-t-dialog sm:m-auto sm:max-w-md sm:rounded-dialog"
      )}
    >
      <div className="grid gap-3 p-6">
        <h2 id={titleId} className="text-xl font-extrabold">
          {title}
        </h2>
        <p id={textId} className="text-body">
          {text}
        </p>
        <div className="mt-3 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onCancel} disabled={pending} autoFocus>
            {cancelLabel}
          </Button>
          <Button variant={destructive ? "destructive" : "default"} onClick={onConfirm} disabled={pending}>
            {pending && <LoaderCircle aria-hidden="true" className="animate-spin motion-reduce:animate-none" />}
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  )
}
