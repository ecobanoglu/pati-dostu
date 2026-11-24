import { describe, expect, it } from "vitest"

import { maskPhone } from "./listings.service.js"

describe("maskPhone", () => {
  it("ilk 4 ve son 2 haneyi gösterir", () => {
    expect(maskPhone("+905321234567")).toBe("0532 *** ** 67")
  })
  it("beklenmeyen biçimde numarayı tamamen gizler", () => {
    expect(maskPhone("12345")).toBe("*** *** ** **")
  })
})
