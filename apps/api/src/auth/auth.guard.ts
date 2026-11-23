import { type CanActivate, type ExecutionContext, HttpStatus, Inject, Injectable } from "@nestjs/common"
import { Reflector } from "@nestjs/core"
import { fromNodeHeaders } from "better-auth/node"

import { AppException, ErrorCode } from "../common/errors.js"
import type { Auth } from "./auth.js"
import { AUTH } from "./auth.tokens.js"
import { IS_PUBLIC, PERMISSIONS, ROLES, type RequestWithSession } from "./decorators.js"
import { type Permissions, type Role, roles as roleDefinitions } from "./permissions.js"

/**
 * Global guard:
 * 1. Oturumu Better Auth ile çözer (web: cookie, mobil: bearer) ve request.session'a yazar.
 * 2. @Public() değilse oturum ister (401); banlı kullanıcıyı reddeder (403).
 * 3. @Roles() / @RequirePermissions() varsa rolü kontrol eder (403).
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(AUTH) private readonly auth: Auth
  ) {}

  /** Her HTTP isteğinde çalışır: oturumu çözer, giriş/rol/yetki şartlarını kontrol eder; şart sağlanmazsa 401/403 fırlatır. */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== "http") return true

    const request = context.switchToHttp().getRequest<RequestWithSession>()
    const targets = [context.getHandler(), context.getClass()]

    const session = await this.auth.api.getSession({ headers: fromNodeHeaders(request.headers) })
    request.session = session

    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets)) return true

    if (!session) {
      throw new AppException(HttpStatus.UNAUTHORIZED, ErrorCode.UNAUTHORIZED, "Bu işlem için giriş yapmalısınız.")
    }
    if (session.user.banned) {
      throw new AppException(HttpStatus.FORBIDDEN, ErrorCode.ACCOUNT_BANNED, "Hesabınız askıya alınmış.")
    }

    const role = (session.user.role ?? "user") as Role
    const forbidden = () => new AppException(HttpStatus.FORBIDDEN, ErrorCode.FORBIDDEN, "Bu işlem için yetkiniz yok.")

    const requiredRoles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES, targets)
    if (requiredRoles && !requiredRoles.includes(role)) throw forbidden()

    const permissions = this.reflector.getAllAndOverride<Permissions | undefined>(PERMISSIONS, targets)
    if (permissions && !roleDefinitions[role].authorize(permissions).success) throw forbidden()

    return true
  }
}
