import type { Metadata } from "next"
import { Suspense } from "react"

import { ApplicationsView, applicationsMetadata } from "@/features/admin-applications/applications-view"

/** Sekme başlığı. */
export function generateMetadata(): Promise<Metadata> {
  return applicationsMetadata()
}

/** Admin › Kurum başvuruları — /admin/kurum-basvurulari (?durum=onaylanan|reddedilen&basvuru={id}&sayfa=). */
export default function AdminApplicationsPage({
  searchParams,
}: PageProps<"/[locale]/admin/organization-applications">) {
  return (
    <Suspense fallback={<div className="h-96" aria-hidden="true" />}>
      <ApplicationsView searchParams={searchParams} />
    </Suspense>
  )
}
