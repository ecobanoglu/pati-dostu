import {
  isSafeHref,
  mapPostImages,
  type PostNode,
  postWordCount,
  sanitizePostContent,
  slugifyTitle,
} from "@pati-dostu/validators"
import { describe, expect, it } from "vitest"

const p = (text: string, marks?: unknown[]) => ({ type: "paragraph", content: [{ type: "text", text, marks }] })

describe("sanitizePostContent", () => {
  it("izinli düğümleri tutar, fazla öznitelikleri atar", () => {
    const r = sanitizePostContent({
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 2, id: "x", textAlign: "left" },
          content: [{ type: "text", text: "Başlık" }],
        },
        p("Bağlantı", [{ type: "link", attrs: { href: "https://example.com", target: "_blank" } }, { type: "strike" }]),
        { type: "callout", attrs: { tone: "tip", title: "İpucu" }, content: [p("Kutu")] },
      ],
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.doc.content?.[0]).toEqual({
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Başlık" }],
    })
    expect(r.doc.content?.[1]?.content?.[0]?.marks).toEqual([{ type: "link", attrs: { href: "https://example.com" } }])
  })

  it("güvensiz bağlantıyı reddeder", () => {
    const r = sanitizePostContent({
      type: "doc",
      content: [p("x", [{ type: "link", attrs: { href: "javascript:alert(1)" } }])],
    })
    expect(r).toEqual({ ok: false, code: "LINK_INVALID" })
  })

  it("bilinmeyen düğümü ve H1'i reddeder", () => {
    expect(sanitizePostContent({ type: "doc", content: [{ type: "codeBlock" }] }).ok).toBe(false)
    expect(
      sanitizePostContent({ type: "doc", content: [{ type: "heading", attrs: { level: 1 }, content: [] }] }).ok
    ).toBe(false)
  })

  it("boş belgeye boş paragraf koyar", () => {
    expect(sanitizePostContent({ type: "doc" })).toEqual({
      ok: true,
      doc: { type: "doc", content: [{ type: "paragraph" }] },
    })
  })
})

describe("yardımcılar", () => {
  it("isSafeHref: http(s) ve site içi", () => {
    expect(isSafeHref("/ilanlar")).toBe(true)
    expect(isSafeHref("https://a.com/b")).toBe(true)
    expect(isSafeHref("//evil.com")).toBe(false)
    expect(isSafeHref("mailto:a@b.c")).toBe(false)
  })

  it("slugifyTitle: Türkçe harfler, uzunluk sınırı kelimede", () => {
    expect(slugifyTitle("İlk kez kedi sahiplenecekler için hazırlık listesi")).toBe(
      "ilk-kez-kedi-sahiplenecekler-icin-hazirlik-listesi"
    )
    const long = slugifyTitle("kelime ".repeat(30), 40)
    expect(long.length).toBeLessThanOrEqual(40)
    expect(long.endsWith("-")).toBe(false)
  })

  it("kelime sayısı ve görsel adres dönüşümü", () => {
    const doc = {
      type: "doc",
      content: [p("bir iki üç"), { type: "image", attrs: { src: "posts/media/a.jpg", alt: "" } }],
    }
    expect(postWordCount(doc)).toBe(3)
    const mapped = mapPostImages(doc as PostNode, (s) => `https://cdn/${s}`)
    expect(mapped.content?.[1]?.attrs?.src).toBe("https://cdn/posts/media/a.jpg")
  })
})
