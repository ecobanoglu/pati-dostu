import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

import * as schema from "./schema/index.js"

export type CreateDbOptions = {
  /** Havuzdaki en fazla bağlantı. Vercel Function'da küçük tutulur. */
  max?: number
}

/**
 * Drizzle istemcisi. Supabase "Transaction pooler" (PgBouncer) hazır ifadeleri desteklemediği için
 * `prepare: false`; yerel Postgres'te de aynı ayarla çalışır.
 */
export function createDb(url: string, options: CreateDbOptions = {}) {
  const client = postgres(url, { prepare: false, max: options.max ?? 10 })
  const db = drizzle({ client, schema, casing: "snake_case" })
  return Object.assign(db, { close: () => client.end() })
}

export type Database = ReturnType<typeof createDb>
