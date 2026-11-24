import base from "@pati-dostu/eslint-config/base"
import { defineConfig } from "eslint/config"

export default defineConfig(base, {
  languageOptions: {
    parserOptions: {
      // Tip bilgisi: consistent-type-imports, emitDecoratorMetadata açıkken
      // DI için gereken import'ları "import type"a çevirmesin diye gerekli.
      projectService: { allowDefaultProject: ["eslint.config.js", "vitest.config.ts"] },
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
