import { existsSync } from "node:fs"

import type { NextConfig } from "next"
import createNextIntlPlugin from "next-intl/plugin"

// Monorepo kökündeki .env (NEXT_PUBLIC_LOCALES, NEXT_PUBLIC_API_URL …); apps/web/.env.local varsa o da Next tarafından okunur.
if (existsSync("../../.env")) process.loadEnvFile("../../.env")

const nextConfig: NextConfig = {
  cacheComponents: true,
  typedRoutes: true,
}

const withNextIntl = createNextIntlPlugin("./i18n/request.ts")

export default withNextIntl(nextConfig)
