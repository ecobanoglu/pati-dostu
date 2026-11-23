import { createAccessControl } from "better-auth/plugins/access"
import { adminAc, defaultStatements } from "better-auth/plugins/admin/access"

/**
 * Kaynak → eylem tanımları (taslak › Roller ve yetki matrisi).
 * defaultStatements: Better Auth admin eklentisinin user/session yönetim eylemleri.
 * Yeni bir modül eklenince kaynağı buraya, yetkisini aşağıdaki rollere ekleyin.
 */
export const statements = {
  ...defaultStatements,
  listing: ["create", "update-own", "approve", "delete-any"],
  comment: ["create", "moderate"],
  topic: ["create", "reply", "moderate"],
  post: ["propose", "publish"],
  organization: ["apply", "manage-own", "verify"],
  dictionary: ["manage"],
  report: ["create", "resolve", "view-own-stats", "view-all"],
} as const

export const ac = createAccessControl(statements)

const member = {
  listing: ["create", "update-own"],
  comment: ["create"],
  topic: ["create", "reply"],
  report: ["create"],
} as const

export const roles = {
  user: ac.newRole({
    ...member,
    organization: ["apply"],
  }),
  clinic: ac.newRole({
    ...member,
    post: ["propose"],
    organization: ["manage-own"],
    report: ["create", "view-own-stats"],
  }),
  shelter: ac.newRole({
    ...member,
    post: ["propose"],
    organization: ["manage-own"],
    report: ["create", "view-own-stats"],
  }),
  admin: ac.newRole({
    ...adminAc.statements,
    listing: ["create", "update-own", "approve", "delete-any"],
    comment: ["create", "moderate"],
    topic: ["create", "reply", "moderate"],
    post: ["propose", "publish"],
    organization: ["apply", "manage-own", "verify"],
    dictionary: ["manage"],
    report: ["create", "resolve", "view-own-stats", "view-all"],
  }),
}

export type Role = keyof typeof roles
export type Permissions = { [K in keyof typeof statements]?: Array<(typeof statements)[K][number]> }
