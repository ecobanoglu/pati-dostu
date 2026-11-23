import createMiddleware from "next-intl/middleware"

import { routing } from "./i18n/routing"

/**
 * Next.js 16 proxy'si: URL'den dili belirler, çevrilmiş adresleri doğru sayfaya yönlendirir
 * (/ilanlar → app/[locale]/listings) ve gereksiz /tr önekini kaldırır.
 * Oturum kontrolü 7b/7c'de buraya eklenecek (yalnızca oturum varlığı; yetki kontrolü API'de).
 */
export default createMiddleware(routing)

export const config = {
  // api, _next, _vercel ve nokta içeren (dosya) yollar hariç her şey
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
}
