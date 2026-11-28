import type { Metadata } from "next"
import { Suspense } from "react"

import { AdminListingsView, adminListingsMetadata } from "@/features/admin-listings/listings-view"

/** Sekme başlığı. */
export function generateMetadata(): Promise<Metadata> {
  return adminListingsMetadata()
}

/** Admin › İlanlar — /admin/ilanlar (?durum=&tur=&ara=&sirala=&sayfa=). */
export default function AdminListingsPage({ searchParams }: PageProps<"/[locale]/admin/listings">) {
  return (
    <Suspense fallback={<div className="h-96" aria-hidden="true" />}>
      <AdminListingsView searchParams={searchParams} />
    </Suspense>
  )
}
