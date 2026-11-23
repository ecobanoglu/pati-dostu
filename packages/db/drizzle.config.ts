import { existsSync } from "node:fs"

import { defineConfig } from "drizzle-kit"

// Komutlar packages/db içinden çalışır; kökteki .env'i yükle.
if (existsSync("../../.env")) process.loadEnvFile("../../.env")

// Migration doğrudan bağlantıyla çalışır (Supabase'te pooler değil). Yerelde ikisi aynıdır.
const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL
if (!url) throw new Error("DIRECT_URL veya DATABASE_URL tanımlı değil (.env)")

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema/index.ts",
  out: "./drizzle",
  casing: "snake_case",
  dbCredentials: { url },
  strict: true,
  verbose: true,
})
