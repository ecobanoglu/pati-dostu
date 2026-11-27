import { reportSchema } from "@pati-dostu/validators"
import { createZodDto } from "nestjs-zod"
import { z } from "zod"

export class ListingReportDto extends createZodDto(reportSchema("listing")) {}
export class CommentReportDto extends createZodDto(reportSchema("comment")) {}
export class UserReportDto extends createZodDto(reportSchema("user")) {}
export class TopicReportDto extends createZodDto(reportSchema("topic")) {}
export class ReplyReportDto extends createZodDto(reportSchema("reply")) {}
export class UserIdParamDto extends createZodDto(z.object({ id: z.string().min(1).max(64) })) {}

/** Şikâyet sonucu: aynı hedefe açık şikâyetiniz varsa yeni kayıt açılmaz (`alreadyReported: true`). */
export class ReportResultDto extends createZodDto(
  z.object({ alreadyReported: z.boolean() }).meta({ id: "ReportResult" })
) {}
