import { Controller, Get } from "@nestjs/common"
import { ApiCookieAuth, ApiOperation, ApiTags } from "@nestjs/swagger"
import { ZodResponse } from "nestjs-zod"

import type { AuthSession } from "../auth/auth.js"
import { CurrentSession } from "../auth/decorators.js"
import { MeResponseDto, MeSummaryDto } from "./me.dto.js"
import { MeSummaryService } from "./me-summary.service.js"

@ApiTags("users")
@ApiCookieAuth()
@Controller("me")
export class MeController {
  constructor(private readonly summaries: MeSummaryService) {}

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

  /** Hesabım › Panel özeti: ilan sayıları (duruma göre), favori sayısı, toplam görüntülenme. */
  @Get("summary")
  @ApiOperation({ summary: "Hesabım özeti" })
  @ZodResponse({ status: 200, type: MeSummaryDto })
  summary(@CurrentSession() session: AuthSession): Promise<MeSummaryDto> {
    return this.summaries.summary(session.user.id)
  }
}
