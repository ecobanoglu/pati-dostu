# Hayvan Sahiplendirme Platformu – Proje Taslağı

Nov 23, 2026 · @Ergun

## Proje özeti ve hedefler

Platform; sahiplendirme ilanları, topluluk soru-cevap, blog ve haberleri tek çatı altında toplayan, admin, klinik, barınak ve kullanıcı rolleriyle çalışan bir Next.js uygulamasıdır. İlk sürüm (MVP) ilan, mesajlaşma, yorum ve topluluk akışlarını; sonraki sürümler klinik dizini, kayıp ilanı ve dijital pet pasaportunu kapsar.

**Proje adı:** Pati Dostu (pati-dostu.com).

**MVP hedefleri:**

1. Kullanıcı kayıt olup 3 dakikanın altında ilanını onaya gönderebilsin; ilan admin onayından sonra yayına girer (görsel yükleme + paylaşım görseli dahil).
2. Ziyaretçi; şehir, ırk, yaş, cinsiyet, boyut ve "kimden" filtreleriyle ilan bulabilsin.
3. Sahiplenmek isteyen kişi telefon, WhatsApp veya site içi mesajla ilan sahibine ulaşabilsin.
4. Topluluk soru-cevap bölümü kategorili çalışsın; admin blog ve haber ekleyebilsin.
5. Admin tüm içeriği yönetebilsin, moderasyon yapabilsin ve raporları görebilsin.

**Kapsam dışı (MVP sonrası):** Ödeme/premium, mobil uygulama, harita tabanlı servis dizini, yapay zekâ özellikleri.

## Marka ve tasarım

Proje adı Pati Dostu (pati-dostu.com); font Nunito, ana renk mor (#6839cc), vurgu rengi turuncu (#ff781f). Logo konseptleri [Pati Dostu – Logo](https://claude.ai/artifact/FM8tF5yVj4rvvYehJv4X6U) tuvalinde, tespit edilen eksikler [Marka ve Tasarım Eksikleri](https://claude.ai/artifact/42pcpNH3JpBitzEDk1BAu5) dokümanında.

| Değişken | Değer | Kullanım |
| --- | --- | --- |
| --primary-color | #6839cc | Ana butonlar, linkler, logo |
| --secondary-color | #ff781f | Vurgu butonu (üzerinde metin #25283d) |
| --heading-color | #25283d | Başlıklar |
| --title-color | #103741 | Kart başlıkları |
| --body-color | #575757 | Gövde metni |
| --smoke-bg-color | #f6e8ff | Açık mor zemin |
| --smoke-bg-color-2 | #ecf1f5 | Açık gri zemin |
| --border-color | #d7dce0 | Çizgiler (--border-color-2 #d8dde1 ile birleştirilmesi önerilir) |
| --white-color / --black-color | #ffffff / #000000 | – |
| --darkred-color | #a60c56 | Vurgu, uyarı |
| --green-color | #4e820e | Başarı, "Aşılı" rozeti |
| --yellow-color | #c8a803 | Rozet zemini (metin için değil) |
| --red-color | #e25e52 | Hata, "Kayıp" rozeti |
| --blue-color | #04b9c4 | Rozet zemini (metin için değil) |
| --purple-color | #792cb9 | İkincil mor |
| --rating-color | #ffc107 | Yıldız ikonları |

| Seviye | Masaüstü | Mobil (öneri) |
| --- | --- | --- |
| Heading | 60px | 40px |
| H1 | 40px | 32px |
| H2 | 32px | 26px |
| H3 | 28px | 24px |
| H4 | 24px | 20px |
| H5 | 20px | 18px |
| H6 | 16px | 16px |
| P | 16px | 16px |

Renkler Tailwind v4'te `@theme` içinde CSS değişkeni olarak tanımlanır ve shadcn temasına (`--primary`, `--accent`, `--border`) eşlenir; Nunito `next/font/google` ile `latin-ext` alt kümesiyle (Türkçe karakterler) yüklenir.

### Tasarım sistemi ve bileşenler

Tüm renk, yazı ölçeği, köşe yuvarlaklığı ve gölgeler `apps/web/app/globals.css` dosyasında Tailwind 4 `@theme` olarak tanımlıdır (dosya Tailwind 4.3 ile derlenip denendi). Tasarımdan koda geçerken alınan küçük kararlar:

- Form alanı kenarı `#868f98` (`--input`): dekoratif çizgi `#d7dce0` beyazda 1,4:1 kaldığı için alanların sınırı görünmüyordu; kart ve ayırıcılar `#d7dce0` olarak kalır.
- Açık yeşil zemin üstündeki metin `#3f6b0b` (`--success-text`); `#4e820e` bu zeminde 4:1 kalıyordu.
- "Kayıp" rozeti `#a60c56` zemin + beyaz metin; `#e25e52` beyaz metinle 3,5:1 olduğu için yalnızca dekoratif kullanılır.
- Yazı ölçeği mobilden masaüstüne akışkandır (`text-h1` 32 → 40 px vb.); en küçük dokunma hedefi 44 px (`min-h-tap`, `size-tap`); klavye odağı tüm öğelerde mor halka.

| Tasarımdaki parça | shadcn/ui karşılığı | Not |
| --- | --- | --- |
| Butonlar (mor ana, turuncu "İlan Ver", çerçeveli, metin, tehlike) | `Button` | Varyantlar: default, secondary (turuncu, koyu metin), outline, ghost, destructive, link. Boyut: h-12 varsayılan, h-13 büyük |
| İkon butonu + sayı rozeti (mesaj, bildirim) | `Button` size icon + özel `CountBadge` | `aria-label` sayıyı da söyler ("Bildirimler, 3 yeni") |
| Metin alanı, açıklama, seçim, tarih/saat | `Input`, `Textarea`, `Select`; tarih ve saat için yerel `input` | h-12, `rounded-lg`, `border-input` |
| Form alanı (etiket, zorunlu \*, yardım, hata) | `Field`, `FieldLabel`, `FieldDescription`, `FieldError` | react-hook-form + Zod 4; hata `aria-invalid` ve `aria-describedby` ile bağlanır |
| Hap seçiciler (cinsiyet, hizmet, özellikler) | `ToggleGroup` (single / multiple) |  |
| İlan türü kartları, puan yıldızları | `RadioGroup` + özel kart / `RatingInput` |  |
| Açık-kapalı anahtar, onay kutusu | `Switch`, `Checkbox` |  |
| İlan türü ve durum rozetleri | `Badge` | Varyantlar: adopt, foster, lost, found, success, warning, danger |
| Kartlar (ilan, blog, kurum, panel) | `Card` + `ListingCard`, `PostCard`, `OrgCard` | `rounded-card`, kenarlık; gölge yok |
| Sekmeler (Hesabım, Sözlük, Şikayetler) | `Tabs` (alt çizgili) |  |
| Pencereler (randevu, yorum, gönüllü, paylaşım) | `Dialog` masaüstü, `Drawer` mobil | Tek bir `ResponsiveDialog` sarıcısı |
| Profil menüsü / bildirim paneli | `DropdownMenu` / `Popover` | `shadow-pop` |
| Mobil menü, mobil filtre | `Sheet` (sağ / alt) |  |
| SSS, mobil içindekiler, mobil ilan düzenleme bölümleri | `Accordion` |  |
| Konum yolu, sayfalama | `Breadcrumb`, `Pagination` |  |
| Admin tabloları ve kenar çubuğu | `Table` + TanStack Table, `Sidebar` | Koyu kenar çubuğu `--sidebar` değişkenlerinden |
| Bilgi, uyarı ve hata kutuları | `Alert` | Varyantlar: info, success, warning, danger |
| "Kaydedildi", "Bağlantı kopyalandı" | `Sonner` (toast) |  |
| Avatar, yükleme iskeletleri | `Avatar`, `Skeleton` | Yükleme ve boş durumlar henüz tasarlanmadı |
| Admin grafikleri | `Chart` (Recharts) | `--chart-1` … `--chart-5` sırasıyla |
| Haftalık saat düzenleyici, fotoğraf yükleyici, harita | Özel: `WeeklyHoursEditor`, `ImageUploader`, `MapView` (MapLibre) |  |
| Paylaşım görseli şablonları | Web'de `next/og` (Satori) ile PNG | 6 şablon, 1:1 ve 9:16 |

Kurulum: `pnpm dlx shadcn@latest add button input textarea select field toggle-group radio-group switch checkbox badge card tabs dialog drawer dropdown-menu popover sheet accordion breadcrumb pagination table sidebar alert sonner avatar skeleton chart`

## Teknoloji yığını

Proje Kasım 2026 itibarıyla güncel sürümlerle başlar: Next.js 16.4 + React 19.3, TypeScript 6, Tailwind CSS 4.3, Better Auth 1.7 ve Drizzle ORM 0.45 (kararlı sürüm). Sunucu tarafı App Router + Server Actions + Cache Components, istemci tarafı önbellek TanStack Query üzerine kurulur.

| Katman | Teknoloji | Sürüm | Kullanım |
| --- | --- | --- | --- |
| Framework | [Next.js](https://nextjs.org/blog/next-16-4) (App Router) + React | 16.4 / React 19.3 | Cache Components (`"use cache"`), Turbopack (varsayılan), Server Actions, Route Handlers |
| Dil | [TypeScript](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/) | 6.0 | Tüm monorepo tek sürümde; NestJS 12 ve Swagger eklentisiyle uyumlu |
| Stil | [Tailwind CSS](https://tailwindcss.com/blog/tailwindcss-v4-3) | 4.3 | CSS-first yapılandırma (`@theme`), karanlık mod |
| UI bileşenleri | [shadcn/ui](https://ui.shadcn.com/docs/changelog) | CLI v4 (`shadcn@latest`), Base UI tabanı | Megamenü (NavigationMenu), Sheet, Dialog, Sidebar, Toast |
| İkonlar | lucide-react | son sürüm | – |
| Form & doğrulama | react-hook-form + [Zod](https://zod.dev/v4) | Zod 4.x | Aynı zod şeması istemci ve sunucuda |
| Veri çekme | [TanStack Query](https://tanstack.com/query) | v5 (5.10x) | Filtreli ilan listesi, sonsuz kaydırma, mesaj kutusu |
| URL durumu | nuqs | son sürüm | Filtrelerin URL'de tutulması (paylaşılabilir arama) |
| Kimlik doğrulama | [Better Auth](https://better-auth.com/changelog) | 1.7 | E-posta/şifre, Google OAuth, e-posta doğrulama, admin plugin (rol, ban), access control |
| ORM | [Drizzle ORM](https://orm.drizzle.team/docs/upgrade-v1) + drizzle-kit | 0.45.x (drizzle-kit 0.31.x) | Şema, migration, seed, `drizzle-zod` |
| Veritabanı | PostgreSQL 17 (yayında Supabase, yalnızca veritabanı) | yönetilen servis | Full-text search (tsvector), pg\_trgm, ileride PostGIS |
| Dosya | Cloudflare R2 (S3 API) | – | İlan görselleri, avatar, blog kapakları; geliştirmede RustFS |
| Gerçek zamanlı | MVP: polling (karar). İleride: Socket.IO (ayrı sunucu) + Upstash Redis adaptörü | – | Mesajlaşmada anlık olaylar (yeni mesaj, okundu, yazıyor) |
| Zengin metin | Tiptap | son sürüm | Blog/haber editörü (admin) |
| Görsel üretimi | next/og (Satori) | Next.js ile gelir | İlan paylaşım görseli (Instagram/WhatsApp kartı) |
| E-posta | Resend + React Email | son sürüm | Doğrulama, şifre sıfırlama, ilan onay/red bildirimi |
| Grafik | Recharts (shadcn charts) | son sürüm | Admin raporları |
| Tablo | TanStack Table | v8 | Admin listeleri |
| Güvenlik | Upstash Ratelimit, Cloudflare Turnstile | son sürüm | Spam/bot koruması |
| Kalite | ESLint, Prettier, Vitest, Playwright | son sürüm | Birim + uçtan uca test |
| Dağıtım | Vercel + Supabase (veritabanı) + Cloudflare R2 (dosya) | – | Preview ortamları, Vercel Cron |

**Notlar:**

- Better Auth kendi tablolarını (user, session, account, verification) Drizzle adaptörüyle Postgres'te tutar; Supabase Auth kullanılmaz. Yetki kontrolü sunucu tarafında (Server Action / Data Access Layer) yapılır; Dosya yüklemeleri sunucuda üretilen imzalı URL ile R2'ye yapılır.
- Next.js 16 ile `middleware.ts` dosyasının adı `proxy.ts` oldu; oturum kontrolü orada yapılır.
- Drizzle'ın kararlı 0.45.x sürümü kullanılır. 1.0 kararlı çıktığında `drizzle-kit up` ve resmi v1 geçiş rehberiyle yükseltilir (ilişki tanımları `defineRelations()` yapısına taşınır).
- TypeScript 6 kullanılır: TypeScript 7 derleyici API'si içermediği için NestJS'in Swagger eklentisi gibi araçlarla uyumsuz. NestJS ve araçlar TypeScript 7'yi desteklediğinde geçiş değerlendirilir.
- API için eklenenler: NestJS 12 (`apps/api`, Vercel'de ayrı proje), `nestjs-zod` + `@nestjs/swagger` (doğrulama ve OpenAPI), openapi-typescript/openapi-fetch veya Orval (tipli istemci), Turborepo + pnpm workspaces (monorepo). MVP sonrası mobil için Expo (React Native) + Better Auth Expo eklentisi + Expo Push.

## Roller ve yetki matrisi

Dört rol Better Auth admin plugin'inin `role` alanıyla tutulur: `admin`, `clinic`, `shelter` (arayüzde "Barınak") ve `user`. Klinik yetkileri onaylandı; barınak rolü klinikle aynı kurumsal yetkileri taşır, yalnızca adı, rozeti ve profil alanları farklıdır.

| Yetki | Ziyaretçi | User | Clinic | Shelter (Barınak) | Admin |
| --- | --- | --- | --- | --- | --- |
| İlan listeleme / detay, blog, haber, topluluk okuma | ✓ | ✓ | ✓ | ✓ | ✓ |
| Kayıt / giriş, profil düzenleme | – | ✓ | ✓ | ✓ | ✓ |
| İlan oluşturma + paylaşım görseli üretme (admin onayıyla yayın) | – | ✓ | ✓ (limitsiz) | ✓ (limitsiz, toplu yükleme) | ✓ (onaysız) |
| İlana mesaj gönderme, yorum yazma | – | ✓ | ✓ | ✓ | ✓ |
| Topluluğa soru sorma (kategori seçerek) ve cevaplama | – | ✓ | ✓ ("Veteriner" rozetiyle) | ✓ ("Barınak" rozetiyle) | ✓ |
| Kurumsal profil sayfası (adres, çalışma saatleri, harita) | – | – | ✓ | ✓ | ✓ |
| Blog yazısı önerme (admin onayıyla yayın) | – | – | ✓ | ✓ | ✓ |
| Blog ve haber yayınlama | – | – | – | – | ✓ |
| Kategori / ırk / şehir yönetimi | – | – | – | – | ✓ |
| İlan onayı, yorum / topluluk moderasyonu, kullanıcı banlama | – | – | – | – | ✓ |
| Kurum doğrulama (klinik ve barınak rozeti verme) | – | – | – | – | ✓ |
| Raporlar ve denetim kayıtları | – | – | Kendi istatistikleri | Kendi istatistikleri | ✓ (tümü) |

**Kurumsal kayıt:** Klinik veya barınak, normal kayıt sonrası "Kurumsal hesap başvurusu" formunu doldurur ve türünü seçer. Admin onaylayınca rol `clinic` ya da `shelter` olur ve doğrulanmış rozet görünür.

**Yetki kontrolü:** `apps/api/src/auth/permissions.ts` içinde Better Auth access-control (`createAccessControl`) ile kaynak–eylem tanımlanır; her NestJS controller'ında @Roles() + RolesGuard ve servis metodlarının başında `requirePermission("listing", "create")` gibi bir yardımcı çağrılır. `proxy.ts` yalnızca oturum varlığını kontrol eder; rol kontrolü sunucuda yapılır.

## Sayfa haritası ve sayfa detayları

Sayfalar üç route grubunda toplanır: herkese açık `(public)`, giriş gerektiren `(dashboard)` ve yalnızca admin için `/admin`.

| URL | Sayfa | Render | Erişim |
| --- | --- | --- | --- |
| `/` | Anasayfa | Cache Components (`"use cache"`, 60 sn) | Herkes |
| `/ilanlar`, `/ilanlar/[kategori]`, `/ilanlar/[kategori]/[sehir]` | İlan listeleme (SEO dostu kategori/şehir sayfaları) | SSR + TanStack Query | Herkes |
| `/ilan/[slug]-[id]` | İlan detay (yalnızca onaylanmış ilanlar) | SSR | Herkes |
| `/topluluk`, `/topluluk/[kategori]` | Topluluk listeleme | SSR | Herkes |
| `/topluluk/[slug]` | Topluluk konu detay | SSR | Herkes |
| `/topluluk/soru-sor` | Yeni konu (soru sor) formu; yazarken benzer konular | CSR | Giriş |
| `/blog`, `/blog/[slug]` | Blog | Önbellekli (`cacheTag`) | Herkes |
| `/haberler`, `/haberler/[slug]` | Haberler | Önbellekli (`cacheTag`) | Herkes |
| `/veterinerler`, `/veteriner/[slug]` | Veteriner dizini ve klinik profili | Önbellekli | Herkes |
| `/barinaklar`, `/barinak/[slug]` | Barınak dizini ve profil (barınağın ilanlarıyla) | Önbellekli | Herkes |
| `/kayit`, `/giris`, `/sifremi-unuttum`, `/sifre-yenile`, `/e-posta-dogrula` | Kimlik doğrulama | CSR | Misafir |
| `/hesabim` (profil, ilanlarım + onay durumu, mesajlar, favoriler, sorularım, ayarlar) | Kullanıcı paneli | CSR | User, Clinic, Shelter |
| `/hesabim/kurumsal-basvuru` | Klinik / barınak başvuru formu | CSR | User |
| `/hesabim/ilanlarim/[id]/duzenle` | İlan düzenleme; düzeltme istendiyse admin notu ve işaretli alan üstte | CSR | İlan sahibi |
| `/kurum`, `/kurum/randevular`, `/kurum/gonullu-basvurulari`, `/kurum/ihtiyac-listesi`, `/kurum/saatler`, `/kurum/kampanyalar` | Kurum paneli (kampanyalar v1.1, bayrakla gizli) | CSR | Clinic, Shelter |
| `/ilan-ver` | İlan formu YZ'siz; /ilan-ver/yz yapay zekâ ile (1. tek fotoğraf, 2. sonuç formu) (sonunda "Onaya gönder") | CSR | User, Clinic, Shelter |
| `/hakkimizda`, `/iletisim`, `/sss` | Kurumsal sayfalar | Önbellekli (statik) | Herkes |
| `/yasal/[slug]` (kvkk, gizlilik, cerez, kullanim-sartlari, kurumsal-uyelik) | Yasal metinler | Önbellekli (statik) | Herkes |
| `not-found.tsx`, `error.tsx` | 404 ve hata / bakım sayfaları | — | Herkes |
| `/admin/*` | Admin paneli: dashboard, ilan onayı, ilanlar, kullanıcılar, kurum başvuruları, şikayetler, blog/haber (liste + editör), sözlük ve içerik filtreleri, raporlar, denetim kaydı | CSR | Admin |

### Anasayfa

- **Header:** Logo (sol); Anasayfa, İlanlar, Topluluk, Veteriner, Blog, Haberler; sağda Kayıt ol / Giriş yap (girişte avatar menüsü + "İlan Ver" butonu önerilir). Mobilde Sheet menü.
- **Hero:** Arama alanı: Şehir, Tür, Cinsiyet, Yaş + Ara butonu → `/ilanlar?sehir=&tur=&cinsiyet=&yas=`.
- **İlan listesi (en yeniler):** Kart: ilan görseli, başlık, ilan türü, tarih, şehir ve ilçe.
- **Topluluk yazıları:** Kart: konu görseli, başlık, kısa açıklama, cevap/yorum sayısı.
- **Blog yazıları (en yeniler):** Kart: görsel, başlık, kısa açıklama, kategori, detay butonu.
- **Footer:**
  - Proje logosu, açıklaması, e-posta (iletisim@pati-dostu.com), sosyal medya hesapları (@pati\_dostu; uygunluğa göre değişebilir)
  - Platform: İlanlar, Veterinerler, Barınaklar, Topluluk, Blog, Haberler
  - Hesap: Kayıt ol, Giriş yap, Kontrol paneli, Veteriner başvurusu, Barınak başvurusu
  - Kurumsal: Hakkımızda, Sosyal sorumluluk, İletişim, KVKK, Gizlilik, Kullanım Şartları, SSS

### İlan oluşturma

- **İlan türü:** Sahiplendirme, Geçici Yuva, Kayıp, Bulunan Hayvan
- **İlan başlığı:** Zorunlu, 10–80 karakter
- **Hayvan türü:** Kedi, Köpek, Kuş, Tavşan
- **Irk:** Seçilen türe göre listelenir (seed verisi), "Melez / Bilinmiyor" seçeneğiyle
- **Ad:** Bulunan hayvan ilanlarında isteğe bağlı
- **Yaş grubu:** Yavru (0–6 aylık), Genç (6 aylık – 2 yaş), Yetişkin (2–7 yaş), Yaşlı (7 yaş ve üzeri)
- **Cinsiyet:** Belirtilmemiş, Erkek, Dişi
- **Şehir, İlçe, Açıklama**
- **Son görüldüğü / bulunduğu konum (yalnız Kayıp ve Bulunan):** Mahalle veya adres tarifi + haritada işaret (isteğe bağlı)
- **Fotoğraflar:** En fazla 5 adet
- **Özellikler (çoklu seçim):** Aşılı, Kısır, Mikroçipli (seçiliyse çip numarası alanı açılır; numara yalnız admin görür), Çocuk dostu
- **Boyut:** Küçük, Orta, Büyük
- **Kimden:** Geçici evinden, Sokaktan, Barınaktan, Veteriner kliniğinden
- **Telefonumu göster:** Varsayılan kapalı
- **Onaya gönder butonu:** İlan admin onayına gider; ilan tarihi otomatik oluşturulur

Kalan küçük eksikler (fotoğraf boyut sınırı, kapak seçimi, onay kutuları) [Marka ve Tasarım Eksikleri](https://claude.ai/artifact/42pcpNH3JpBitzEDk1BAu5) dokümanında.

### İlan oluşturma: yapay zekâ ile (v1.1)

İkinci bir akış, formun çoğunu tek bir fotoğraftan doldurur; YZ'siz form her zaman seçilebilir kalır.

1. **Fotoğraf adımı:** Sayfada yalnızca "Yapay zekâ ile oluştur" kartı var: tek fotoğraf yükleme alanı, hemen altında "Yapay zekâ hata yapabilir" uyarısı ve "Yapay Zeka ile Oluştur" butonu. Formun geri kalanı bu adımda görünmez.
2. **Sonuç adımı:** API cevap verince form açılır. Üstte özet kartı (fotoğraf, doldurulan alan sayısı, uyarı, tekrar dene / önerileri temizle). Fotoğraf kapak olarak eklenir, 4 fotoğraf daha yüklenebilir. Yapay zekânın doldurduğu alanlar (tür, ırk, yaş grubu, boyut, başlık, açıklama taslağı) "YZ önerisi" etiketiyle işaretlenir; cinsiyet, ad, sağlık özellikleri ve kimden kullanıcıya bırakılır.
3. **Onay:** Forma "Yapay zekâ önerilerini kontrol ettim" onay kutusu eklenir; ilan yine admin onayından geçer.

Teknik olarak `POST /ai/listing-assist/identify` görsel destekli bir modele fotoğrafı gönderir, cevap zod ile doğrulanır; emin olunmayan alanlar boş döner. Fotoğraf yalnızca bu tahmin için işlenir.

### İlan listeleme

- **Sol panel:** Tüm kategoriler (sayacıyla) + filtreler: Şehir (→ ilçe), Irk (türe göre dinamik), Yaş aralığı, Cinsiyet, Boyut (küçük/orta/büyük), Kimden (bireysel/klinik/barınak), Arama kutusu. Mobilde filtreler Sheet içinde.
- **Sağ panel:** İlan kartları (görsel, başlık, tarih, şehir); sıralama (en yeni, en eski), grid/liste görünümü, sayfalama veya sonsuz kaydırma.
- Filtreler URL'de tutulur (nuqs); sunucu ilk sayfayı SSR ile verir, TanStack Query sonraki değişiklikleri yönetir.

### İlan detay

- **Sol:** Başlık; şehir, ilçe, ilan no, tarih; görsel galerisi (lightbox); açıklama; yorumlar.
- **Orta:** Özellik tablosu (tür, ırk, yaş, cinsiyet, boyut, aşı, kısırlaştırma, çip, ilan tarihi).
- **Sağ:** İlan sahibi kartı (fotoğraf, ad soyad, kurumsal ise klinik/barınak rozeti); iletişim butonları; benzer ilanlar (aynı tür/şehirden rastgele 4).
- **Telefon gizliliği:** Telefon numarası varsayılan olarak gizlidir ve varsayılan iletişim yolu "Mesaj gönder"dir. İlan sahibi ilan formunda "Telefonumu göster" seçeneğini açarsa, giriş yapmış kullanıcılara "Ara" ve "WhatsApp ile yaz" (`wa.me` + hazır mesaj) butonları da görünür.
- Ek: Favorile, Paylaş, Şikayet et, görüntülenme sayısı.

### Topluluk

- **Listeleme:** Konu başlıkları; kategori sekmeleri, cevap/görüntülenme sayısı, "Çözüldü" etiketi, sıralama (yeni, popüler, cevapsız). "Soru Sor" butonu (kategori seçimi zorunlu).
- **Detay sol:** Başlık, açıklama, soran kişi; cevaplar (yazar avatarı, adı, rozet, tarih), beğenme, "en iyi cevap" işaretleme.
- **Detay sağ:** Benzer konular (aynı kategori + başlık benzerliği, pg\_trgm).

### Blog ve Haberler

Liste (kapak, başlık, özet, tarih, kategori) ve detay (içindekiler, okuma süresi, ilgili yazılar). Haberlerde ülke/kaynak alanı bulunur. Admin Tiptap editörüyle ekler; taslak/yayın/planlı yayın durumları vardır.

### Admin paneli

- **Dashboard:** Toplam/aktif ilan, yeni kayıt, sahiplendirme oranı, en çok aranan ırk/şehir, bekleyen şikayet sayısı (grafiklerle, tarih aralığı seçilebilir).
- **Yönetim:** Kullanıcılar (rol değiştir, banla), ilanlar (onayla/reddet/kaldır), yorumlar, topluluk, blog, haberler, kategoriler/ırklar, klinik başvuruları, şikayetler.
- **Raporlar:** CSV dışa aktarma, denetim kayıtları (kim neyi ne zaman değiştirdi).

## Veritabanı şeması

Şema modüllere ayrılır (`db/schema/*.ts`); tüm tablolar `id` (uuid veya Better Auth için text), `createdAt`, `updatedAt` alanlarını taşır, silmeler `deletedAt` ile yumuşak yapılır.

| Modül | Tablo | Önemli alanlar |
| --- | --- | --- |
| Auth | `user` | name, email, emailVerified, image, role (user/clinic/shelter/admin), banned, phone, cityId, bio |
| Auth | `session`, `account`, `verification` | Better Auth tarafından üretilir |
| Kurum | `organization_profile` | userId, type (clinic/shelter), name, slug, taxNo, documentUrl, address, lat, lng, workingHours (jsonb), capacity (barınak), verifiedAt, status (pending/approved/rejected) |
| Sözlük | `city`, `district` | name, slug, plateCode / cityId |
| Sözlük | `species` | name (Kedi, Köpek...), slug, icon |
| Sözlük | `breed` | speciesId, name, slug, size |
| İlan | `listing` | ownerId, type (adoption/lost/found/foster), title, slug, description, speciesId, breedId, gender, ageGroup (puppy/young/adult/senior), size, vaccinated, neutered, microchipped, cityId, districtId, lastSeenAddress, lastSeenLat, lastSeenLng (kayıp/bulunan), showPhone (varsayılan false), status (draft/pending/active/adopted/closed/rejected), reviewedBy, reviewedAt, rejectionReason, listingNo, viewCount, publishedAt, searchVector (tsvector) |
| İlan | `listing_image` | listingId, url, order, isCover, imageHash (kopya görsel tespiti) |
| İlan | `listing_share_image` | listingId, template, url (üretilen paylaşım görseli) |
| İlan | `favorite` | userId, listingId (unique) |
| İlan | `listing_comment` | listingId, authorId, parentId, body, status |
| İlan | `saved_search` | userId, filters (jsonb), notifyEmail, notifyPush |
| Sahiplenme | `adoption_application` | listingId, applicantId, answers (jsonb), status (pending/interview/approved/rejected), contractUrl |
| Sahiplenme | `success_story` | listingId, authorId, body, photoUrl, status |
| Mesaj | `conversation` | listingId, starterId, ownerId, lastMessageAt |
| Mesaj | `message` | conversationId, senderId, body, readAt |
| Topluluk | `forum_category` | name, slug, description, order |
| Topluluk | `forum_topic` | categoryId, authorId, title, slug, body, status, isSolved, viewCount, answerCount |
| Topluluk | `forum_reply` | topicId, authorId, body, isBestAnswer, likeCount |
| Topluluk | `forum_reply_like` | replyId, userId |
| İçerik | `post` | type (blog/news), authorId, title, slug, excerpt, content (jsonb, Tiptap), coverUrl, categoryId, country, sourceUrl, status, publishedAt, readingTime |
| İçerik | `post_category`, `tag`, `post_tag` | Blog/haber kategori ve etiketleri |
| Moderasyon | `report` | reporterId, targetType (listing/comment/topic/reply/user), targetId, reason, status, resolvedBy |
| Sistem | `notification` | userId, type, payload (jsonb), readAt |
| Sistem | `audit_log` | actorId, action, entity, entityId, diff (jsonb) |

**İlan onay akışı:** Kullanıcı "Onaya gönder" deyince `status = pending` olur. Admin onaylarsa `active` + `publishedAt` dolar ve kullanıcıya bildirim gider. Küçük bir eksik varsa admin "Düzeltme iste" der: `changes_requested` + `reviewNote` (ve düzeltilecek alanlar) yazılır, ilan yayına girmez; kullanıcı düzenleyip tekrar gönderince `pending` olur. Kurala aykırı ilanlarda `rejected` + `rejectionReason` yazılır. Yayındaki bir ilan düzenlendiğinde, değişiklik ne kadar küçük olursa olsun yeniden `pending` olur. Herkese açık sorgular yalnızca `active` ilanları döndürür.

**İndeksler:** `listing(status, speciesId, cityId, publishedAt desc)` bileşik indeksi, `searchVector` için GIN, başlıklar için `pg_trgm` GIN (benzer konular ve yazım hatalı arama).

**Enum'lar:** `pgEnum` ile role, organization\_type, listing\_type, listing\_status, application\_status, gender, age\_group, size, post\_type, report\_status. Aynı değerler `drizzle-zod` paketiyle Zod 4 şemalarına dönüştürülür (`createInsertSchema`, `createSelectSchema`). İlişkiler `relations()` API'siyle tanımlanır ve `db.query` (Relational Queries) ile sorgulanır.

**Çalışma saatleri (klinik ve barınak):**

- `org_hours`: `id`, `orgId`, `weekday` (0 = Pazartesi … 6 = Pazar), `opensAt` (time), `closesAt` (time). Bir güne birden çok satır girilebilir; öğle arası iki ayrı aralık olarak tutulur. Satırı olmayan gün kapalı sayılır.
- `organization.is24h` (boolean): 7/24 açık kurumlar için; işaretliyse `org_hours` satırları yok sayılır.
- `org_closures`: `id`, `orgId`, `date`, `note`. Bayram ve resmî tatil gibi tek günlük kapanışlar; onaydan sonra profil ayarlarındaki "Özel günler" bölümünden eklenir.
- "Şu an açık" bilgisi bu kayıtlardan Europe/Istanbul saatine göre hesaplanır (önce `org_closures`, sonra `is24h`, sonra o günün aralıkları). Barınak profilinde aynı veri "Ziyaret saatleri" olarak gösterilir.

**İçerik filtreleri (otomatik ön kontrol):**

- `moderation_rule`: `id`, `kind` (phone, email, url, iban, price, duplicate), `enabled`, `areas` (listing, review, topic, message dizisi), `userMessage`. Hazır kalıp kuralları Admin › Sözlük › İçerik filtreleri'nden açılıp kapatılır.
- `banned_term`: `id`, `term`, `category` (hakaret, satış, diğer), `match` (exact, contains). Eşleştirme büyük/küçük harf ve Türkçe karakter farkı (ı/i, ş/s) gözetmeden yapılır; CSV ile toplu yüklenebilir.
- `moderation_hit`: `ruleId` veya `termId`, `area`, `createdAt`. Engellenen metnin kendisi saklanmaz, yalnızca hangi kuralın tetiklendiği sayılır.
- Akış: yorum, topluluk konusu ve cevap gönderilirken API (NestJS servis katmanında bir `ModerationService`) metni kurallardan geçirir. Eşleşme varsa içerik kaydedilmez ve kullanıcıya hangi kurala takıldığı gösterilir; eşleşme yoksa anında yayınlanır. Admin'e düşen bir ara durum yoktur. Yayındaki içerik şikayet edilebilir. İlanlar bu kontrolden geçtikten sonra ayrıca admin onayına gider.

## Mimari ve klasör yapısı (web + mobil)

Proje ileride mobil uygulama da çıkaracağı için Turborepo ile yönetilen bir monorepo olarak kurulur. API ayrı bir [NestJS 12](https://docs.nestjs.com/migration-guide) uygulamasıdır (`apps/api`) ve Vercel'de ayrı bir proje olarak çalışır; web ve mobil aynı API'yi HTTP üzerinden kullanır, iş kuralları yalnızca API'de durur.

```text
pati-dostu/
  apps/
    api/                      # NestJS 12 → api.pati-dostu.com (/api/v1)
      src/
        main.ts               # Vercel giriş dosyası (src/main.ts)
        app.module.ts
        common/               # guard'lar (AuthGuard, RolesGuard), filtreler, interceptor'lar, sayfalama
        auth/                 # Better Auth handler (/api/auth/*) + oturum çözümleme
        modules/
          users/  dictionary/  listings/  favorites/  comments/
          messaging/  community/  posts/  organizations/
          saved-searches/  notifications/  uploads/  admin/  reports/
        jobs/                 # Vercel Cron ile tetiklenen uçlar (bildirim, e-posta)
    web/                      # Next.js 16: sayfalar, API istemcisiyle veri çeker
      app/
        (public)/  (auth)/  (dashboard)/  admin/
        api/og/listing/[no]/  # paylaşım görseli (next/og)
      features/  components/
    mobile/                   # Expo (React Native), MVP sonrası
  packages/
    db/                       # Drizzle şeması, migration, seed (il, ilçe, tür, ırk)
    validators/               # zod şemaları (API DTO + web/mobil formlar ortak)
    api-client/               # OpenAPI'den üretilen tipli istemci + TanStack Query hook'ları
    emails/                   # React Email şablonları
    config/                   # tsconfig, eslint, tailwind tema değişkenleri
  turbo.json  pnpm-workspace.yaml
```

**Mimari kararlar:**

1. **İş kuralları yalnızca API'de.** İlan onay akışı, telefon gizliliği, yetki kontrolü NestJS servislerinde yazılır. Web (Server Component, Server Action) ve mobil aynı uçları çağırır; iki istemci farklı davranamaz.
2. **NestJS modül yapısı.** Her kaynak bir modül (controller + service + repository). Veri erişimi Drizzle ile `packages/db` üzerinden; Drizzle istemcisi bir provider olarak enjekte edilir.
3. **Doğrulama ve doküman.** NestJS 12'nin Standard Schema desteğiyle Zod 4 şemaları doğrudan doğrulamada kullanılır; DTO ve Swagger için `nestjs-zod` (v5, Zod 4 uyumlu) + `@nestjs/swagger`. OpenAPI dokümanı `/api/v1/docs` ve `/api/v1/openapi.json` adreslerinde.
4. **Tipli istemci.** `packages/api-client` OpenAPI dokümanından otomatik üretilir (openapi-typescript + openapi-fetch veya Orval). Web ve mobil aynı istemciyi ve TanStack Query hook'larını kullanır.
5. **Kimlik doğrulama.** Better Auth, NestJS içinde `/api/auth/*` yoluna bağlanır. Web cookie ile (api ve web aynı üst alan adında: `pati-dostu.com` / `api.pati-dostu.com`), mobil Expo eklentisi + bearer token ile çalışır. Global `AuthGuard` oturumu çözer, `@Roles()` dekoratörü + `RolesGuard` rol kontrolünü yapar.
6. **Web'de veri çekme.** Server Component'ler API'yi sunucuda çağırır ve sonucu Cache Components (`"use cache"` + `cacheTag`) ile önbelleğe alır; ilan onaylanınca API, web'in revalidate uçuna (`/api/revalidate`, gizli anahtarla) haber verir. İstemci tarafı listeler TanStack Query kullanır.
7. **Dosya yükleme.** API, Cloudflare R2 için imzalı yükleme linki (S3 presigned PUT) üretir; web ve mobil dosyayı doğrudan R2'ye yükler, sonra API'ye yolu bildirir.
8. **Serverless kısıtları.** Vercel'de NestJS tek bir Vercel Function olarak çalışır. `@nestjs/schedule` kullanılmaz; zamanlanmış işler (kayıtlı arama bildirimi, e-posta) `jobs/` altındaki uçları tetikleyen Vercel Cron ile yapılır. WebSocket, Vercel'in Haziran 2026'da public beta olarak sunduğu destekle çalışır (madde 12). Trafik artarsa API, kod değişmeden Render/Railway/Fly.io gibi sürekli çalışan bir sunucuya taşınabilir.
9. **Bildirimler.** Web için e-posta ve site içi bildirim; mobil için Expo Push (`push_token` tablosu). Gönderimi API servisleri yapar.
10. **TypeScript sürümü.** NestJS 12'nin yükseltme aracı TypeScript 6'yı hedefliyor ve Swagger CLI eklentisi TypeScript derleyici API'sine ihtiyaç duyuyor (TypeScript 7'de bu API yok). Bu yüzden tüm monorepo (api, web, mobil) TypeScript 6 ile derlenir.
11. **CORS ve güvenlik.** API yalnızca `pati-dostu.com` ve geliştirme adreslerine CORS izni verir; `helmet`, istek sınırı (Upstash Ratelimit) ve global hata filtresi tanımlıdır.
12. **Mesajlaşma: REST + WebSocket.** _(MVP kararı: WebSocket yerine polling — bkz. Alınan kararlar; aşağıdaki WebSocket tasarımı ileride ayrı sunucu/servisle eklenirse geçerli.)_ Mesaj `POST /conversations/{id}/messages` ile veritabanına kaydedilir; asıl kaynak bu kayıttır. WebSocket yalnızca anlık olayları iletir (yeni mesaj, okundu, yazıyor). NestJS `MessagingGateway` (Socket.IO) her konuşmayı bir oda olarak yönetir; bağlantıda web cookie, mobil Better Auth token'ı ile kimlik doğrulanır. Instance'lar arası iletim Upstash Redis ile Socket.IO Redis adaptörüyle yapılır. Vercel'de bağlantı fonksiyon süresi dolunca (yaklaşık 5 dakika) kapanır; istemci otomatik yeniden bağlanır. WebSocket kurulamazsa istemci kısa aralıklarla sorgulamaya (polling) geçer; uygulama arka plandayken mobil bildirim Expo Push ile gider. Supabase Realtime kullanılmaz.

## API uç noktaları (/api/v1)

MVP için yaklaşık 60 uç nokta gerekiyor; hepsi NestJS API'de (api.pati-dostu.com) `/api/v1` önekiyle çalışır, kimlik doğrulama uçları ise Better Auth'un kendi `/api/auth/*` yolundadır (kayıt, giriş, çıkış, oturum, Google, e-posta doğrulama, şifre sıfırlama).

**Ortak kurallar:**

- **Yanıt biçimi:** Başarılı yanıt `{ data, meta }`; hata `{ error: { code, message, fields? } }` (HTTP 400/401/403/404/409/422/429).
- **Sayfalama:** Listelerde imleç (cursor) tabanlı: `?limit=20&cursor=...`, yanıtta `meta.nextCursor`. Mobilde sonsuz kaydırmaya doğrudan uyar.
- **Yetki seviyeleri:** Herkes (oturumsuz), Giriş (her rol), Sahibi (kaydın sahibi), Kurum (clinic/shelter), Admin.
- **Hız sınırı:** Yazma uçlarında Upstash Ratelimit (ör. ilan oluşturma, mesaj, yorum).
- **Doküman:** `/api/v1/openapi.json` ve geliştirme ortamında `/api/v1/docs` (Scalar veya Swagger UI).

| Kaynak | Yöntem | Uç nokta | Yetki | Açıklama |
| --- | --- | --- | --- | --- |
| Hesap | GET | `/me` | Giriş | Oturumdaki kullanıcı, rol, profil |
| Hesap | PATCH | `/me` | Giriş | Profil düzenleme (ad, telefon, şehir, biyografi) |
| Hesap | POST | `/me/avatar/upload-url` | Giriş | Avatar için imzalı yükleme linki |
| Hesap | POST / DELETE | `/me/push-tokens` | Giriş | Mobil push token kaydı / silme |
| Sözlük | GET | `/cities`, `/cities/{id}/districts` | Herkes | İl ve ilçe listeleri |
| Sözlük | GET | `/species`, `/species/{id}/breeds` | Herkes | Hayvan türleri ve ırklar |
| İlanlar | GET | `/listings` | Herkes | Filtreler: type, species, breed, city, district, gender, age, size, source (kimden), features, q, sort; yalnız onaylı ilanlar |
| İlanlar | GET | `/listings/{id}` | Herkes | Detay (yayındaki ilan; sahibi/admin diğer durumları önizler). Telefon yok — `showPhone` açıksa yalnız maskeli hâli (`contact.phoneMasked`), böylece yanıt önbelleğe alınabilir |
| İlanlar | GET | `/listings/{id}/phone` | Giriş | Tam telefon numarası; yalnız yayındaki ve `showPhone` açık ilanda (sahibi/admin her zaman), aksi hâlde 404 |
| İlanlar | POST | `/listings/{id}/views` | Herkes | Görüntülenme sayısını 1 artırır (yayındaki ilan; sahibin kendi bakışı sayılmaz). Web oturum başına bir kez çağırır |
| İlanlar | GET | `/listings/{id}/similar` | Herkes | Aynı tür/şehirden rastgele 4 ilan |
| İlanlar | POST | `/listings` | Giriş (doğrulanmış e-posta) | İlan oluşturur. Gövdede `submit`: `false` → taslak (`draft`, yalnızca tür zorunlu), `true` → onaya gönderim (`pending`; tüm zorunlu alanlar, en az 1 fotoğraf, ücretsiz onayı). `images`: sıralı yükleme anahtarları |
| İlanlar | PATCH | `/listings/{id}` | Sahibi | Düzenleme; form ilanın tamamını gönderir (gövde POST ile aynı). Onaya gönderimde ilan her zaman yeniden `pending` olur; yayına girmiş ilan taslağa çevrilemez, sahiplendirilen/kapatılan düzenlenemez |
| İlanlar | DELETE | `/listings/{id}` | Sahibi, Admin | Yumuşak silme |
| İlanlar | POST | `/listings/{id}/status` | Sahibi | Sahiplendirildi / kapatıldı olarak işaretleme |
| Yükleme | POST | `/uploads/listing-image` | Giriş (doğrulanmış e-posta) | Fotoğraf için imzalı PUT linki; dosya `tmp/listing-images/{userId}/` altına yüklenir. İlan henüz yokken (form doldurulurken) çalışır |
| İlanlar | PUT | `/listings/{id}/images` | Sahibi | Fotoğrafları ilana bağlar, sıralar (ilk = kapak; en fazla 5). API geçici dosyaları doğrulayıp `listings/{id}/` altına taşır. `POST/PATCH /listings` gövdesindeki `images` de aynı işi yapar |
| İlanlar | GET | `/api/og/listing/{no}?t=&f=&o=&l=` (web) | Herkes | Paylaşım görseli (PNG). API'de değil, web'deki Next.js route handler'da (`next/og`). `t` = classic, polaroid, poster, minimal, orange, character; `f` = post (1080×1080), story (1080×1920); `o=1` özellik çipleri. Yalnız yayındaki ilan (değilse 404). İstek anında üretilir, CDN önbelleği (s-maxage 1 sa); R2'ye yazılmaz, `listing_share_image` tablosu kullanılmaz |
| İlanlar | POST | `/listings/{id}/report` | Giriş | Şikayet bildirimi |
| İlanlar | GET | `/me/listings` | Giriş | Kendi ilanları (tüm durumlar, en son güncellenen önce): kart + görüntülenme, admin notu ve düzeltilecek bölümler, red gerekçesi, son güncelleme |
| Hesabım | GET | `/me/summary` | Giriş | Panel özeti: durumlara göre ilan sayısı, favori sayısı, toplam görüntülenme |
| Hesabım | PATCH | `/me` | Giriş | Profil (ad, şehir, hakkımda — içerik filtresinden geçer), telefon, tercihler (bülten, telefon varsayılanı); gönderilen alanlar güncellenir. Better Auth `/update-user` kapalı |
| Hesabım | POST | `/uploads/avatar` | Giriş | Profil fotoğrafı için imzalı yükleme adresi (`tmp/avatars/{userId}/`) |
| Hesabım | PUT / DELETE | `/me/avatar` | Giriş | Yüklenen fotoğrafı doğrulayıp profil fotoğrafı yapar (`avatars/{userId}/`) / kaldırır |
| Hesabım | DELETE | `/me` | Giriş | Hesabı kapatır ve anonimleştirir (mevcut şifre ya da Google hesabında onay); ilanlar yumuşak silinir |
| Favoriler | GET | `/me/favorites` | Giriş | Favori ilanlar (en son eklenen önce): yayındakiler + sahiplendirilen/kapatılanlar |
| Favoriler | GET | `/me/favorites/ids` | Giriş | Favorideki ilan numaraları (kart ve detaydaki kalplerin durumu) |
| Favoriler | PUT / DELETE | `/listings/{id}/favorite` | Giriş | Favoriye ekle / çıkar |
| Yorumlar | GET / POST | `/listings/{id}/comments` | Herkes / Giriş | İlan yorumlarını listeleme / yazma |
| Yorumlar | DELETE | `/comments/{id}` | Sahibi, Admin | Yorum silme |
| Mesajlar | GET | `/conversations` | Giriş | Konuşma listesi, okunmamış sayısıyla |
| Mesajlar | POST | `/conversations` | Giriş | İlan için konuşma başlatır (ilk mesajla) |
| Mesajlar | GET / POST | `/conversations/{id}/messages` | Katılımcı | Mesajları listeleme (cursor) / gönderme |
| Mesajlar | POST | `/conversations/{id}/read` | Katılımcı | Okundu işareti |
| Topluluk | GET | `/forum/categories` | Herkes | Kategoriler |
| Topluluk | GET | `/forum/topics` | Herkes | Filtreler: category, q, sort (yeni, popüler, cevapsız) |
| Topluluk | GET | `/forum/topics/{slug}`, `/forum/topics/{id}/similar` | Herkes | Konu detayı + cevaplar; benzer konular |
| Topluluk | POST | `/forum/topics` | Giriş | Soru sorma (kategori zorunlu, görsel isteğe bağlı); içerik filtresinden geçerse anında yayınlanır |
| Topluluk | POST | `/forum/topics/{id}/replies` | Giriş | Cevap yazma; içerik filtresinden geçerse anında yayınlanır |
| Topluluk | PUT / DELETE | `/forum/replies/{id}/like` | Giriş | Beğen / beğeniyi geri al |
| Topluluk | POST | `/forum/replies/{id}/best-answer` | Soru sahibi | En iyi cevap işaretleme |
| İçerik | GET | `/posts?type=blog\|news`, `/posts/{slug}` | Herkes | Blog ve haber listesi / detayı |
| Kurumlar | GET | `/organizations?type=clinic\|shelter`, `/organizations/{slug}` | Herkes | Veteriner ve barınak dizini / profili |
| Kurumlar | POST | `/organizations/applications` | Giriş | Klinik veya barınak başvurusu (belge yok: vergi/kütük no, adres, konum, hizmetler, çalışma saatleri) |
| Kurumlar | PATCH | `/organizations/me` | Kurum | Kurumsal profil düzenleme |
| Kayıtlı arama | GET / POST / DELETE | `/me/saved-searches` | Giriş | Arama kaydetme ve bildirim tercihi |
| Bildirimler | GET | `/me/notifications` | Giriş | Site içi bildirimler |
| Bildirimler | POST | `/me/notifications/read` | Giriş | Toplu okundu işareti |
| Admin | GET | `/admin/listings?status=pending` | Admin | İlan onay kuyruğu |
| Admin | POST | `/admin/listings/{id}/approve`, `/admin/listings/{id}/reject` | Admin | Onay / red (gerekçe zorunlu), kullanıcıya bildirim |
| Admin | POST | `/admin/listings/{id}/request-changes` | Admin | Düzeltme iste (not + alan listesi), `status = changes_requested`, kullanıcıya bildirim |
| Admin | GET / PATCH | `/admin/users`, `/admin/users/{id}` | Admin | Kullanıcı listesi, rol değiştirme, banlama |
| Admin | GET / POST | `/admin/organizations/applications`, `.../{id}/approve`, `.../{id}/reject` | Admin | Kurum başvurularını değerlendirme |
| Admin | GET / POST / PATCH / DELETE | `/admin/posts` | Admin | Blog ve haber yönetimi (taslak, yayın, planlı) |
| Admin | GET / POST / PATCH / DELETE | `/admin/taxonomy/{species\|breeds\|forum-categories\|post-categories}` | Admin | Sözlük yönetimi |
| Admin | GET / POST | `/admin/reports`, `/admin/reports/{id}/resolve` | Admin | Şikayetler |
| Admin | GET | `/admin/stats?from=&to=` | Admin | Dashboard metrikleri |
| Admin | GET | `/admin/audit-logs`, `/admin/export/{entity}.csv` | Admin | Denetim kayıtları, CSV dışa aktarma |
| Hesap | POST | `/api/auth/forget-password`, `/api/auth/reset-password`, `/api/auth/send-verification-email` | Herkes | Şifre sıfırlama ve e-posta doğrulama (Better Auth uçları; NestJS'te ayrıca yazılmaz) |
| Kurumlar | GET / PUT | `/organizations/me/hours`, `/organizations/me/closures` | Kurum | Haftalık çalışma saatleri (`is24h` dahil) ve özel günler |
| İletişim | POST | `/contact` | Herkes | İletişim formu (rate limit + içerik filtresi), iletisim@pati-dostu.com'a iletilir |
| Admin | GET / POST / PATCH / DELETE | `/admin/moderation/rules`, `/admin/moderation/terms` | Admin | İçerik filtresi kuralları ve yasaklı kelimeler (CSV içe aktarma dahil) |
| Admin | POST | `/admin/moderation/test` | Admin | Bir metni filtrelerden geçirip sonucu gösterir |

Web arayüzü bu uçların aynısını kullanır; mobil uygulama için ek uç gerekmez, yalnızca push token kaydı mobile özgüdür.

**WebSocket (mesajlaşma) — ileride; MVP polling (Alınan kararlar):** `wss://api.pati-dostu.com` üzerinde Socket.IO `/messaging` namespace'i. İstemci olayları: `conversation:join`, `conversation:leave`, `typing`. Sunucu olayları: `message:new`, `message:read`, `typing`, `conversation:updated` (okunmamış sayısı). Mesaj gönderme REST ile yapılır, WebSocket yalnızca bildirir.

### Genişletme önerileri için uç noktalar

Genişletme önerileri ve Patipetra karşılaştırmasındaki sonraki sürüm özellikleri yaklaşık 40 ek uç gerektiriyor; MVP tablosunda zaten olanlar (kayıtlı arama, paylaşım görseli, geçici yuva ilan türü) tekrar edilmedi. Aşama sütunu yol haritasıyla aynıdır; her modül ilgili sürümde eklenir.

| Özellik | Yöntem | Uç nokta | Yetki | Açıklama | Aşama |
| --- | --- | --- | --- | --- | --- |
| Topluluk görseli | POST | `/forum/topics/upload-url` | Giriş | Konuya görsel ekleme için imzalı link (anasayfa kartı görsel istiyor) | MVP |
| Mutlu sonlar | GET | `/success-stories`, `/success-stories/{id}` | Herkes | Sahiplendirme hikayeleri | v1.1 |
| Mutlu sonlar | POST | `/listings/{id}/success-story` | Sahibi | "Sahiplendirildi" ilana hikaye + fotoğraf ekleme (admin onayıyla) | v1.1 |
| Sahiplendirme sonrası takip | POST | `/jobs/adoption-follow-up` | Cron | 1. hafta, 1. ay ve 3. ayda takip e-postası | v1.1 |
| Topluluk itibarı | GET | `/users/{id}` | Herkes | Herkese açık profil: itibar puanı, rozetler, son cevaplar | v1.1 |
| Topluluk etiketleri | GET | `/forum/tags` | Herkes | Etiket listesi; `/forum/topics?tag=` ile filtre | v1.1 |
| Randevu talebi | POST | `/organizations/{slug}/appointment-requests` | Giriş | Kliniğe randevu talebi gönderme | v1.1 |
| Randevu talebi | GET / PATCH | `/organizations/me/appointment-requests`, `/appointment-requests/{id}` | Kurum | Talepleri görme ve yanıtlama | v1.1 |
| Kurum yorumları | GET / POST | `/organizations/{slug}/reviews` | Herkes / Giriş | Klinik ve barınak puan + yorum; otomatik içerik filtresinden geçen yorum anında yayınlanır | v1.1 |
| Kampanyalar | GET | `/campaigns` | Herkes | Ücretsiz kısırlaştırma/aşı kampanyaları | v1.1 |
| Kampanyalar | POST / PATCH / DELETE | `/organizations/me/campaigns` | Kurum | Kampanya duyurusu yönetimi; MVP'de kodlanır, `campaigns` bayrağı v1.1'de açılır | v1.1 |
| Toplu ilan | POST | `/organizations/me/listings/import` | Shelter | CSV ile toplu ilan; tüm ilanlar onaya düşer | v1.1 |
| İhtiyaç listesi | GET / PUT | `/organizations/{slug}/needs`, `/organizations/me/needs` | Herkes / Shelter | Mama, ilaç ihtiyacı ve gönüllü çağrısı | v1.1 |
| Gönüllülük | POST / GET | `/organizations/{slug}/volunteer-applications`, `/organizations/me/volunteer-applications` | Giriş / Shelter | Barınağa gönüllü başvurusu ve başvuruların listesi | v1.1 |
| Telefon doğrulama | POST | `/me/phone/verify/start`, `/me/phone/verify/confirm` | Giriş | SMS OTP; "Doğrulanmış" rozeti (Better Auth phone number eklentisi) | v1.1 |
| Kullanıcı engelleme | GET / POST / DELETE | `/me/blocks` | Giriş | Engellenen kullanıcı mesaj atamaz, yorumları gizlenir | v1.1 |
| Web push | POST / DELETE | `/me/web-push-subscriptions` | Giriş | PWA bildirim aboneliği | v1.1 |
| Bülten | POST / GET | `/newsletter/subscribe`, `/newsletter/unsubscribe?token=` | Herkes | Haftalık yeni ilanlar + blog bülteni | v1.1 |
| Admin raporları | GET | `/admin/stats/funnel`, `/admin/stats/cities` | Admin | Sahiplendirme hunisi (görüntülenme → mesaj → başvuru → sahiplendirildi), şehir ısı haritası | v1.1 |
| Admin onayları | GET / POST | `/admin/success-stories`, `/admin/campaigns`, `.../{id}/approve` | Admin | Hikaye ve kampanya onayı | v1.1 |
| Harita görünümü | GET | `/listings/map?bbox=&species=&type=` | Herkes | Harita için hafif nokta listesi (PostGIS) | v1.2 |
| Kayıp ilanı bildirimi | GET / PUT | `/me/alert-area` | Giriş | Bildirim bölgesi (konum + yarıçap, ör. 3 km) | v1.2 |
| Kayıp ilanı bildirimi | POST | `/jobs/lost-pet-alerts` | Cron / iç | Onaylanan kayıp ilanını yakındaki kullanıcılara bildirme | v1.2 |
| Kayıp afişi | GET | `/listings/{id}/poster.pdf` | Herkes | Yazıcı dostu A4 afiş (QR kodlu) | v1.2 |
| Benzer konu önerisi | GET | `/forum/topics/suggest?q=` | Herkes | Soru yazılırken benzer çözülmüş konular | v1.2 |
| Sahiplenme başvurusu | POST | `/listings/{id}/applications` | Giriş | Yapılandırılmış başvuru formu (ev tipi, deneyim, diğer hayvanlar) | v2 |
| Sahiplenme başvurusu | GET | `/listings/{id}/applications`, `/me/applications` | Sahibi / Giriş | Başvuruları karşılaştırma; kendi başvurularını izleme | v2 |
| Sahiplenme başvurusu | PATCH | `/applications/{id}` | İlan sahibi | Durum: bekliyor → görüşme → onaylandı / reddedildi | v2 |
| Sahiplendirme sözleşmesi | GET | `/applications/{id}/contract.pdf` | Taraflar | Onaylanan başvurudan PDF sözleşme | v2 |
| Yapay zekâ | POST | `/ai/listing-assist/identify` | Giriş | Tek fotoğraftan tür, ırk, yaş grubu, boyut tahmini + başlık önerisi; yapılandırılmış JSON, alan başına güven seviyesi; kullanıcı başına günlük 5 kullanım | v1.1 |
| Yapay zekâ | POST | `/ai/listing-assist/description` | Giriş | İlan açıklaması yazım önerisi | v1.1 |
| Pet dostu mekanlar | GET | `/places?type=&city=`, `/places/{id}` | Herkes | Kafe, otel vb. harita listesi | v2 |
| Pet dostu mekanlar | POST | `/places` | Giriş | Mekan önerisi (admin onayıyla) | v2 |

Görsel hash kontrolü, mesajda spam filtresi ve yapay zekâ ile otomatik moderasyon ayrı uç gerektirmez; ilan veya mesaj oluşturulurken API servisleri içinde çalışır. @bahsetme de cevap metninden ayrıştırılıp bildirim olarak gönderilir.

**Bu uçlar için eklenecek tablolar:** `user_badge` (+ `user.reputation`), `forum_tag`, `forum_topic_tag`, `appointment_request`, `organization_review`, `campaign`, `organization_need`, `user_block`, `user_alert_area`, `web_push_subscription`, `newsletter_subscriber`, `place`. `adoption_application`, `success_story` ve `saved_search` şemada zaten var.

## Patipetra incelemesinden alınan özellikler

[Patipetra](https://patipetra.com/) ilanın ötesine geçip kayıp ilanı, veteriner/barınak dizini ve dijital pet pasaportu sunuyor; bunlardan projeye uyanlar öncelik sırasıyla aşağıda.

| Özellik | Patipetra'da | Bizim projeye uyarlama | Aşama |
| --- | --- | --- | --- |
| İlan türleri | Sahiplendirme, kayıp, bulundu | `listing.type` enum'u; kayıp/bulundu için son görülme yeri ve tarihi | MVP |
| Sağlık rozetleri | Aşılı, kısır, çipli rozetleri kartta | Kart ve filtrede boolean alanlar | MVP |
| Site içi mesaj | Telefon paylaşmadan iletişim | Telefon varsayılan gizli; Realtime mesaj ana iletişim yolu | MVP |
| Moderasyon | AI + insan kontrolü, ticari satıcı filtresi | Her ilan admin onayından geçer; şikayet sistemi; "satılık" kelime filtresi | MVP |
| KVKK sayfaları | KVKK, gizlilik, kullanım koşulları, SSS | Statik sayfalar + kayıtta açık rıza onayı | MVP |
| Şehir/tür landing sayfaları | Şehir ve hayvan türü bağlantıları | `/ilanlar/kedi/izmir` gibi SEO sayfaları | MVP |
| Karanlık mod | Var | `next-themes` + shadcn | MVP |
| Doğrulanmış veteriner dizini | Şehre göre arama, rozet | `clinic` rolü + `/veterinerler` dizini | v1.1 |
| Barınak dizini | Doğrulanmış barınaklar, toplu ilan | `shelter` rolü (arayüzde "Barınak") + `/barinaklar` dizini, toplu ilan yükleme | v1.1 |
| Mutlu sonlar | Sahiplendirme hikayeleri | İlan "sahiplendirildi" olunca hikaye + fotoğraf ekleme | v1.1 |
| Mobil alt menü | Ana, İlan, Destek, Vet, Profil | Mobilde sabit alt navigasyon (PWA) | v1.1 |
| Kayıp ilanı bildirimi | 3 km çapındaki kullanıcılara uyarı | PostGIS ile mesafe sorgusu + e-posta/push | v1.2 |
| Pet dostu mekanlar | Kafe, otel haritası | Harita + kullanıcı önerisi, admin onayı | v2 |
| Gelir modeli | Premium, %10 barınağa bağış, referans programı | Kapsam dışı: proje sosyal sorumluluk projesi; gerekirse ileride eklenir | – |

Uyum testi ve dijital pet pasaportu kapsam dışı bırakıldı.

**Farklılaşma fırsatı:** İncelenen sayfada ırk, yaş, cinsiyet ve mesafe filtreleri görünmüyor; senin planladığın detaylı sol filtre paneli ve paylaşım görseli üretimi burada güçlü bir fark olur.

## Genişletme önerileri

Patipetra'da olmayan ya da projeyi öne çıkaracak fikirler; her biri mevcut şemaya birkaç tabloyla eklenebilir.

**Sahiplendirme süreci**

- **Sahiplenme başvuru formu:** Mesaj yerine yapılandırılmış başvuru (ev tipi, diğer hayvanlar, deneyim, çalışma saatleri). İlan sahibi başvuruları karşılaştırır, durumu değiştirir (bekliyor → görüşme → onaylandı).
- **Sahiplendirme sözleşmesi:** Onaylanan başvurudan PDF sözleşme üretimi (kısırlaştırma taahhüdü, iade koşulu).
- **Sahiplendirme sonrası takip:** 1. hafta, 1. ay ve 3. ayda otomatik e-posta ile fotoğraf/durum isteği; "Mutlu sonlar" bölümünü besler.
- **Geçici yuva (foster) ilanları:** Kalıcı sahiplik yerine süreli bakım ilan türü.

**Keşif ve eşleştirme**

- **Kayıtlı arama + bildirim:** "İzmir'de 1 yaş altı dişi kedi" aramasını kaydet, yeni ilan onaylanınca e-posta/push al.
- **Harita görünümü:** İlan listesinde harita/liste geçişi (MapLibre + OpenStreetMap, ücretsiz).

**İlan görseli (senin istediğin özellik)**

- 3–4 hazır şablon (Instagram post 1080×1080, story 1080×1920, WhatsApp durum); ilan fotoğrafı, adı, şehir, rozetler ve QR kod (ilan linki) otomatik yerleşir.
- `next/og` ile sunucuda üretim; kullanıcı renk tonu ve şablon seçer, PNG indirir veya paylaşır. Aynı görsel ilanın Open Graph görseli olarak da kullanılır.
- İleri aşama: "Kayıp" ilanları için A4 yazıcı dostu afiş PDF'i.

**Topluluk**

- İtibar puanı ve rozetler (ilk cevap, 10 en iyi cevap, doğrulanmış veteriner).
- Konuya fotoğraf ekleme, etiket (ırk, yaş grubu), cevaplara @bahsetme ve bildirim.
- Veteriner cevaplarının üstte öne çıkarılması.

**Klinik ve barınak rolleri için**

- Randevu talebi formu (takvim entegrasyonu yerine basit talep kutusu ile başlar).
- Kliniklerin ücretsiz kısırlaştırma/aşı kampanyası duyurusu yayınlaması.
- Klinik sayfasında puan ve yorum.
- Barınaklar için CSV ile toplu ilan yükleme, ihtiyaç listesi (mama, ilaç) ve gönüllü çağrısı.

**Güven ve güvenlik**

- Telefon doğrulama (SMS OTP) olan kullanıcılara "Doğrulanmış" rozeti.
- Aynı görselin farklı ilanlarda kullanımını yakalayan görsel hash kontrolü (dolandırıcılık önleme).
- Kullanıcı engelleme, mesajda link/telefon spam filtresi.

**Yapay zekâ (opsiyonel)**

- Fotoğraftan tür/ırk tahmini ile ilan formunu otomatik doldurma.
- İlan açıklaması yazım yardımcısı ve otomatik moderasyon (uygunsuz içerik, satış ilanı tespiti).
- Topluluk sorusu yazılırken benzer çözülmüş konuları önerme.

**Platform**

- PWA + web push bildirimleri; ileride Expo ile mobil uygulama (aynı API).
- Admin raporlarına sahiplendirme hunisi (görüntülenme → mesaj → başvuru → sahiplendirildi) ve şehir bazında ısı haritası.
- E-posta bülteni (haftalık yeni ilanlar + blog).

## Yol haritası

Tek geliştiriciyle MVP yaklaşık 12 haftada çıkar (monorepo ve API altyapısı ilk aşamaya 2–3 gün ekler); süreler tahmindir ve her aşama bir öncekinin üzerine kurulur.

**MVP 12 haftada altı aşamada yayına çıkar:**

| Aşama | Hafta | Kapsam |
|---|---|---|
| 1. Kurulum ve temel | 1–2 | Turborepo monorepo, Next.js web, NestJS API (`/api/v1`), Drizzle + Supabase, Better Auth; şema ve seed (il, ilçe, tür, ırk); header, megamenü, footer |
| 2. İlanlar | 3–5 | Çok adımlı ilan formu, görsel yükleme, filtreli listeleme, detay sayfası; favoriler, benzer ilanlar, paylaşım görseli |
| 3. Etkileşim | 6–7 | Mesajlaşma (REST + WebSocket), ilan yorumları, şikayet; Hesabım paneli: profil, ilanlarım, mesajlar, favoriler |
| 4. Topluluk ve içerik | 8–9 | Kategorili soru sorma, cevaplar, en iyi cevap, benzer konular; blog ve haberler: liste, detay, Tiptap editörü |
| 5. Admin paneli | 10–11 | İlan onay kuyruğu; kullanıcı, içerik, kategori ve kurum başvurusu yönetimi; dashboard, raporlar, CSV, denetim kaydı |
| 6. Test ve yayın | 12 | Playwright akış testleri, SEO (sitemap, metadata), KVKK sayfaları; performans ve erişilebilirlik kontrolü, Vercel production |

**Sonraki sürümler:** v1.1 klinik dizini, barınak, mutlu sonlar, PWA, YZ ile ilan · v1.2 kayıp ilanı bildirimi, kayıtlı arama, harita görünümü · v2 mobil uygulama (Expo), başvuru, sözleşme

Her aşama sonunda çalışan bir sürüm preview ortamına çıkar; v1.1 ve sonrası Patipetra karşılaştırmasındaki ve genişletme önerilerindeki maddelerden oluşur.

**Alınan kararlar**

- Klinik rolünün yetkileri önerildiği gibi onaylandı.
- Barınaklar klinikle aynı yetkilere sahip ayrı bir rolle temsil edilir: `shelter` (arayüzde "Barınak").
- Telefon numarası varsayılan olarak gizlidir; ilan sahibi isterse gösterir.
- Her ilan yayın öncesi admin onayından geçer.
- Teknolojiler Kasım 2026 itibarıyla son sürümleriyle kullanılır.
- Kapsam dışı: favori karşılaştırma, uyum testi, dijital pet pasaportu.
- Proje mobil uygulamaya hazır kurulur: monorepo ve ayrı bir NestJS API (`/api/v1`); iş kuralları yalnızca API'de.
- Mesajlaşma MVP'de REST + polling ile yapılır (karar, 3. aşama): API Vercel Function olarak çalıştığı için kalıcı WebSocket bağlantısı tutulamaz. Açık konuşma birkaç saniyede bir yeni mesajları sorgular. Anlık iletim (Socket.IO ayrı sunucuda ya da yönetilen servis) ileride eklenebilir. Supabase Realtime kullanılmaz.
- Hesabım menüsünde henüz yapılmamış sayfalar (Sorularım, Kayıtlı aramalar) gizlenir; sayfa yapılınca menüye eklenir.
- Tüm monorepo TypeScript 6 ile derlenir.
- Pati Dostu tamamen bir sosyal sorumluluk projesidir; gelir modeli (öne çıkan ilan, premium, bağış) yoktur. Gerekirse sonraki bir aşamada eklenir.
- İlan formunda ayrı bir başlık alanı var; yaş dört grupla seçilir (Yavru 0–6 ay, Genç 6 ay–2 yaş, Yetişkin 2–7 yaş, Yaşlı 7+).
- Kayıp ve bulunan ilanlarında tarih otomatik oluşur; son görüldüğü/bulunduğu konum alanları eklenir.
- Barınaklar header menüsünde yer almaz, footer'da kalır.
- İletişim: iletisim@pati-dostu.com; sosyal medya: @pati\_dostu (uygunluğa göre değişebilir).
- İlan vermenin iki yolu var: YZ'siz form ve yapay zekâ ile (önce tek fotoğraf, API cevabından sonra form). Yapay zekâ ile ilan verme v1.1'de gelir; "Yapay zekâ hata yapabilir" uyarısı gösterilir, kullanıcı başına günlük 5 kullanım sınırı uygulanır.
- Yorumlar, topluluk konuları ve cevaplar admin onayı beklemez: otomatik içerik filtresinden (yasaklı kelimeler, telefon, e-posta, bağlantı, IBAN, fiyat ifadesi) geçen içerik hemen yayınlanır, takılan içerik gönderilemez ve kullanıcıya nedeni gösterilir.
- Düzenlenen ilan, değişiklik ne kadar küçük olursa olsun yeniden admin onayına gider.
- Klinik 48 saat içinde yanıtlamazsa randevu talebi "yanıtsız" olarak kapanır.
- Paylaşım görseli için 6 şablon var (Klasik, Polaroid, Afiş, Minimal, Turuncu, Karakter); kullanıcı seçer, kayıp/bulunan ilanlarında Afiş varsayılan gelir. Görselde telefon numarası yer almaz. Pencere ilan detayındaki "Paylaş"tan açılır ve herkes kullanabilir (3. aşamada "İlanlarım"dan da). Karakter şablonu ilanın mevcut özelliklerini (aşılı, kısır, mikroçipli, çocuk dostu) gösterir; ayrı karakter alanı yok. Görseller depolanmaz, istek anında üretilip önbelleğe alınır; ilan detayının Open Graph görseli de budur.
- İçerik filtresinde yalnızca "engelle" vardır; şüpheli içeriği admin'e düşüren bir seçenek yoktur.
- Kurum kampanyaları v1.1'de yayına alınır. MVP'de kodlanır ama `campaigns` özellik bayrağı kapalı kalır: Kurum paneli menüsündeki "Kampanyalar", klinik profilindeki kampanya kutusu ve randevu formundaki kampanya seçimi görünmez.
- E-posta servisi Resend (doğrulama, şifre sıfırlama, bildirim e-postaları).
- Geliştirmede veritabanı ve dosya depolama yerelde çalışır; yayına alırken Supabase'e, uygulamalar Vercel'e geçer. Bağlantı bilgileri yalnızca `.env` dosyalarındadır.
- Supabase yalnızca yönetilen PostgreSQL olarak kullanılır; Supabase Auth, Storage ve Realtime kullanılmaz. Geliştirmede bilgisayardaki yerel PostgreSQL 17 kullanılır, Supabase CLI gerekmez.
- Çevrilebilir sözlük adları (tür, ırk; ileride kategori) veritabanında `{ tr, en }` biçiminde jsonb tutulur; Türkçe zorunlu, çevirisi olmayan dilde Türkçe gösterilir. API `?locale=` ile tek dilde döndürür. İl/ilçe adları özel isimdir, çevrilmez.
- İlan taslakları sunucuda tutulur (`draft`): kullanıcı başka cihazdan devam eder ve "İlanlarım"da görür; taslakta yalnızca ilan türü zorunludur, diğer zorunlu alanlar "Onaya gönder"de denetlenir.
- İlanı onaya göndermek için en az 1 fotoğraf zorunludur (en fazla 5).
- Şifre değiştiğinde (sıfırlama veya değiştirme) kullanıcının tüm oturumları otomatik kapanır; "Yeni şifre belirle" ekranındaki "Diğer tüm cihazlardaki oturumlarımı kapat" onay kutusu kaldırıldı, yerine bunu bildiren bir not gösterilir.
- Site çok dilli kurulur (next-intl): varsayılan Türkçe, ikinci dil İngilizce. Yayına yalnızca Türkçe ile çıkılır; İngilizce kodda hazırdır ve `NEXT_PUBLIC_LOCALES` ile açılır. Türkçe adresler öneksiz (`/ilanlar`), İngilizce `/en` önekli ve çevrilmiş (`/en/listings`). Tarayıcı diline göre otomatik yönlendirme yapılmaz; dil, dil seçiciyle değişir. API hata kodu döndürür, metni istemci çevirir; e-postalar kullanıcının diline (`user.locale`) göre gönderilir. Kullanıcı içeriği (ilan, yorum, konu) çevrilmez.
- Geliştirme sırasında sayfalar demo içerikle doldurulur (`pnpm db:demo`): gerçek hayvan fotoğrafları (Wikimedia Commons, serbest lisanslı) ve hayali ilan/kullanıcılar. Demo içerik yayından önce `pnpm db:demo:clear` ile silinir; yayın veritabanına yazılmaz.
- Profil ve ayarlar (3. aşama): hesap silme anında kapatır ve anonimleştirir (ilanlar yayından kalkar; ad, e-posta, telefon, fotoğraf silinir; aynı e-postayla yeniden kayıt olunabilir). Bildirim tercihleri tablosu bildirimlerle birlikte gelir (şimdilik yalnızca bülten onayı). KVKK veri kopyası MVP sonunda, SMS ile telefon doğrulama sağlayıcı seçilince yapılır. "Hakkımda" metni ilan metniyle aynı içerik filtresi kurallarından geçer. "Yeni ilanlarda telefonumu varsayılan olarak göster" tercihi ilan formundaki "Telefonumu ilanda göster"in başlangıç değeridir.
- Sayfa kabı 1320 px'tir (`--container-site`, iç boşluk dahil; masaüstünde içerik 1272 px). Tasarım görselleri 1200 px içerikle çizildi; genişlikte görseller değil bu karar geçerlidir.
- Favoriler sayfası (`/hesabim/favoriler`) 2. aşamada yapılır; Hesabım sol menüsü 3. aşamada eklenir. Favorideki ilan sahiplendirilir ya da kapatılırsa listede "artık yayında değil" notuyla soluk ve bağlantısız kalır (kalple çıkarılabilir); silinen ilan listeden düşer. Onay bekleyen / düzeltme istenen / reddedilen ilan favorilerde gösterilmez (onaylanmamış içerik görünmesin); yeniden yayına girince geri gelir.
- Dosyalar (ilan fotoğrafları, avatar, blog kapakları) Cloudflare R2'de tutulur; S3 API'siyle erişildiği için sağlayıcı değiştirilebilir. Geliştirmede docker-compose'daki RustFS (S3 uyumlu) kullanılır.
