# Pati Dostu

Sahiplendirme, geçici yuva, kayıp ve bulunan hayvan ilanları; topluluk soru-cevabı, blog ve veteriner/barınak dizini.
Tamamen sosyal sorumluluk amaçlı bir platform — [pati-dostu.com](https://pati-dostu.com).

| Klasör                   | İçerik                                            |
| ------------------------ | ------------------------------------------------- |
| `apps/web`               | Next.js 16 web uygulaması — http://localhost:3000 |
| `apps/api`               | NestJS 12 API (`/api/v1`) — http://localhost:4000 |
| `packages/tsconfig`      | Ortak TypeScript ayarları                         |
| `packages/eslint-config` | Ortak ESLint ayarları                             |
| `packages/db`            | Drizzle şeması, migration'lar, seed               |
| `docs/proje-taslagi.md`  | Ürün ve teknik taslak, alınan kararlar            |
| `docs/tasarim/`          | Ekran tasarımları                                 |

## İlk kurulum

### Gerekenler

- **Node.js 24** (`.nvmrc`) ve **pnpm 12** — `corepack enable` ile `package.json`'daki pnpm sürümü kullanılır.
- **PostgreSQL 17** — bilgisayarınızda kurulu ve çalışır durumda.
- **Docker Desktop** — Redis, e-posta yakalayıcı ve dosya depolama için.

### Adımlar

1. **Bağımlılıklar**

   ```powershell
   pnpm install
   ```

2. **Ortam değişkenleri**

   ```powershell
   Copy-Item .env.example .env
   ```

   `.env` içinde `DATABASE_URL` ve `DIRECT_URL` satırlarındaki `SIFRE` yerine Postgres şifrenizi yazın.

3. **Veritabanı** — boş bir `patidostu` veritabanı oluşturun:

   ```powershell
   & "C:\Program Files\PostgreSQL\17\bin\createdb.exe" -U postgres patidostu
   ```

   Tabloları oluşturup başlangıç verisini (81 il, 973 ilçe, tür/ırk, içerik filtreleri) yükleyin:

   ```powershell
   pnpm db:migrate
   pnpm db:seed
   ```

4. **Yerel servisler**

   ```powershell
   docker compose up -d
   docker compose ps
   ```

   | Servis                 | Adres                                                                                           |
   | ---------------------- | ----------------------------------------------------------------------------------------------- |
   | Redis                  | `localhost:6379`                                                                                |
   | Upstash REST taklidi   | http://localhost:8079 (token: `dev-token`)                                                      |
   | Mailpit (e-postalar)   | http://localhost:8025                                                                           |
   | RustFS (S3, R2 yerine) | API http://localhost:9000 · konsol http://localhost:9001 (`patidostu` / `patidostu-dev-secret`) |

   `pati-dostu` bucket'ı `storage-init` servisiyle otomatik oluşturulur.

5. **Uygulamaları başlat**

   ```powershell
   pnpm dev
   ```

   - Web: http://localhost:3000
   - API sağlık kontrolü: http://localhost:4000/api/v1/health
   - API dokümanı (Swagger): http://localhost:4000/api/v1/docs

## Sık kullanılan komutlar

| Komut                 | Ne yapar                                  |
| --------------------- | ----------------------------------------- |
| `pnpm dev`            | Web ve API'yi izleme modunda başlatır     |
| `pnpm typecheck`      | Tüm paketlerde tip kontrolü               |
| `pnpm lint`           | ESLint                                    |
| `pnpm build`          | Üretim derlemesi                          |
| `pnpm format`         | Prettier ile biçimlendirir                |
| `pnpm db:generate`    | Şema değişikliğinden migration üretir     |
| `pnpm db:migrate`     | Bekleyen migration'ları uygular           |
| `pnpm db:seed`        | Başlangıç verisini yükler (tekrar çalışır) |
| `pnpm db:studio`      | Drizzle Studio ile veritabanını açar      |
| `docker compose down` | Yerel servisleri durdurur (veriler kalır) |

Servislerin verilerini de silmek için `docker compose down` komutuna `-v` ekleyin.

## Sorun giderme

- **`EADDRINUSE :::3000`** — 3000 portunu başka bir uygulama kullanıyor. Onu kapatın ya da
  `pnpm --filter @pati-dostu/web exec next dev --port 3001` ile başka portta başlatın.
- **`password authentication failed for user "postgres"`** — `.env` içindeki şifre, Postgres kurulumunda
  belirlediğiniz şifreyle aynı değil.
