import { z } from "zod"

/** Paylaşım görseli şablonları (packages/db › shareTemplateEnum ile aynı adlar). */
export const SHARE_TEMPLATES = ["classic", "polaroid", "poster", "minimal", "orange", "character"] as const
export type ShareTemplate = (typeof SHARE_TEMPLATES)[number]

/** post: Instagram gönderisi 1080×1080 · story: hikâye / WhatsApp durumu 1080×1920. */
export const SHARE_FORMATS = { post: { width: 1080, height: 1080 }, story: { width: 1080, height: 1920 } } as const
export type ShareFormat = keyof typeof SHARE_FORMATS

/** Görsel adresinin sorgu parametreleri (t: şablon, f: boyut, o: özellik çipleri, l: dil). */
export const shareImageQuerySchema = z.object({
  t: z.enum(SHARE_TEMPLATES).default("classic"),
  f: z.enum(["post", "story"]).default("post"),
  o: z
    .enum(["0", "1"])
    .default("0")
    .transform((v) => v === "1"),
  l: z.enum(["tr", "en"]).default("tr"),
})

/** Kayıp ve bulunan ilanlarında "Afiş", diğerlerinde "Klasik" varsayılan gelir (taslak › Alınan kararlar). */
export function defaultTemplate(type: string): ShareTemplate {
  return type === "lost" || type === "found" ? "poster" : "classic"
}

/**
 * Paylaşım görselinin adresi: /api/og/listing/{no}?t=…&f=…&o=…&l=…
 * Görsel istek anında üretilir ve önbelleğe alınır (depoya yazılmaz).
 */
export function shareImagePath(
  listingNo: number,
  opts: { template: ShareTemplate; format: ShareFormat; features?: boolean; locale: string }
): string {
  const q = new URLSearchParams({ t: opts.template, f: opts.format, o: opts.features ? "1" : "0", l: opts.locale })
  return `/api/og/listing/${listingNo}?${q}`
}
