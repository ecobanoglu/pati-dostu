import { Check, type LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

import { PdMark } from "@/components/brand/logo"
import { cn } from "@/lib/utils"

type AuthShellProps = {
  /** Mor paneldeki başlık (ör. "Tekrar hoş geldin!"). */
  panelTitle: string
  /** Mor paneldeki üç madde. */
  points: string[]
  /** Form kartının başlığı (sayfanın h1'i, ör. "Giriş yap"). */
  title: string
  /**
   * Mobildeki başlık; verilirse h1 mobilde bunu gösterir (giriş/kayıt tasarımında mobilde panel başlığı görünür).
   * Görünmeyen sürüm display:none olduğu için ekran okuyucu yalnızca birini okur.
   */
  mobileTitle?: string
  /** Kartın üstündeki ikon (kilit, zarf); verilmezse mobilde logo gösterilir. */
  icon?: LucideIcon
  /** Başlığın altındaki kısa açıklama veya "Hesabın yok mu? Kayıt ol". */
  intro?: ReactNode
  children: ReactNode
}

/**
 * Kimlik sayfalarının iki sütunlu kabuğu: solda mor bilgi paneli (yalnız masaüstü), sağda form kartı.
 * Mobilde panel gizlenir; kart kenarsız tam genişlikte, üstte logo ya da ikon ortalanır.
 */
export function AuthShell({ panelTitle, points, title, mobileTitle, icon: Icon, intro, children }: AuthShellProps) {
  return (
    <div className="mx-auto grid max-w-site gap-8 px-4 pt-2 pb-12 lg:grid-cols-2 lg:px-6 lg:pt-12 lg:pb-8">
      <aside className="hidden flex-col justify-center rounded-card bg-primary p-10 text-primary-foreground lg:flex">
        <PdMark tone="dark" className="size-16" />
        <p className="mt-6 text-[32px] leading-tight font-extrabold text-white">{panelTitle}</p>
        <ul className="mt-6 space-y-4">
          {points.map((point) => (
            <li key={point} className="flex items-start gap-3 text-[17px] text-white">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                <Check aria-hidden="true" className="size-4" strokeWidth={3} />
              </span>
              {point}
            </li>
          ))}
        </ul>
      </aside>

      <section className="lg:rounded-card lg:border lg:border-border lg:bg-background lg:p-9">
        {Icon ? (
          <span className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-smoke text-primary lg:mx-0">
            <Icon aria-hidden="true" className="size-7" />
          </span>
        ) : (
          <PdMark className="mx-auto mb-3 size-16 lg:hidden" />
        )}
        <h1 className={cn("text-center text-h2 text-heading lg:text-left", Icon && "lg:text-h2")}>
          {mobileTitle ? (
            <>
              <span className="lg:hidden">{mobileTitle}</span>
              <span className="hidden lg:inline">{title}</span>
            </>
          ) : (
            title
          )}
        </h1>
        {intro && <div className="mt-2 text-center text-body lg:text-left">{intro}</div>}
        <div className="mt-6">{children}</div>
      </section>
    </div>
  )
}

/** Kart içinde ortası yazılı ayraç ("veya"). */
export function OrDivider({ label }: { label: string }) {
  return (
    <div className="my-5 flex items-center gap-4 text-sm text-body">
      <span aria-hidden="true" className="h-px flex-1 bg-border" />
      {label}
      <span aria-hidden="true" className="h-px flex-1 bg-border" />
    </div>
  )
}
