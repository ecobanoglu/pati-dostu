import type { ComponentProps, ReactNode } from "react"

import { cn } from "@/lib/utils"

type CheckboxProps = Omit<ComponentProps<"input">, "type"> & {
  label: ReactNode
  error?: string
}

/**
 * Etiketli onay kutusu (yerel <input type="checkbox">, marka moru). Tüm satır tıklanabilir ve
 * dokunma hedefi en az 44 px. Hata varsa kutunun altında gösterilir ve aria-describedby ile bağlanır.
 */
export function Checkbox({ id, label, error, className, ...props }: CheckboxProps) {
  const errorId = error && id ? `${id}-error` : undefined
  return (
    <div className={className}>
      <label htmlFor={id} className="flex min-h-tap cursor-pointer items-start gap-3 py-2.5 text-[15px] text-heading">
        <input
          id={id}
          type="checkbox"
          aria-invalid={Boolean(error)}
          aria-describedby={errorId}
          className={cn(
            "mt-0.5 size-5 shrink-0 cursor-pointer rounded border-input accent-primary",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          )}
          {...props}
        />
        <span>{label}</span>
      </label>
      {error && (
        <p id={errorId} className="pl-8 text-sm font-bold text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
