import { Controller, Get } from "@nestjs/common"
import { ApiCookieAuth, ApiOperation, ApiTags } from "@nestjs/swagger"
import { ZodResponse } from "nestjs-zod"

import type { AuthSession } from "../auth/auth.js"
import { CurrentSession } from "../auth/decorators.js"
import { MeResponseDto } from "./me.dto.js"

@ApiTags("users")
@ApiCookieAuth()
@Controller("me")
export class MeController {
  /** Oturumdaki kullanıcının profil bilgilerini döndürür (web ve mobil, girişten sonra bunu çağırır). */
  @Get()
  @ApiOperation({ summary: "Giriş yapmış kullanıcının bilgileri" })
  @ZodResponse({ status: 200, type: MeResponseDto })
  me(@CurrentSession() session: AuthSession): MeResponseDto {
    const u = session.user
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      emailVerified: u.emailVerified,
      image: u.image ?? null,
      role: (u.role ?? "user") as MeResponseDto["role"],
      phone: u.phone ?? null,
      cityId: u.cityId ?? null,
      locale: u.locale === "en" ? "en" : "tr",
      marketingOptIn: u.marketingOptIn ?? false,
      termsAcceptedAt: u.termsAcceptedAt ? new Date(u.termsAcceptedAt).toISOString() : null,
    }
  }
}
