/**
 * Blog / haber içeriği (Tiptap JSON) için ortak kurallar: izinli düğümler, temizleme, kelime sayısı ve okuma süresi.
 * API kaydetmeden önce `sanitizePostContent` ile belgeyi temizler; web editörü aynı kelime sayısını gösterir, herkese
 * açık çizici (web › components/content/tiptap.tsx) yalnız bu düğümleri tanır.
 */

/** Tiptap düğümü (yalnız kullandığımız alanlar). */
export type PostNode = {
  type: string
  text?: string
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>
  attrs?: Record<string, unknown>
  content?: PostNode[]
}

/** Vurgulu kutu tonları: "tip" (İpucu, mor zemin) ve "info" (başlıklı, çerçeveli). */
export const calloutTones = ["tip", "info"] as const

/** Kaydedilen içeriğin JSON boyutu sınırı (bayt yaklaşık; karakter sayısı). */
export const POST_CONTENT_MAX = 200_000

/** Okuma hızı: dakikada ~200 kelime (demo içerikle aynı). */
const WORDS_PER_MINUTE = 200

/** Bağlantı adresi güvenli mi: yalnız http(s) ya da site içi ("/…", "//" değil). `javascript:` vb. reddedilir. */
export function isSafeHref(href: unknown): href is string {
  if (typeof href !== "string" || href.length > 2000) return false
  if (href.startsWith("/")) return !href.startsWith("//")
  return /^https?:\/\/[^\s]+$/i.test(href)
}

/** Belgenin düz metni (bloklar arasında boşluk). */
export function postPlainText(node: PostNode | null | undefined): string {
  if (!node) return ""
  if (node.type === "text") return node.text ?? ""
  return (node.content ?? []).map(postPlainText).join(" ")
}

/** Kelime sayısı (editörün alt satırı ve okuma süresi için). */
export function postWordCount(doc: unknown): number {
  return postPlainText(doc as PostNode)
    .split(/\s+/)
    .filter(Boolean).length
}

/** Okuma süresi (dakika, en az 1). */
export function readingMinutes(words: number): number {
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE))
}

export type SanitizeResult = { ok: true; doc: PostNode } | { ok: false; code: "CONTENT_INVALID" | "LINK_INVALID" }

/** Bloğun içine girebilecek düğümler (iç içe liste, alıntı ve kutu dahil). */
const BLOCKS = new Set([
  "paragraph",
  "heading",
  "bulletList",
  "orderedList",
  "blockquote",
  "horizontalRule",
  "callout",
  "image",
])

/** Temizleme sırasında kural ihlali (sonuç koduyla). */
class Invalid extends Error {
  constructor(readonly code: "CONTENT_INVALID" | "LINK_INVALID") {
    super(code)
  }
}

/** Kısa metin özniteliği (boşsa null). */
function shortText(value: unknown, max: number): string | null {
  if (value == null || value === "") return null
  if (typeof value !== "string" || value.length > max) throw new Invalid("CONTENT_INVALID")
  return value
}

/** Satır içi düğümler: metin (kalın, italik, bağlantı) ve satır sonu. Bilinmeyen işaretler atılır. */
function inline(nodes: unknown): PostNode[] {
  if (nodes == null) return []
  if (!Array.isArray(nodes)) throw new Invalid("CONTENT_INVALID")
  return nodes.map((raw) => {
    const n = raw as PostNode
    if (n?.type === "hardBreak") return { type: "hardBreak" }
    if (n?.type !== "text" || typeof n.text !== "string" || n.text.length === 0) throw new Invalid("CONTENT_INVALID")
    const marks: NonNullable<PostNode["marks"]> = []
    for (const m of n.marks ?? []) {
      if (m?.type === "bold" || m?.type === "italic") marks.push({ type: m.type })
      else if (m?.type === "link") {
        if (!isSafeHref(m.attrs?.href)) throw new Invalid("LINK_INVALID")
        marks.push({ type: "link", attrs: { href: m.attrs.href } })
      }
    }
    return marks.length > 0 ? { type: "text", text: n.text, marks } : { type: "text", text: n.text }
  })
}

/** Blok düğümü temizler (özniteliklerden yalnız izinli olanlar kalır). */
function block(raw: unknown, depth: number): PostNode {
  const n = raw as PostNode
  if (!n || typeof n.type !== "string" || !BLOCKS.has(n.type) || depth > 12) throw new Invalid("CONTENT_INVALID")
  const children = (allowed: (c: PostNode) => boolean): PostNode[] => {
    if (!Array.isArray(n.content) || n.content.length === 0) throw new Invalid("CONTENT_INVALID")
    return n.content.map((c) => {
      if (!allowed(c as PostNode)) throw new Invalid("CONTENT_INVALID")
      return block(c, depth + 1)
    })
  }
  const isBlock = (c: PostNode) => BLOCKS.has(c?.type)
  switch (n.type) {
    case "paragraph": {
      const content = inline(n.content)
      return content.length > 0 ? { type: "paragraph", content } : { type: "paragraph" }
    }
    case "heading": {
      const level = n.attrs?.level
      if (level !== 2 && level !== 3) throw new Invalid("CONTENT_INVALID")
      const content = inline(n.content)
      return { type: "heading", attrs: { level }, ...(content.length > 0 ? { content } : {}) }
    }
    case "bulletList":
    case "orderedList": {
      if (!Array.isArray(n.content) || n.content.length === 0) throw new Invalid("CONTENT_INVALID")
      const items = n.content.map((li) => {
        const item = li as PostNode
        if (item?.type !== "listItem" || !Array.isArray(item.content) || item.content.length === 0)
          throw new Invalid("CONTENT_INVALID")
        return { type: "listItem", content: item.content.map((c) => block(c, depth + 1)) }
      })
      const start = n.attrs?.start
      return n.type === "orderedList" && typeof start === "number" && Number.isInteger(start) && start > 1
        ? { type: "orderedList", attrs: { start }, content: items }
        : { type: n.type, content: items }
    }
    case "blockquote":
      return { type: "blockquote", content: children(isBlock) }
    case "horizontalRule":
      return { type: "horizontalRule" }
    case "callout": {
      const tone = (calloutTones as readonly unknown[]).includes(n.attrs?.tone) ? n.attrs!.tone : "tip"
      const title = shortText(n.attrs?.title, 80)
      return { type: "callout", attrs: { tone, ...(title ? { title } : {}) }, content: children(isBlock) }
    }
    case "image": {
      const src = shortText(n.attrs?.src, 500)
      if (!src) throw new Invalid("CONTENT_INVALID")
      return { type: "image", attrs: { src, alt: shortText(n.attrs?.alt, 200) ?? "" } }
    }
    default:
      throw new Invalid("CONTENT_INVALID")
  }
}

/**
 * Tiptap belgesini temizler: yalnız izinli düğüm, işaret ve öznitelikler kalır; bilinmeyen düğüm ya da güvensiz
 * bağlantı (yalnız http(s) ve site içi) hata döndürür. Görsel adreslerinin depoya ait olduğunu API ayrıca denetler.
 */
export function sanitizePostContent(doc: unknown): SanitizeResult {
  try {
    const d = doc as PostNode
    if (!d || d.type !== "doc") throw new Invalid("CONTENT_INVALID")
    const content = (Array.isArray(d.content) ? d.content : []).map((c) => block(c, 0))
    return { ok: true, doc: { type: "doc", content: content.length > 0 ? content : [{ type: "paragraph" }] } }
  } catch (e) {
    if (e instanceof Invalid) return { ok: false, code: e.code }
    throw e
  }
}

/** Belgedeki görsel düğümlerinin adreslerini dönüştürür (depo anahtarı ↔ herkese açık adres). Yeni belge döner. */
export function mapPostImages(doc: PostNode, fn: (src: string) => string): PostNode {
  const walk = (n: PostNode): PostNode => {
    if (n.type === "image" && typeof n.attrs?.src === "string")
      return { ...n, attrs: { ...n.attrs, src: fn(n.attrs.src) } }
    return n.content ? { ...n, content: n.content.map(walk) } : n
  }
  return walk(doc)
}

const TURKISH_ASCII: Record<string, string> = { ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u" }

/**
 * Başlıktan adres parçası: "İlk kez kedi sahiplenecekler…" → "ilk-kez-kedi-sahiplenecekler…" (Türkçe harfler
 * sadeleşir; packages/db › slugify ile aynı kural), en fazla `max` karakter, kelime ortasında kesilmez.
 */
export function slugifyTitle(input: string, max = 80): string {
  const slug = input
    .toLocaleLowerCase("tr-TR")
    .replace(/[çğıöşü]/g, (ch) => TURKISH_ASCII[ch] ?? ch)
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  if (slug.length <= max) return slug
  const cut = slug.slice(0, max + 1)
  const at = cut.lastIndexOf("-")
  return (at > 20 ? cut.slice(0, at) : slug.slice(0, max)).replace(/-+$/g, "")
}
