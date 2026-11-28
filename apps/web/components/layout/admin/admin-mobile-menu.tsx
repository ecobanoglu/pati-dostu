"use client"

import { Menu } from "lucide-react"
import { useTranslations } from "next-intl"
import { useState } from "react"

import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

import { AdminSidebar } from "./admin-sidebar"

/** Mobil admin menüsü (tasarım 07-admin/04): koyu üst çubuktaki hamburger, soldan açılan kenar çubuğu. */
export function AdminMobileMenu() {
  const t = useTranslations("Admin")
  const tc = useTranslations("Common")
  const [open, setOpen] = useState(false)
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        aria-label={tc("openMenu")}
        className="-ml-2 inline-flex size-tap items-center justify-center rounded-lg text-white hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-sidebar-ring"
      >
        <Menu aria-hidden="true" className="size-6" />
      </SheetTrigger>
      <SheetContent
        side="left"
        closeLabel={tc("close")}
        className="w-[85%] max-w-xs gap-0 border-sidebar-border bg-sidebar p-0 text-sidebar-foreground [&>button]:text-white [&>button:hover]:bg-white/10"
      >
        <SheetTitle className="sr-only">{t("navLabel")}</SheetTitle>
        <AdminSidebar onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  )
}
