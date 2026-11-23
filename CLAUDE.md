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
- İşletim sistemi Windows; komutları PowerShell ve WSL uyumlu yaz (yol ayırıcı, `rm -rf` yerine `pnpm dlx rimraf` vb.).
- Bir işi "bitti" demeden önce `pnpm typecheck`, `pnpm lint` ve ilgili `pnpm build` / testleri çalıştır. Arayüz işinde sonucu ilgili tasarım görseliyle karşılaştır.
- Emin olmadığın ürün kararlarında tahmin yürütme; kullanıcıya sor ve kararı `docs/proje-taslagi.md` › *Alınan kararlar* listesine eklemeyi öner.

## Teknoloji yığını (Kasım 2026, kararlı sürümler)

- **Monorepo:** Turborepo + pnpm workspaces; tüm repo **TypeScript 6**.
- **apps/web:** Next.js 16 (App Router, Cache Components, `proxy.ts`), React 19, Tailwind CSS 4.3, shadcn/ui (CLI v4, Base UI), TanStack Query v5, react-hook-form + Zod 4.
- **apps/api:** NestJS 12, tek Vercel Function olarak çalışır; tüm uçlar `/api/v1` önekiyle. nestjs-zod v5 + @nestjs/swagger; OpenAPI'den `packages/api-client` üretilir.
- **Kimlik:** Better Auth 1.7 — web'de cookie, mobilde bearer (Expo eklentisi). Roller: `admin`, `clinic`, `shelter` (arayüzde "Barınak"), `user`. Şifre sıfırlama / e-posta doğrulama Better Auth uçlarıyla (`/api/auth/*`).
- **Veri:** Drizzle ORM 0.45.x + drizzle-kit 0.31.x + drizzle-zod; Postgres (geliştirmede yerel Supabase, yayında Supabase). Dosyalar Supabase Storage, imzalı yükleme URL'leriyle.
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

- Arayüz dili **Türkçe**; `<html lang="tr">`. Büyük/küçük harf dönüşümünde `toLocaleUpperCase("tr-TR")` (İ/ı). Tarih ve sayılar `Intl` ile `tr-TR`.
- Kod içindeki adlar (değişken, dosya, tablo, uç nokta) İngilizce; URL'ler Türkçe (`/ilanlar`, `/hesabim`, `/veterinerler`…; tam liste taslakta *Sayfa haritası*).
- Font Nunito, `next/font/google` ile `variable: "--font-nunito"`, `subsets: ["latin", "latin-ext"]`.
- **shadcn kurulumu:** `shadcn init` kendi `globals.css`, `lib/utils.ts` ve bileşen dosyalarını yazar. Init/add sonrası bu repodaki `globals.css`, `lib/utils.ts`, `button.tsx`, `badge.tsx`, `alert.tsx` **korunmalı** (üzerine yazıldıysa `git checkout -- <dosya>` ile geri al). `sidebar` / `chart` eklenince `globals.css` farkını kontrol et.
- `cn()` her zaman `@/lib/utils`'ten; özel ölçüler (`text-h1`, `rounded-card`, `shadow-pop`, `size-tap`) orada tailwind-merge'e tanıtılmıştır.
- Ham hex renk yazma; `globals.css` yardımcılarını kullan (`bg-primary`, `text-heading`, `bg-smoke`, `text-success-text`, `bg-badge-lost`…).
- **Erişilebilirlik (zorunlu):** metin kontrastı ≥ 4.5:1 (çiftler `globals.css` yorumlarında); dokunma hedefi ≥ 44 px (`min-h-tap`); her form alanının görünür etiketi; hatalar `aria-invalid` + `aria-describedby`; ikon butonlarında `aria-label`; renk tek başına anlam taşımaz; klavye ile tüm akışlar kullanılabilir; `prefers-reduced-motion` desteklenir.
- Her ekran masaüstü ve mobil olarak tasarlandı; mobilde alt menü (Anasayfa, İlanlar, İlan Ver, Mesajlar, Profil) vardır.

## Şu anki adım: Yol haritası 1. aşama — Kurulum ve temel

1. Monorepo iskeleti: `pnpm-workspace.yaml`, `turbo.json`, `packages/tsconfig` (TS 6), ESLint + Prettier, `.gitignore`, `.nvmrc` (Node 24), `.env.example`, `.github/workflows/ci.yml` (typecheck, lint, build).
2. `apps/web` (Next.js 16) — bu repodaki `globals.css`, `lib/utils.ts` ve `components/ui/*` dosyalarını koruyarak; shadcn init; Nunito; boş anasayfa.
3. `apps/api` (NestJS 12) — `GET /api/v1/health`, Zod doğrulama, Swagger (`/api/v1/docs`).
4. Yerel ortam: Supabase CLI (`supabase init`, `supabase start`) + `docker-compose.yml` (redis, serverless-redis-http, mailpit). `README.md`'ye "İlk kurulum" bölümü.
5. `packages/db`: Drizzle yapılandırması, şema (taslaktaki *Veritabanı şeması*), ilk migration, seed (il/ilçe, tür/ırk, örnek yasaklı kelimeler).
6. Better Auth: kayıt, giriş, e-posta doğrulama, şifre sıfırlama, roller; Resend (geliştirmede Mailpit).
7. Web kabuğu: üst menü (misafir ve giriş yapılmış hâlleri), footer, mobil alt menü, giriş/kayıt/şifre sayfaları — `docs/tasarim/01-sayfalar` ve `02-hesabim/…ust-menu…`.

Her alt adım ayrı, küçük ve çalışır durumda bir commit olacak şekilde ilerle; adım sonunda kullanıcıya neyi nasıl deneyeceğini ve önerilen commit mesajını yaz.
