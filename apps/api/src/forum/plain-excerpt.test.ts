import { describe, expect, it } from "vitest"

import { plainExcerpt } from "./forum.service.js"

describe("plainExcerpt", () => {
  it("kalın ve italik işaretlerini atar", () => {
    expect(plainExcerpt("**Yaş mama** mı *denemeliyim*?")).toBe("Yaş mama mı denemeliyim?")
  })

  it("liste işaretlerini atar, satırları birleştirir", () => {
    expect(plainExcerpt("Sıra:\n- İç parazit\n- Karma aşı")).toBe("Sıra: İç parazit Karma aşı")
  })

  it("uzun metni kısaltır ve üç nokta ekler", () => {
    const out = plainExcerpt("a".repeat(300), 20)
    expect(out).toHaveLength(20)
    expect(out.endsWith("…")).toBe(true)
  })
})
