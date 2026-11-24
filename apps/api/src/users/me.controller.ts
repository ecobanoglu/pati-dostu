import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Patch, Put } from "@nestjs/common"
import { ApiCookieAuth, ApiOperation, ApiTags } from "@nestjs/swagger"
import { ZodResponse } from "nestjs-zod"

import type { AuthSession } from "../auth/auth.js"
import { CurrentSession } from "../auth/decorators.js"
import { AvatarDto, AvatarResponseDto, DeleteAccountDto, MeResponseDto, MeSummaryDto, UpdateMeDto } from "./me.dto.js"
import { MeSummaryService } from "./me-summary.service.js"
import { ProfileService } from "./profile.service.js"

@ApiTags("users")
@ApiCookieAuth()
@Controller("me")
export class MeController {
  constructor(
    private readonly summaries: MeSummaryService,
    private readonly profile: ProfileService
  ) {}

  /** Oturumdaki kullanıcının profil bilgilerini döndürür (web ve mobil, girişten sonra bunu çağırır). */
  @Get()
  @ApiOperation({ summary: "Giriş yapmış kullanıcının bilgileri" })
  @ZodResponse({ status: 200, type: MeResponseDto })
  async me(@CurrentSession() session: AuthSession): Promise<MeResponseDto> {
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
      showPhoneByDefault: u.showPhoneByDefault ?? false,
      bio: u.bio ?? null,
      hasPassword: await this.profile.hasPassword(u.id),
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

  /** Profil, telefon ve tercihleri günceller (gönderilen alanlar). "Hakkımda" içerik filtresinden geçer. */
  @Patch()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Profil ve ayarları güncelle" })
  async update(@CurrentSession() session: AuthSession, @Body() body: UpdateMeDto): Promise<void> {
    await this.profile.update(session.user, body)
  }

  /** Yüklenen geçici dosyayı profil fotoğrafı yapar (POST /uploads/avatar ile alınan anahtar). */
  @Put("avatar")
  @ApiOperation({ summary: "Profil fotoğrafını ayarla" })
  @ZodResponse({ status: 200, type: AvatarResponseDto })
  setAvatar(@CurrentSession() session: AuthSession, @Body() { key }: AvatarDto): Promise<AvatarResponseDto> {
    return this.profile.setAvatar(session.user, key)
  }

  /** Profil fotoğrafını kaldırır. */
  @Delete("avatar")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Profil fotoğrafını kaldır" })
  async removeAvatar(@CurrentSession() session: AuthSession): Promise<void> {
    await this.profile.removeAvatar(session.user)
  }

  /** Hesabı kapatır ve anonimleştirir (şifreli hesapta mevcut şifre gerekir). Geri alınamaz. */
  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Hesabı sil (anonimleştir)" })
  async remove(@CurrentSession() session: AuthSession, @Body() body: DeleteAccountDto): Promise<void> {
    await this.profile.deleteAccount(session.user, body)
  }
}
