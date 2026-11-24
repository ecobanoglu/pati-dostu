import { Suspense } from "react"

import { AccountSidebar, AccountSidebarFallback } from "@/features/account/account-sidebar"

/**
 * Hesabım düzeni (tasarım 02-hesabim/*): gri zemin, masaüstünde solda kullanıcı kutusu + menü, sağda sayfa.
 * Mobilde sol kutu yoktur; sayfanın kendi başlığı (geri oku) ve alt menü (tab bar) kullanılır.
 * İlan düzenleme sayfası (editor grubu) bu düzenin dışındadır.
 */
export default function AccountLayout({ children }: LayoutProps<"/[locale]/account">) {
  return (
    <div className="min-h-full bg-canvas">
      <div className="mx-auto grid max-w-site grid-cols-[minmax(0,1fr)] gap-6 px-4 py-5 lg:grid-cols-[260px_minmax(0,1fr)] lg:px-6 lg:py-8">
        <aside className="hidden lg:block">
          <Suspense fallback={<AccountSidebarFallback />}>
            <AccountSidebar />
          </Suspense>
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  )
}
