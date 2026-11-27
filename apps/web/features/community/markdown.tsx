import { Fragment, type ReactNode } from "react"

import { cn } from "@/lib/utils"

/**
 * Satır içi biçim: **kalın** ve *italik*. Metin React düğümlerine çevrilir (HTML olarak basılmaz — XSS olmaz);
 * eşleşmeyen yıldızlar olduğu gibi kalır.
 */
function inline(text: string, keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = []
  const re = /\*\*(.+?)\*\*|\*(?!\s)(.+?)(?<!\s)\*/g
  let last = 0
  let m: RegExpExecArray | null
  let i = 0
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index))
    if (m[1] !== undefined) out.push(<strong key={`${keyPrefix}-${i++}`}>{m[1]}</strong>)
    else out.push(<em key={`${keyPrefix}-${i++}`}>{m[2]}</em>)
    last = m.index + m[0].length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

/**
 * Toplulukta kullanılan sınırlı Markdown'u çizer (karar: kalın, italik, liste; bağlantı yok): boş satırla ayrılan
 * paragraflar, "- " ile başlayan satırlar madde listesi, paragraf içindeki tek satır sonları korunur.
 */
export function Markdown({ text, className }: { text: string; className?: string }) {
  const blocks: ReactNode[] = []
  const lines = text.replace(/\r\n/g, "\n").split("\n")
  let para: string[] = []
  let list: string[] = []

  /** Biriken paragrafı ekler. */
  const flushPara = () => {
    if (para.length === 0) return
    const k = `p${blocks.length}`
    blocks.push(
      <p key={k}>
        {para.map((line, j) => (
          <Fragment key={j}>
            {j > 0 && <br />}
            {inline(line, `${k}-${j}`)}
          </Fragment>
        ))}
      </p>
    )
    para = []
  }
  /** Biriken listeyi ekler. */
  const flushList = () => {
    if (list.length === 0) return
    const k = `l${blocks.length}`
    blocks.push(
      <ul key={k} className="list-disc pl-6">
        {list.map((item, j) => (
          <li key={j}>{inline(item, `${k}-${j}`)}</li>
        ))}
      </ul>
    )
    list = []
  }

  for (const raw of lines) {
    const line = raw.trimEnd()
    const item = /^\s*[-•]\s+(.*)$/.exec(line)
    if (item) {
      flushPara()
      list.push(item[1]!)
    } else if (line.trim() === "") {
      flushPara()
      flushList()
    } else {
      flushList()
      para.push(line)
    }
  }
  flushPara()
  flushList()
  return <div className={cn("grid gap-3 break-words", className)}>{blocks}</div>
}
