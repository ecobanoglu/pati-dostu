import nextVitals from "eslint-config-next/core-web-vitals"
import { defineConfig, globalIgnores } from "eslint/config"
import globals from "globals"

import base from "./base.js"

/**
 * apps/web için ESLint ayarı: ortak temel + Next.js Core Web Vitals kuralları.
 * nextVitals önce gelir: kendi ayrıştırıcısını tanımlar; base.js sonra gelince
 * typescript-eslint ayrıştırıcısı geçerli olur (tip bilgisi isteyen kurallar için gerekli).
 */
export default defineConfig(globalIgnores(["next-env.d.ts", ".next/", "out/"]), nextVitals, base, {
  languageOptions: {
    globals: { ...globals.browser },
  },
})
