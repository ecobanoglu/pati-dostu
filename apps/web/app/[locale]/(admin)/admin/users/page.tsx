import type { Metadata } from "next"
import { Suspense } from "react"

import { UsersView, usersMetadata } from "@/features/admin-users/users-view"

/** Sekme başlığı. */
export function generateMetadata(): Promise<Metadata> {
  return usersMetadata()
}

/** Admin › Kullanıcılar — /admin/kullanicilar (?ara=&rol=&durum=&sayfa=&kullanici=). */
export default function AdminUsersPage({ searchParams }: PageProps<"/[locale]/admin/users">) {
  return (
    <Suspense fallback={<div className="h-96" aria-hidden="true" />}>
      <UsersView searchParams={searchParams} />
    </Suspense>
  )
}
