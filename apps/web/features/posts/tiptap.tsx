import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type Mark = { type: string; attrs?: Record<string, unknown> }
/** Tiptap JSON düğümü (yalnız kullandığımız alanlar). */
export type TiptapNode = {
  type: string
  text?: string
  marks?: Mark[]
  attrs?: Record<string, unknown>
  content?: TiptapNode[]
}

/** İçindekiler satırı: başlık metni ve sayfa içi kimliği. */
export type TocItem = { id: string; text: string; level: 2 | 3 }

/** Düğümün düz metni. */
function textOf(node: TiptapNode): string {
  if (node.type === "text") return node.text ?? ""
  return (node.content ?? []).map(textOf).join("")
}

/** Başlıktan sayfa içi kimlik ("Evi hazırlayın" → "evi-hazirlayin"); Türkçe harfler sadeleştirilir. */
function slugifyHeading(text: string): string {
  const map: Record<string, string> = { ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u" }
  const slug = text
    .toLocaleLowerCase("tr")
    .replace(/[çğıöşü]/g, (c) => map[c] ?? c)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  return slug || "bolum"
}

/** Belgenin kök düğümleri (bozuk veri gelirse boş). */
function blocks(doc: unknown): TiptapNode[] {
  const d = doc as TiptapNode | null
  return d && d.type === "doc" && Array.isArray(d.content) ? d.content : []
}

/**
 * Belgedeki H2/H3 başlıklarından içindekiler listesi. Kimlikler çizicideki ile aynı sırayla üretilir (aynı başlık
 * tekrar ederse `-2`, `-3`…).
 */
export function extractToc(doc: unknown): TocItem[] {
  const seen = new Map<string, number>()
  const out: TocItem[] = []
  for (const node of blocks(doc)) {
    if (node.type !== "heading") continue
    const text = textOf(node).trim()
    if (!text) continue
    const base = slugifyHeading(text)
    const n = (seen.get(base) ?? 0) + 1
    seen.set(base, n)
    out.push({ id: n > 1 ? `${base}-${n}` : base, text, level: node.attrs?.level === 3 ? 3 : 2 })
  }
  return out
}

/** Bağlantı adresi güvenli mi: yalnız http(s) ya da site içi ("/…"). `javascript:` vb. çizilmez. */
function safeHref(href: unknown): string | null {
  if (typeof href !== "string") return null
  if (href.startsWith("/") && !href.startsWith("//")) return href
  return /^https?:\/\//i.test(href) ? href : null
}

/** Metin düğümünü işaretleriyle (kalın, italik, bağlantı) çizer. */
function renderText(node: TiptapNode, key: number): ReactNode {
  let out: ReactNode = node.text ?? ""
  for (const mark of node.marks ?? []) {
    if (mark.type === "bold") out = <strong className="font-extrabold">{out}</strong>
    else if (mark.type === "italic") out = <em>{out}</em>
    else if (mark.type === "link") {
      const href = safeHref(mark.attrs?.href)
      if (!href) continue
      const external = !href.startsWith("/")
      out = (
        <a
          href={href}
          className="text-primary underline underline-offset-4 hover:no-underline"
          {...(external ? { target: "_blank", rel: "noopener noreferrer nofollow" } : {})}
        >
          {out}
        </a>
      )
    }
  }
  return <span key={key}>{out}</span>
}

/** Satır içi içerik (metin ve satır sonu). */
function renderInline(nodes: TiptapNode[] | undefined): ReactNode {
  return (nodes ?? []).map((n, i) =>
    n.type === "text" ? renderText(n, i) : n.type === "hardBreak" ? <br key={i} /> : null
  )
}

/**
 * Tiptap belgesini React düğümlerine çevirir (HTML basılmaz; bilinmeyen düğümler atlanır). İzinli düğümler: paragraf,
 * H2/H3 (içindekiler kimlikleriyle), madde / numaralı liste, alıntı, ayraç, vurgulu kutu (`callout`: "tip" mor zemin,
 * başlık ilk satırın başında; "info" çerçeveli, başlıklı). Bloglarda ilk paragraf giriş olarak büyük yazılır.
 */
export function TiptapContent({ doc, lead = false }: { doc: unknown; lead?: boolean }) {
  const toc = extractToc(doc)
  let headingIndex = 0

  /** Tek blok düğümü çizer (iç içe listeler ve kutular için kendini çağırır). */
  const block = (node: TiptapNode, key: number, isLead = false): ReactNode => {
    switch (node.type) {
      case "paragraph":
        return (
          <p key={key} className={isLead ? "text-xl leading-relaxed text-body" : undefined}>
            {renderInline(node.content)}
          </p>
        )
      case "heading": {
        if (!textOf(node).trim()) return null
        const item = toc[headingIndex++]
        const Tag = item?.level === 3 ? "h3" : "h2"
        return (
          <Tag
            key={key}
            id={item?.id}
            className={cn(
              "scroll-mt-24 font-extrabold text-heading",
              Tag === "h2" ? "mt-4 text-h4 lg:text-[28px]" : "mt-2 text-h5"
            )}
          >
            {renderInline(node.content)}
          </Tag>
        )
      }
      case "bulletList":
      case "orderedList": {
        const List = node.type === "bulletList" ? "ul" : "ol"
        return (
          <List key={key} className={cn("grid gap-2 pl-6", List === "ul" ? "list-disc" : "list-decimal")}>
            {(node.content ?? []).map((li, i) => (
              <li key={i} className="pl-1 [&>p]:inline">
                {(li.content ?? []).map((c, j) => block(c, j))}
              </li>
            ))}
          </List>
        )
      }
      case "blockquote":
        return (
          <blockquote key={key} className="grid gap-3 border-l-4 border-primary pl-4 text-body italic">
            {(node.content ?? []).map((c, i) => block(c, i))}
          </blockquote>
        )
      case "horizontalRule":
        return <hr key={key} className="border-border" />
      case "callout": {
        const title = typeof node.attrs?.title === "string" ? node.attrs.title : ""
        const children = node.content ?? []
        if (node.attrs?.tone === "info")
          return (
            <aside key={key} className="grid gap-3 rounded-card border-2 border-primary p-5 lg:px-6">
              {title && <p className="text-lg font-extrabold text-heading">{title}</p>}
              {children.map((c, i) => block(c, i))}
            </aside>
          )
        // "tip": başlık ilk paragrafın başında ("İpucu: …").
        const [first, ...rest] = children
        return (
          <aside key={key} className="grid gap-3 rounded-card bg-smoke p-5 lg:px-6">
            {first?.type === "paragraph" ? (
              <p>
                {title && <strong className="font-extrabold text-primary">{title}: </strong>}
                {renderInline(first.content)}
              </p>
            ) : (
              <>
                {title && <p className="font-extrabold text-primary">{title}</p>}
                {first && block(first, -1)}
              </>
            )}
            {rest.map((c, i) => block(c, i))}
          </aside>
        )
      }
      default:
        return null
    }
  }

  const nodes = blocks(doc)
  return (
    <div className="grid gap-5 text-[17px] leading-relaxed text-heading">
      {nodes.map((n, i) => block(n, i, lead && i === 0 && n.type === "paragraph"))}
    </div>
  )
}
