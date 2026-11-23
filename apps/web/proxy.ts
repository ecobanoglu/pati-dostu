import { type NextRequest, NextResponse } from "next/server"
import createMiddleware from "next-intl/middleware"

import { routing } from "./i18n/routing"

const intl = createMiddleware(routing)

/** Better Auth oturum cookie'si (cookiePrefix "pati-dostu"; HTTPS'te __Secure- önekiyle). */
const SESSION_COOKIES = ["pati-dostu.session_token", "__Secure-pati-dostu.session_token"]

/** Giriş gerektiren bölümler (iç yollar; alt sayfaları da kapsar). */
const PROTECTED = ["/account", "/organization", "/post-listing"] as const

/** Dil öneki: Türkçe öneksiz, diğerleri /en gibi. */
const prefix = (locale: string) => (locale === routing.defaultLocale ? "" : `/${locale}`)

/** Bir iç yolun dildeki kullanıcı adresi: ("/account", "tr") → "/hesabim", ("/account", "en") → "/en/account". */
function localizedPath(internal: keyof typeof routing.pathnames, locale: string): string {
  const entry = routing.pathnames[internal] as string | Record<string, string>
  return prefix(locale) + (typeof entry === "string" ? entry : (entry[locale] ?? internal))
}

/** Korumalı adreslerin her açık dildeki karşılığı (ör. /hesabim, /kurum, /ilan-ver, /en/account …). */
const protectedPaths = routing.locales.flatMap((locale) => PROTECTED.map((p) => localizedPath(p, locale)))

/**
 * Next.js 16 proxy'si:
 * 1. Korumalı sayfaya oturum cookie'si olmadan gelen kullanıcıyı, dönüş adresiyle giriş sayfasına yönlendirir
 *    (/hesabim/ilanlarim → /giris?next=/hesabim/ilanlarim). Yalnızca cookie varlığına bakar; oturumun geçerliliği
 *    ve yetki kontrolü API'dedir (CLAUDE.md › Mimari kuralları).
 * 2. next-intl: URL'den dili belirler, çevrilmiş adresleri doğru sayfaya yönlendirir, gereksiz /tr önekini kaldırır.
 */
export default function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const isProtected = protectedPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  const hasSession = SESSION_COOKIES.some((name) => request.cookies.has(name))

  if (isProtected && !hasSession) {
    const locale = routing.locales.find((l) => l !== routing.defaultLocale && pathname.startsWith(`/${l}/`))
    const signIn = new URL(localizedPath("/sign-in", locale ?? routing.defaultLocale), request.url)
    signIn.searchParams.set("next", pathname + search)
    return NextResponse.redirect(signIn)
  }

  return intl(request)
}

export const config = {
  // api, _next, _vercel ve nokta içeren (dosya) yollar hariç her şey
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
}
