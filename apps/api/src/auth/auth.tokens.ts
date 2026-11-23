import { Inject } from "@nestjs/common"

/** Better Auth örneği için DI anahtarı. */
export const AUTH = Symbol("AUTH")

/** Better Auth örneğini constructor'a enjekte eder: constructor(@InjectAuth() auth: Auth) */
export const InjectAuth = () => Inject(AUTH)
