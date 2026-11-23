import { z } from "zod"

/** Desteklenen diller (apps/web/i18n/routing.ts ve packages/db › locales ile aynı). */
export const localeSchema = z.enum(["tr", "en"])
export type Locale = z.infer<typeof localeSchema>

/** Dile göre içerik döndüren GET uçlarının sorgu parametresi: ?locale=en (varsayılan tr). */
export const localeQuerySchema = z.object({
  locale: localeSchema.default("tr"),
})

/** Yol parametresi olarak uuid: /species/{id}/breeds. */
export const uuidParamSchema = z.object({
  id: z.uuid(),
})
