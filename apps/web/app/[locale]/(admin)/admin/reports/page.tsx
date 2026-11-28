import type { Metadata } from "next"
import { Suspense } from "react"

import { ReportsView, reportsMetadata } from "@/features/admin-reports/reports-view"

/** Sekme başlığı. */
export function generateMetadata(): Promise<Metadata> {
  return reportsMetadata()
}

/** Admin › Şikayetler — /admin/sikayetler (?durum=sonuclanan&hedef=&dosya=tür.kimlik&sayfa=). */
export default function AdminReportsPage({ searchParams }: PageProps<"/[locale]/admin/reports">) {
  return (
    <Suspense fallback={<div className="h-96" aria-hidden="true" />}>
      <ReportsView searchParams={searchParams} />
    </Suspense>
  )
}
