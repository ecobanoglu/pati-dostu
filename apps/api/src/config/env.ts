import { existsSync } from "node:fs"

import { z } from "zod"

// Yerelde kökteki .env yüklenir; Vercel'de değişkenler platformdan gelir.
for (const path of ["../../.env", ".env"]) {
  if (existsSync(path)) {
    process.loadEnvFile(path)
    break
  }
}

const optional = z
  .string()
  .optional()
  .transform((v) => (v === "" ? undefined : v))

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().default(4000),
  WEB_URL: z.url().default("http://localhost:3000"),

  DATABASE_URL: z.string().min(1, "DATABASE_URL tanımlı değil"),

  BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET en az 32 karakter olmalı"),
  BETTER_AUTH_URL: z.url().default("http://localhost:4000"),
  /** Yayında web ve API alt alan adlarında: ".pati-dostu.com" gibi; yerelde boş. */
  COOKIE_DOMAIN: optional,
  GOOGLE_CLIENT_ID: optional,
  GOOGLE_CLIENT_SECRET: optional,

  RESEND_API_KEY: optional,
  EMAIL_FROM: z.string().default("Pati Dostu <iletisim@pati-dostu.com>"),
  SMTP_HOST: optional,
  SMTP_PORT: z.coerce.number().int().default(1025),
})

export type Env = z.infer<typeof envSchema>

/** process.env'i şemaya göre doğrular; eksik veya hatalı değişkenleri tek bir okunaklı hata mesajında toplar. */
function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env)
  if (!parsed.success) {
    const lines = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`)
    throw new Error(`Ortam değişkenleri geçersiz (.env):\n${lines.join("\n")}`)
  }
  return parsed.data
}

export const env = loadEnv()
