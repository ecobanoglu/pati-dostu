import { createNavigation } from "next-intl/navigation"

import { routing } from "./routing"

/**
 * Dile duyarlı gezinme araçları. Sayfalar arası bağlantılarda next/link yerine bunlar kullanılır:
 * <Link href="/listings"> Türkçede /ilanlar, İngilizcede /en/listings adresine gider.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing)
