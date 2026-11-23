import { createParamDecorator, type ExecutionContext, SetMetadata } from "@nestjs/common"
import type { Request } from "express"

import type { AuthSession } from "./auth.js"
import type { Permissions, Role } from "./permissions.js"

export const IS_PUBLIC = "auth:public"
export const OPTIONAL_AUTH = "auth:optional"
export const ROLES = "auth:roles"
export const PERMISSIONS = "auth:permissions"

/** Giriş gerekmez; oturum varsa yine de çözülür ve @CurrentSession() ile okunabilir. */
export const Public = () => SetMetadata(IS_PUBLIC, true)

/** Yalnızca bu rollerden biri erişebilir. Ör. @Roles("admin") */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES, roles)

/** Rolün bu yetkilere sahip olması gerekir (permissions.ts). Ör. @RequirePermissions({ listing: ["approve"] }) */
export const RequirePermissions = (permissions: Permissions) => SetMetadata(PERMISSIONS, permissions)

export type RequestWithSession = Request & { session?: AuthSession | null }

/** Oturum (user + session). @Public() uçlarda oturum yoksa null. */
export const CurrentSession = createParamDecorator((_: unknown, context: ExecutionContext) => {
  return context.switchToHttp().getRequest<RequestWithSession>().session ?? null
})
