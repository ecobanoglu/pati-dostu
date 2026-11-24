import { defineConfig } from "vitest/config"

/** API birim testleri: src altındaki *.test.ts dosyaları (Nest'e bağımlı olmayan saf mantık). */
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
})
