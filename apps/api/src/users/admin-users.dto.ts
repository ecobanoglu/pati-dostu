import {
  adminUsersQuerySchema,
  banUserSchema,
  setUserRoleSchema,
  userRoles,
  warnUserSchema,
} from "@pati-dostu/validators"
import { createZodDto } from "nestjs-zod"
import { z } from "zod"

export class AdminUsersQueryDto extends createZodDto(adminUsersQuerySchema) {}
export class SetUserRoleDto extends createZodDto(setUserRoleSchema) {}
export class BanUserDto extends createZodDto(banUserSchema) {}
export class WarnUserDto extends createZodDto(warnUserSchema) {}
export class UserIdParamDto extends createZodDto(z.object({ id: z.string().min(1).max(100) })) {}

const adminUserRowSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    image: z.string().nullable(),
    role: z.enum(userRoles),
    city: z.string().nullable(),
    createdAt: z.iso.datetime(),
    /** Hesabını kapatmış (anonimleştirilmiş). */
    deleted: z.boolean(),
    /** Askı şu an geçerli mi. */
    banned: z.boolean(),
    /** Süreli askının bitişi (kalıcıda ve askıda değilse null). */
    banExpires: z.iso.datetime().nullable(),
    /** Gönderilmiş ilan sayısı (taslaklar hariç). */
    listings: z.number().int(),
    /** Kullanıcı ya da içerikleri hakkındaki şikâyet sayısı. */
    reports: z.number().int(),
  })
  .meta({ id: "AdminUserRow" })
export type AdminUserRow = z.infer<typeof adminUserRowSchema>

const adminUserPageSchema = z
  .object({
    items: z.array(adminUserRowSchema),
    total: z.number().int(),
    page: z.number().int(),
    pageSize: z.number().int(),
  })
  .meta({ id: "AdminUserPage" })
export type AdminUserPage = z.infer<typeof adminUserPageSchema>
export class AdminUserPageDto extends createZodDto(adminUserPageSchema) {}

const adminUserDetailSchema = adminUserRowSchema
  .extend({
    emailVerified: z.boolean(),
    phone: z.string().nullable(),
    bio: z.string().nullable(),
    /** Askının iç gerekçesi (yalnız admin). */
    banReason: z.string().nullable(),
    lastSeenAt: z.iso.datetime().nullable(),
    listingsByStatus: z.record(z.string(), z.number().int()),
    recentListings: z.array(
      z.object({
        id: z.uuid(),
        no: z.number().int(),
        title: z.string(),
        slug: z.string().nullable(),
        status: z.string(),
      })
    ),
    warnings: z.array(z.object({ reason: z.string(), title: z.string(), createdAt: z.iso.datetime() })),
    /** Yaptırım ve rol geçmişi (denetim kaydından, en yeni önce). */
    history: z.array(
      z.object({
        action: z.string(),
        detail: z.record(z.string(), z.unknown()),
        actorName: z.string(),
        createdAt: z.iso.datetime(),
      })
    ),
    organization: z.object({ name: z.string(), type: z.string(), status: z.string() }).nullable(),
  })
  .meta({ id: "AdminUserDetail" })
export type AdminUserDetail = z.infer<typeof adminUserDetailSchema>
export class AdminUserDetailDto extends createZodDto(adminUserDetailSchema) {}
