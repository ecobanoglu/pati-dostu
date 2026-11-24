"use client"

import { useId } from "react"

import { cn } from "@/lib/utils"

/** Ayarlar sayfasındaki bölüm kutusu: başlık + içerik (tasarım 02-hesabim/06). `danger`: "Hesap" bölümü (bordo kenar). */
export function SettingsCard({
  title,
  danger = false,
  children,
}: {
  title: string
  danger?: boolean
  children: React.ReactNode
}) {
  const id = useId()
  return (
    <section
      aria-labelledby={id}
      className={cn("rounded-card border bg-background p-5 lg:p-6", danger ? "border-destructive" : "border-border")}
    >
      <h2 id={id} className={cn("mb-4 text-xl font-extrabold", danger ? "text-destructive" : "text-heading")}>
        {title}
      </h2>
      {children}
    </section>
  )
}

/** Kaydetme sonucu satırı (ekran okuyucuya duyurulur): başarıda yeşil, hatada bordo. */
export function SaveStatus({ status }: { status: { text: string; error?: boolean } | null }) {
  return (
    <p
      role="status"
      className={cn("text-sm font-bold empty:hidden", status?.error ? "text-destructive" : "text-success-text")}
    >
      {status?.text}
    </p>
  )
}
