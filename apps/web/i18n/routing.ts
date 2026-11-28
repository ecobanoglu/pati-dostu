import { defineRouting } from "next-intl/routing"

/** Kodda desteklenen tüm diller. Varsayılan Türkçe; İngilizce çevirileri messages/en.json'da. */
export const supportedLocales = ["tr", "en"] as const
export type Locale = (typeof supportedLocales)[number]

/**
 * NEXT_PUBLIC_LOCALES ile açılan diller (ör. "tr" veya "tr,en"). Yayında yalnızca "tr" açıktır;
 * kapalı bir dilin adresleri (ör. /en/...) 404 döner. Türkçe her zaman açıktır.
 */
function enabledLocales(): Locale[] {
  const fromEnv = (process.env.NEXT_PUBLIC_LOCALES ?? "tr")
    .split(",")
    .map((l) => l.trim())
    .filter((l): l is Locale => (supportedLocales as readonly string[]).includes(l))
  return fromEnv.includes("tr") ? fromEnv : ["tr", ...fromEnv]
}

/**
 * URL yapısı: Türkçe öneksiz (/ilanlar), diğer diller önekli (/en/listings).
 * Anahtarlar app/[locale] altındaki klasör yollarıdır (kod içi adlar İngilizce);
 * değerler her dilde kullanıcının gördüğü adrestir.
 */
export const routing = defineRouting({
  locales: enabledLocales() as unknown as typeof supportedLocales,
  defaultLocale: "tr",
  localePrefix: "as-needed",
  // Tarayıcı diline göre otomatik /en'e yönlendirme yok: dil yalnızca dil seçiciyle değişir (cookie'de hatırlanır).
  localeDetection: false,
  pathnames: {
    "/": "/",
    "/listings": { tr: "/ilanlar", en: "/listings" },
    "/listings/[species]": { tr: "/ilanlar/[species]", en: "/listings/[species]" },
    "/listings/[species]/[city]": { tr: "/ilanlar/[species]/[city]", en: "/listings/[species]/[city]" },
    "/listing/[slug]": { tr: "/ilan/[slug]", en: "/listing/[slug]" },
    "/post-listing": { tr: "/ilan-ver", en: "/post-listing" },
    "/community": { tr: "/topluluk", en: "/community" },
    "/community/ask": { tr: "/topluluk/soru-sor", en: "/community/ask" },
    "/community/[category]": { tr: "/topluluk/[category]", en: "/community/[category]" },
    "/community/[category]/[slug]": { tr: "/topluluk/[category]/[slug]", en: "/community/[category]/[slug]" },
    "/veterinarians": { tr: "/veterinerler", en: "/veterinarians" },
    "/shelters": { tr: "/barinaklar", en: "/shelters" },
    "/blog": "/blog",
    "/blog/[slug]": "/blog/[slug]",
    "/news": { tr: "/haberler", en: "/news" },
    "/news/[slug]": { tr: "/haberler/[slug]", en: "/news/[slug]" },
    // Admin (4. aşama: yalnız blog/haber; 5. aşamada panelin diğer sayfaları)
    "/admin/listing-review": { tr: "/admin/ilan-onayi", en: "/admin/listing-review" },
    "/admin/posts": { tr: "/admin/yazilar", en: "/admin/posts" },
    "/admin/posts/new": { tr: "/admin/yazilar/yeni", en: "/admin/posts/new" },
    "/admin/posts/[id]": { tr: "/admin/yazilar/[id]", en: "/admin/posts/[id]" },
    "/sign-in": { tr: "/giris", en: "/sign-in" },
    "/sign-up": { tr: "/kayit", en: "/sign-up" },
    "/forgot-password": { tr: "/sifremi-unuttum", en: "/forgot-password" },
    "/reset-password": { tr: "/sifre-yenile", en: "/reset-password" },
    "/verify-email": { tr: "/e-posta-dogrula", en: "/verify-email" },
    "/account": { tr: "/hesabim", en: "/account" },
    "/account/listings": { tr: "/hesabim/ilanlarim", en: "/account/listings" },
    "/account/listings/[id]/edit": { tr: "/hesabim/ilanlarim/[id]/duzenle", en: "/account/listings/[id]/edit" },
    "/account/messages": { tr: "/hesabim/mesajlar", en: "/account/messages" },
    "/account/favorites": { tr: "/hesabim/favoriler", en: "/account/favorites" },
    "/account/questions": { tr: "/hesabim/sorularim", en: "/account/questions" },
    "/account/saved-searches": { tr: "/hesabim/kayitli-aramalar", en: "/account/saved-searches" },
    "/account/notifications": { tr: "/hesabim/bildirimler", en: "/account/notifications" },
    "/account/settings": { tr: "/hesabim/ayarlar", en: "/account/settings" },
    "/organization": { tr: "/kurum", en: "/organization" },
    "/organization/appointments": { tr: "/kurum/randevular", en: "/organization/appointments" },
    "/account/organization-application": {
      tr: "/hesabim/kurumsal-basvuru",
      en: "/account/organization-application",
    },
    "/about": { tr: "/hakkimizda", en: "/about" },
    "/social-responsibility": { tr: "/sosyal-sorumluluk", en: "/social-responsibility" },
    "/contact": { tr: "/iletisim", en: "/contact" },
    "/faq": { tr: "/sss", en: "/faq" },
    "/legal/[slug]": { tr: "/yasal/[slug]", en: "/legal/[slug]" },
  },
})

export type AppPathname = keyof typeof routing.pathnames
