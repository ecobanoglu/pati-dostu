# Pati Dostu — Claude Code çalışma notları

Pati Dostu (pati-dostu.com); sahiplendirme, geçici yuva, kayıp ve bulunan hayvan ilanlarını, topluluk soru-cevabını, blog/haberleri, veteriner ve barınak dizinini bir araya getiren **tamamen sosyal sorumluluk amaçlı** bir platformdur. Gelir modeli yoktur (ücretli ilan, premium, reklam, bağış aracılığı yok).

## Kaynaklar — önce bunlara bak

| Ne | Nerede |
|---|---|
| Proje taslağı: roller, sayfa haritası, veritabanı, API uçları, yol haritası, alınan kararlar | `docs/proje-taslagi.md` |
| Ekran tasarımları (masaüstü 1440 px + mobil 390 px, tam sayfa) | `docs/tasarim/README.md` (dizin) ve alt klasörlerdeki `.jpg` dosyaları |
| Renk, yazı ölçeği, köşe, gölge (tek doğru kaynak) | `apps/web/app/globals.css` |
| Hazır bileşenler | `apps/web/components/ui/{button,badge,alert}.tsx`, `apps/web/lib/utils.ts` |
| Logo | `docs/marka/*.svg` (Konsept D: "PD" pati izi) |

Çelişki olursa öncelik sırası: bu dosya › `docs/proje-taslagi.md` › tasarım görselleri. `docs/tasarim/00-marka/01-marka-rehberi-taslak.jpg` eski bir taslaktır; renkler için `globals.css` geçerlidir.

Bir özelliğe başlamadan önce: taslaktaki ilgili sayfa bölümünü, API satırlarını ve veritabanı tablolarını oku; `docs/tasarim/README.md` üzerinden ilgili ekranın masaüstü **ve** mobil görselini aç.

## Çalışma şekli

- Kullanıcı Ergun, front-end geliştirici; VS Code'da çalışıyor. **Commit ve push'u kullanıcı yapar** — sen `git commit` / `git push` çalıştırma; iş bitince önerilen commit mesajını yaz.
- Commit mesajları Conventional Commits: `feat(web): …`, `fix(api): …`, `chore: …`.
- **Her fonksiyonun (React bileşenleri, sınıf metotları, export edilen ok fonksiyonları dahil) üstüne ne işe yaradığını anlatan Türkçe bir `/** … */` yorumu yaz.** Ne yaptığını ve gerekiyorsa neden öyle yaptığını söyle; kodu satır satır tekrar etme. Dekoratörlü metotlarda yorum ilk dekoratörün üstüne gelir.
- İşletim sistemi Windows; komutları PowerShell ve WSL uyumlu yaz (yol ayırıcı, `rm -rf` yerine `pnpm dlx rimraf` vb.).
- Bir işi "bitti" demeden önce `pnpm typecheck`, `pnpm lint` ve ilgili `pnpm build` / testleri çalıştır. Arayüz işinde sonucu ilgili tasarım görseliyle karşılaştır.
- Emin olmadığın ürün kararlarında tahmin yürütme; kullanıcıya sor ve kararı `docs/proje-taslagi.md` › *Alınan kararlar* listesine eklemeyi öner.

## Teknoloji yığını (Kasım 2026, kararlı sürümler)

- **Monorepo:** Turborepo + pnpm workspaces; tüm repo **TypeScript 6**.
- **apps/web:** Next.js 16 (App Router, Cache Components, `proxy.ts`), React 19, Tailwind CSS 4.3, shadcn/ui (CLI v4, Base UI), TanStack Query v5, react-hook-form + Zod 4.
- **apps/api:** NestJS 12, tek Vercel Function olarak çalışır; tüm uçlar `/api/v1` önekiyle. nestjs-zod v5 + @nestjs/swagger; OpenAPI'den `packages/api-client` üretilir.
- **Kimlik:** Better Auth 1.7 — web'de cookie, mobilde bearer (Expo eklentisi). Roller: `admin`, `clinic`, `shelter` (arayüzde "Barınak"), `user`. Şifre sıfırlama / e-posta doğrulama Better Auth uçlarıyla (`/api/auth/*`).
- **Veri:** Drizzle ORM 0.45.x + drizzle-kit 0.31.x + drizzle-zod; Postgres 17 (geliştirmede bilgisayardaki yerel Postgres, yayında Supabase — **yalnızca veritabanı**; Supabase Auth/Storage/Realtime kullanılmaz). Dosyalar **Cloudflare R2** (S3 API, `@aws-sdk/client-s3`), imzalı yükleme URL'leriyle; geliştirmede docker-compose'daki RustFS (S3 uyumlu).
- **Gerçek zamanlı:** Socket.IO `MessagingGateway` + Redis adaptörü; WebSocket kurulamazsa polling. **Supabase Realtime kullanılmaz.**
- **Redis:** Upstash (`@upstash/ratelimit` ile istek sınırlama + Socket.IO adaptörü). Geliştirmede yerel Redis + `serverless-redis-http` (Upstash REST taklidi).
- **E-posta:** Resend; geliştirmede Mailpit yakalar.
- **Zamanlanmış işler:** Vercel Cron.
- **apps/mobile:** Expo — MVP sonrası (v2). Şimdiden API'yi mobil düşünerek tasarla.

## Mimari kuralları

- İş kuralları **yalnızca API'de**. Web veritabanına doğrudan bağlanmaz; `packages/api-client` üzerinden API'yi çağırır.
- Doğrulama şemaları Zod 4 ile, drizzle-zod'dan türetilip paylaşılır; API girişleri ve web formları aynı şemayı kullanır.
- Yetki kontrolü API'de (Better Auth access control); `proxy.ts` yalnızca yönlendirme ve oturum varlığı kontrolü yapar.
- Tablolarda `id`, `createdAt`, `updatedAt`, `deletedAt` (yumuşak silme). Enum'lar `pgEnum`.
- Gizli bilgiler yalnızca `.env` dosyalarında; `.env.example` güncel tutulur, `.env*` commit edilmez.

## Ürün kuralları (özet — ayrıntı taslakta)

- **İlan onayı:** gönderilen ilan `pending` → admin `active` yapar, `changes_requested` (not + alanlar) veya `rejected` (gerekçe) der. Yayındaki ilan **her** düzenlemede yeniden `pending` olur. Herkese açık sorgular yalnızca `active` döndürür.
- **Telefon numarası varsayılan gizli** (`showPhone`); iletişim site içi mesajlaşmayla. Paylaşım görsellerinde telefon asla yer almaz.
- **İçerik filtresi:** yorum, topluluk konusu/cevabı ve iletişim formu admin onayı beklemez; `ModerationService` (kalıp kuralları: telefon, e-posta, URL, IBAN, fiyat ifadesi, tekrar + yasaklı kelimeler) eşleşirse içerik **kaydedilmez** ve kullanıcıya nedeni gösterilir, eşleşmezse anında yayınlanır. "Admin'e düşür" seçeneği yoktur. Engellenen metin saklanmaz.
- **Satış yasak:** ücret, kapora veya satış içeren ilan yayınlanmaz.
- **Yaş grupları:** Yavru (0–6 ay), Genç (6 ay–2 yaş), Yetişkin (2–7 yaş), Yaşlı (7+). İlanın ayrı bir başlık alanı vardır. Kayıp/bulunan ilanında tarih otomatik, son görülme konumu alanları var.
- **Kurumsal başvuru belgesizdir** (vergi/kütük no, adres, konum, hizmetler, çalışma saatleri); admin onayıyla rol `clinic` / `shelter` olur.
- **Çalışma saatleri:** `org_hours` (gün başına birden çok aralık), `organization.is24h`, `org_closures` (özel günler); "şu an açık" Europe/Istanbul saatine göre.
- **Kampanyalar** kodlanır ama `campaigns` özellik bayrağı v1.1'e kadar kapalı (menü, profil kutusu, randevu formundaki seçim gizli).
- **Yapay zekâ ile ilan** v1.1: tek fotoğraf → form; "Yapay zekâ hata yapabilir" uyarısı; kullanıcı başına günde 5.
- **Randevu talebi** 48 saatte yanıtlanmazsa "yanıtsız" kapanır.
- İletişim: iletisim@pati-dostu.com · sosyal medya @pati_dostu.

## Arayüz kuralları

- **Çoklu dil (next-intl):** varsayılan **Türkçe**, ikinci dil İngilizce. Yayına yalnızca Türkçe ile çıkılır (`NEXT_PUBLIC_LOCALES=tr`); İngilizce kodda hazır tutulur.
  - **Arayüzde sabit metin yazma.** Her metin `apps/web/messages/tr.json` ve `en.json`'da; bileşende `useTranslations` / `getTranslations`. İki dosyanın anahtarları aynı olmalı (`pnpm typecheck` denetler).
  - Sayfalar `app/[locale]/` altında; klasör adları İngilizce, URL'ler `i18n/routing.ts` › `pathnames` ile çevrilir (`/ilanlar` ↔ `/en/listings`). Yeni sayfa = `pathnames`'e satır ekle.
  - Bağlantı ve yönlendirmede `next/link` / `next/navigation` değil, `@/i18n/navigation` (`Link`, `redirect`, `useRouter`, `usePathname`).
  - API hata yanıtları `{ statusCode, code, message }`; arayüz `message`'ı değil `code`'u `Errors.<code>` ile çevirip gösterir. Yeni hata kodu = `apps/api/src/common/errors.ts` + iki dil dosyası.
  - Büyük/küçük harf dönüşümünde aktif dili kullan (`toLocaleUpperCase(locale)`; Türkçede İ/ı). Tarih ve sayılar `useFormatter` / `Intl` ile aktif dilde; saat dilimi Europe/Istanbul.
  - E-postalar `user.locale`'e göre gönderilir (`apps/api/src/mail/templates.ts`).
- Kod içindeki adlar (değişken, dosya, tablo, uç nokta) İngilizce; Türkçe URL'ler `pathnames` ile (tam liste taslakta *Sayfa haritası*).
- Font Nunito, `next/font/google` ile `variable: "--font-nunito"`, `subsets: ["latin", "latin-ext"]`.
- **shadcn kurulumu:** `shadcn init` kendi `globals.css`, `lib/utils.ts` ve bileşen dosyalarını yazar. Init/add sonrası bu repodaki `globals.css`, `lib/utils.ts`, `button.tsx`, `badge.tsx`, `alert.tsx` **korunmalı** (üzerine yazıldıysa `git checkout -- <dosya>` ile geri al). Her `shadcn add` sonrası `git status` ile `globals.css` farkını kontrol et (yalnızca biçimlendirse bile geri al). Bilinen sorunlar: eklenen bileşenler `cn`'i `"cn"` npm paketinden import eder ve `package.json`'a `cn` ekler → import'u `@/lib/utils` yap, `pnpm remove cn`. `button`'a bağımlı bileşenlerde (sheet, dialog…) üzerine yazma sorusuna **hayır** de (`printf 'n\n' | pnpm exec shadcn add …`). Bileşenlerdeki sabit İngilizce metinleri (ör. "Close") prop'a çevir.
- `cn()` her zaman `@/lib/utils`'ten; özel ölçüler (`text-h1`, `rounded-card`, `shadow-pop`, `size-tap`) orada tailwind-merge'e tanıtılmıştır.
- Ham hex renk yazma; `globals.css` yardımcılarını kullan (`bg-primary`, `text-heading`, `bg-smoke`, `text-success-text`, `bg-badge-lost`…).
- **Erişilebilirlik (zorunlu):** metin kontrastı ≥ 4.5:1 (çiftler `globals.css` yorumlarında); dokunma hedefi ≥ 44 px (`min-h-tap`); her form alanının görünür etiketi; hatalar `aria-invalid` + `aria-describedby`; ikon butonlarında `aria-label`; renk tek başına anlam taşımaz; klavye ile tüm akışlar kullanılabilir; `prefers-reduced-motion` desteklenir.
- Her ekran masaüstü ve mobil olarak tasarlandı; mobilde alt menü (Anasayfa, İlanlar, İlan Ver, Mesajlar, Profil) vardır.

## Şu anki adım: Yol haritası 2. aşama — İlanlar

1. aşama (Kurulum ve temel) tamamlandı: monorepo, web, API, yerel Postgres, `packages/db` + seed, Better Auth, çoklu dil (next-intl), web kabuğu ve kimlik sayfaları.

**Hazır olanlar (yeniden yazma, genişlet):** `packages/validators` (Zod şemaları, hata kodu döner), API `common/errors.ts` + hata filtresi, `AuthGuard` (`@Public`, `@Roles`, `@RequirePermissions`), `GET /api/v1/cities`, web `components/form/*` (Field, Input, Select, PasswordInput, Checkbox), `lib/errors.ts` (`useErrorMessage`), `lib/session.ts` (`getCurrentUser`), proxy'de korumalı yollar (`/ilan-ver` dahil).

**Alt adımlar** (API uçları taslaktaki *API uç noktaları* tablosuna göre; ekranlar `docs/tasarim/README.md` üzerinden masaüstü + mobil):

1. ✅ **Sözlük API'si:** `GET /cities/{id}/districts`, `GET /species?locale=`, `GET /species/{id}/breeds?locale=` ("Melez / Bilinmiyor" ilk sırada). Tür/ırk adları jsonb `{ tr, en }` (`LocalizedText`, `localize()` — `packages/db`). Web'de önbellekli okuma: `lib/dictionary.ts` (`getCities`, `getDistricts`, `getSpecies`, `getBreeds`).
2. **Dosya yükleme:** S3 istemcisi (`@aws-sdk/client-s3` + presigner; yerelde RustFS, yayında R2), `POST /listings/{id}/images/upload-url` (imzalı PUT; tür ve boyut sınırı, en fazla 5), `PUT /listings/{id}/images` (sıra, kapak). Web `ImageUploader` (sürükle-bırak, önizleme, kapak seçimi, klavyeyle sıralama). Ön koşul: Docker'daki RustFS çalışıyor olmalı.
3. **İçerik filtresi:** API'de `ModerationService` (telefon, e-posta, URL, IBAN, fiyat kalıpları + `banned_term`, `normalizeTurkish` ile). Eşleşirse kayıt yok, kod döner (`CONTENT_BLOCKED` + kural); `moderation_hit` sayılır, metin saklanmaz. İlan başlığı/açıklaması bundan geçer.
4. **İlan API'si:** `POST /listings` (onaya gönder → `pending`), `PATCH /listings/{id}` (her düzenleme yeniden `pending`), `DELETE` (yumuşak), `POST /listings/{id}/status` (sahiplendirildi/kapatıldı), `GET /me/listings`, `GET /listings` (filtreler, sıralama, sayfalama, `searchVector` ile arama; yalnız `active`), `GET /listings/{id}` (telefon yalnız `showPhone` + oturum; çip numarası yalnız admin), `GET /listings/{id}/similar`. Admin onay uçları (`/admin/listings…` approve / reject / request-changes) — arayüzü 5. aşamada; şimdilik Swagger'dan denenir. Satış yasağı ve onay akışı CLAUDE.md › Ürün kuralları.
5. **İlan ver formu (YZ'siz):** `/ilan-ver`, çok adımlı (tasarım 04, 21, 20), taslak › *İlan oluşturma* alanları; türe göre ırk, ile göre ilçe; kayıp/bulunan için son görülme konumu; "Telefonumu göster" varsayılan kapalı; e-postası doğrulanmamış kullanıcı ilan veremez.
6. **İlan listeleme:** `/ilanlar`, `/ilanlar/[kategori]`, `/ilanlar/[kategori]/[sehir]` (tasarım 02, 17, 18). Sol filtre paneli (mobilde Sheet), filtreler URL'de (nuqs), ilk sayfa SSR + TanStack Query; ilan kartı bileşeni (tür rozeti `Badge`).
7. **İlan detay:** `/ilan/[slug]-[id]` (tasarım 03, 19): galeri (lightbox), özellik tablosu, ilan sahibi kartı, telefon gizliliği (Ara / WhatsApp yalnız `showPhone` + giriş), benzer ilanlar, görüntülenme sayısı; yalnız `active` ilanlar (değilse 404).
8. **Favoriler:** `PUT/DELETE /listings/{id}/favorite`, `GET /me/favorites`; kartta ve detayda kalp butonu (misafirde girişe yönlendirir).
9. **Paylaşım görseli:** `next/og` ile 6 şablon (Klasik, Polaroid, Afiş, Minimal, Turuncu, Karakter), post (1:1) ve story (9:16); kayıp/bulunanda Afiş varsayılan; **telefon asla yer almaz**.
10. **Anasayfa:** hero arama formu (şehir, tür, cinsiyet, yaş → `/ilanlar?…`) ve "En yeni ilanlar" gerçek veriyle (tasarım 01, 16). Topluluk ve blog bölümleri 4. aşamada.

Her alt adım ayrı, küçük ve çalışır durumda bir commit olacak şekilde ilerle; adım sonunda kullanıcıya neyi nasıl deneyeceğini ve önerilen commit mesajını yaz. Arayüz işlerinde sonucu tarayıcıda (masaüstü 1440 px + mobil 390 px) tasarımla karşılaştır.

**1. aşamadan açık kalanlar** (ilgili adımda ya da kullanıcı hazır olunca):
- `docker-compose.yml` servisleri (redis, serverless-redis-http, mailpit, RustFS) Docker kurulu olmadığı için hiç çalıştırılmadı; 2. alt adımdan önce doğrulanmalı.
- Üst menüdeki **megamenü** (taslak 1. aşamada) yapılmadı; ilan kategorileri netleşince (6. alt adım) eklenecek.
- Better Auth istek sınırlaması bellekte; Redis hazır olunca `secondaryStorage` ile Upstash'e bağlanacak.
- Google ile giriş: kimlik bilgileri girilince `NEXT_PUBLIC_GOOGLE_AUTH=true`.
- Şifre değişince tüm oturumlar kapanır (karar). Sıfırlamada uygulanıyor; şifre değiştirme (3. aşama, Profil ve ayarlar) için API'deki Better Auth hook'unda `/change-password` isteğine `revokeOtherSessions: true` zorla — istemciye bırakma.
