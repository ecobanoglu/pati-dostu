import {
  adminReportsQuerySchema,
  dismissReportSchema,
  reportCaseParamsSchema,
  reportTargets,
  resolveReportSchema,
} from "@pati-dostu/validators"
import { createZodDto } from "nestjs-zod"
import { z } from "zod"

export class AdminReportsQueryDto extends createZodDto(adminReportsQuerySchema) {}
export class ReportCaseParamsDto extends createZodDto(reportCaseParamsSchema) {}
export class ResolveReportDto extends createZodDto(resolveReportSchema) {}
export class DismissReportDto extends createZodDto(dismissReportSchema) {}

const target = z.enum(reportTargets)
const listingRef = z.object({
  no: z.number().int(),
  slug: z.string().nullable(),
  title: z.string(),
  status: z.string(),
})
const topicRef = z.object({ slug: z.string(), categorySlug: z.string(), title: z.string() })

const reportCaseRowSchema = z
  .object({
    targetType: target,
    targetId: z.string(),
    /** En sık neden. */
    reason: z.string(),
    reasons: z.array(z.string()),
    /** Bu hedefteki şikâyet sayısı (kişi başına en fazla bir açık şikâyet). */
    reports: z.number().int(),
    firstAt: z.iso.datetime(),
    lastAt: z.iso.datetime(),
    /** Sonuçlanmış dosyada sonuç; açıkta null. */
    outcome: z.enum(["action_taken", "no_violation"]).nullable(),
    title: z.string(),
    subjectName: z.string(),
    listingNo: z.number().int().nullable(),
  })
  .meta({ id: "ReportCaseRow" })

const reportCasePageSchema = z
  .object({
    items: z.array(reportCaseRowSchema),
    total: z.number().int(),
    page: z.number().int(),
    pageSize: z.number().int(),
    counts: z.object({
      open: z.number().int(),
      closed: z.number().int(),
      /** Seçili sekmedeki dosyaların hedef türüne göre sayısı. */
      byTarget: z.record(z.string(), z.number().int()),
    }),
  })
  .meta({ id: "ReportCasePage" })
export type ReportCasePage = z.infer<typeof reportCasePageSchema>
export class ReportCasePageDto extends createZodDto(reportCasePageSchema) {}

const reportCaseSchema = z
  .object({
    targetType: target,
    targetId: z.string(),
    open: z.boolean(),
    reason: z.string(),
    title: z.string(),
    body: z.string().nullable(),
    /** İçerik hâlâ yerinde mi (silinmiş / kapatılmış değil). */
    live: z.boolean(),
    listing: listingRef.nullable(),
    topic: topicRef.nullable(),
    reports: z.array(
      z.object({
        id: z.uuid(),
        reason: z.string(),
        details: z.string().nullable(),
        status: z.string(),
        resolutionNote: z.string().nullable(),
        createdAt: z.iso.datetime(),
        reporter: z.object({ id: z.string(), name: z.string() }),
      })
    ),
    subject: z
      .object({
        id: z.string(),
        name: z.string(),
        email: z.string(),
        role: z.enum(["user", "clinic", "shelter", "admin"]),
        createdAt: z.iso.datetime(),
        deleted: z.boolean(),
        banned: z.boolean(),
        banExpires: z.iso.datetime().nullable(),
        listings: z.number().int(),
        pendingListings: z.array(z.object({ id: z.uuid(), no: z.number().int(), title: z.string() })),
        previousReports: z.number().int(),
        warnings: z.number().int(),
      })
      .nullable(),
  })
  .meta({ id: "ReportCase" })
export type ReportCase = z.infer<typeof reportCaseSchema>
export class ReportCaseDto extends createZodDto(reportCaseSchema) {}
