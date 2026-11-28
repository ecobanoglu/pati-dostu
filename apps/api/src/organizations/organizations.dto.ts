import {
  adminApplicationsQuerySchema,
  applicationStatuses,
  organizationApplicationSchema,
  organizationTypes,
  rejectApplicationSchema,
} from "@pati-dostu/validators"
import { createZodDto } from "nestjs-zod"
import { z } from "zod"

export class OrganizationApplicationDto extends createZodDto(organizationApplicationSchema) {}
export class AdminApplicationsQueryDto extends createZodDto(adminApplicationsQuerySchema) {}
export class RejectApplicationDto extends createZodDto(rejectApplicationSchema) {}
export class ApplicationIdParamDto extends createZodDto(z.object({ id: z.uuid() })) {}

const hourSchema = z.object({ weekday: z.number().int(), opensAt: z.string(), closesAt: z.string() })

/** Başvurunun kendisi (kullanıcının "başvurum" yanıtı ve admin ayrıntısı ortak). */
const applicationSchema = z
  .object({
    id: z.uuid(),
    type: z.enum(organizationTypes),
    name: z.string(),
    registryNo: z.string(),
    contactName: z.string().nullable(),
    phone: z.string().nullable(),
    email: z.string().nullable(),
    cityId: z.uuid(),
    districtId: z.uuid().nullable(),
    city: z.string(),
    district: z.string().nullable(),
    address: z.string(),
    services: z.array(z.string()),
    is24h: z.boolean(),
    hours: z.array(hourSchema),
    status: z.enum(applicationStatuses),
    /** Son red gerekçesi (reddedilmişse; yeniden gönderilen başvuruda önceki gerekçe olarak kalır). */
    rejectionReason: z.string().nullable(),
    /** Son gönderim zamanı (yeniden gönderimde güncellenir). */
    submittedAt: z.iso.datetime(),
    reviewedAt: z.iso.datetime().nullable(),
  })
  .meta({ id: "OrganizationApplication" })
export type OrganizationApplication = z.infer<typeof applicationSchema>

const myApplicationSchema = z
  .object({ application: applicationSchema.nullable() })
  .meta({ id: "MyOrganizationApplication" })
export type MyApplication = z.infer<typeof myApplicationSchema>
export class MyApplicationDto extends createZodDto(myApplicationSchema) {}

const adminApplicationRowSchema = z
  .object({
    id: z.uuid(),
    type: z.enum(organizationTypes),
    name: z.string(),
    city: z.string(),
    district: z.string().nullable(),
    contactName: z.string().nullable(),
    applicant: z.object({ id: z.string(), name: z.string(), email: z.string() }),
    status: z.enum(applicationStatuses),
    submittedAt: z.iso.datetime(),
    reviewedAt: z.iso.datetime().nullable(),
    /** Daha önce reddedilip yeniden gönderilmiş (bekleyende). */
    resubmitted: z.boolean(),
  })
  .meta({ id: "AdminApplicationRow" })
export type AdminApplicationRow = z.infer<typeof adminApplicationRowSchema>

const adminApplicationPageSchema = z
  .object({
    items: z.array(adminApplicationRowSchema),
    total: z.number().int(),
    page: z.number().int(),
    pageSize: z.number().int(),
    counts: z.object({ pending: z.number().int(), approved: z.number().int(), rejected: z.number().int() }),
  })
  .meta({ id: "AdminApplicationPage" })
export type AdminApplicationPage = z.infer<typeof adminApplicationPageSchema>
export class AdminApplicationPageDto extends createZodDto(adminApplicationPageSchema) {}

const adminApplicationDetailSchema = applicationSchema
  .extend({
    applicant: z.object({
      id: z.string(),
      name: z.string(),
      email: z.string(),
      emailVerified: z.boolean(),
      role: z.string(),
      createdAt: z.iso.datetime(),
      /** Gönderilmiş (taslak değil) ilan sayısı. */
      listings: z.number().int(),
    }),
    reviewer: z.string().nullable(),
    resubmitted: z.boolean(),
  })
  .meta({ id: "AdminApplicationDetail" })
export type AdminApplicationDetail = z.infer<typeof adminApplicationDetailSchema>
export class AdminApplicationDetailDto extends createZodDto(adminApplicationDetailSchema) {}
