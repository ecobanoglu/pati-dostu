import { mergeAttributes, Node } from "@tiptap/core"

/**
 * Vurgulu kutu düğümü ("İpucu"): içinde paragraf/liste olabilen blok. `tone` "tip" (mor zemin, başlık ilk satırın
 * başında) ya da "info" (çerçeveli); `title` kutunun başlığı. Herkese açık çizici (components/content/tiptap.tsx)
 * ve API temizleyicisi (validators › post-content) aynı adları kullanır. Editörde `aside[data-callout]` olarak çizilir;
 * başlık CSS ile (`data-title`) gösterilir.
 */
export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,

  /** Ton ve başlık öznitelikleri (HTML'de data-tone / data-title). */
  addAttributes() {
    return {
      tone: {
        default: "tip",
        parseHTML: (el) => el.getAttribute("data-tone") ?? "tip",
        renderHTML: (attrs) => ({ "data-tone": attrs.tone as string }),
      },
      title: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-title"),
        renderHTML: (attrs) => (attrs.title ? { "data-title": attrs.title as string } : {}),
      },
    }
  },

  /** Yapıştırılan HTML'de `aside[data-callout]` kutu olarak tanınır. */
  parseHTML() {
    return [{ tag: "aside[data-callout]" }]
  },

  /** Editördeki görünüm. */
  renderHTML({ HTMLAttributes }) {
    return ["aside", mergeAttributes(HTMLAttributes, { "data-callout": "" }), 0]
  },
})
