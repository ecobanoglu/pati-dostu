import { z } from "zod"

import { banDurations, reportReasons } from "./reports.js"

/** Admin › Kullanıcılar sayfa boyutu. */
export const ADMIN_USERS_PAGE_SIZE = 20

/** Hesap durumu süzgeci: etkin, askıda, silinmiş (hesabını kapatan, anonimleştirilmiş). */
export const adminUserStatuses = ["active", "banned", "deleted"] as const
export type AdminUserStatus = (typeof adminUserStatuses)[number]

/** Rol süzgeci (arayüzde Üye / Klinik / Barınak / Admin). */
export const userRoles = ["user", "clinic", "shelter", "admin"] as const
export type UserRole = (typeof userRoles)[number]

/** GET /admin/users ve CSV: arama (ad, e-posta, telefon), rol, durum, sayfa. */
export const adminUsersQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  role: z.enum(userRoles).optional(),
  status: z.enum(adminUserStatuses).optional(),
  page: z.coerce.number().int().min(1).max(1000).default(1),
})
export type AdminUsersQuery = z.infer<typeof adminUsersQuerySchema>

/** PATCH /admin/users/{id}/role: yalnız Üye ↔ Admin (karar; klinik / barınak rolü kurum başvurusuyla gelir). */
export const setUserRoleSchema = z.object({ role: z.enum(["user", "admin"]) })

/** POST /admin/users/{id}/ban: süre ve iç gerekçe (kayıtta kalır). */
export const banUserSchema = z.object({
  duration: z.enum(banDurations),
  reason: z.string().trim().max(500).optional(),
})

/** Kullanıcıya uyarıda seçilebilen nedenler (şikâyet nedenleriyle aynı adlar). */
export const warnReasons = [...new Set(Object.values(reportReasons).flat())] as [string, ...string[]]

/** POST /admin/users/{id}/warn: neden (hazır metinle birlikte gider). */
export const warnUserSchema = z.object({ reason: z.enum(warnReasons) })
