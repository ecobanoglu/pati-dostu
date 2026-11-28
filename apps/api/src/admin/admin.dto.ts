import { createZodDto } from "nestjs-zod"
import { z } from "zod"

const adminCountsSchema = z
  .object({
    /** Onay bekleyen ilan. */
    pendingListings: z.number().int(),
    /** Değerlendirilmemiş kurum başvurusu. */
    pendingApplications: z.number().int(),
    /** Açık şikâyet. */
    openReports: z.number().int(),
  })
  .meta({ id: "AdminCounts" })
export type AdminCounts = z.infer<typeof adminCountsSchema>
export class AdminCountsDto extends createZodDto(adminCountsSchema) {}
