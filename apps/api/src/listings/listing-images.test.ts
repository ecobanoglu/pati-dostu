import { describe, expect, it } from "vitest"

import { sniffImageType } from "./listing-images.service.js"

const bytes = (...values: number[]) => new Uint8Array(values)
const ascii = (s: string) => [...s].map((c) => c.charCodeAt(0))

describe("sniffImageType", () => {
  it("JPEG, PNG ve WebP imzalarını tanır", () => {
    expect(sniffImageType(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("image/jpeg")
    expect(sniffImageType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a))).toBe("image/png")
    expect(sniffImageType(bytes(...ascii("RIFF"), 0, 0, 0, 0, ...ascii("WEBP")))).toBe("image/webp")
  })
  it("başka dosyaları reddeder (uzantı/beyan edilen türe güvenmez)", () => {
    expect(sniffImageType(bytes(...ascii("GIF89a")))).toBeNull()
    expect(sniffImageType(bytes(...ascii("%PDF-1.7")))).toBeNull()
    expect(sniffImageType(bytes(...ascii("<svg")))).toBeNull()
    expect(sniffImageType(bytes())).toBeNull()
  })
})
