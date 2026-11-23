import js from "@eslint/js"
import { defineConfig, globalIgnores } from "eslint/config"
import prettier from "eslint-config-prettier/flat"
import globals from "globals"
import tseslint from "typescript-eslint"

/**
 * Tüm paketlerin ortak ESLint ayarı (flat config).
 * Biçimlendirme Prettier'in işidir; çakışan kurallar en sonda kapatılır.
 *
 * Kullanım (eslint.config.js):
 *   import base from "@pati-dostu/eslint-config/base"
 *   export default [...base]
 */
export default defineConfig(
  globalIgnores(["**/node_modules/", "**/dist/", "**/.next/", "**/.turbo/", "**/coverage/"]),
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": ["error", { fixStyle: "inline-type-imports" }],
    },
  },
  prettier
)
