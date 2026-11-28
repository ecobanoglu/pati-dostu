import { Body, Controller, Get, Header, HttpCode, HttpStatus, Param, Patch, Post, Query } from "@nestjs/common"
import { ApiCookieAuth, ApiOperation, ApiProduces, ApiTags } from "@nestjs/swagger"
import { ZodResponse } from "nestjs-zod"

import type { AuthSession } from "../auth/auth.js"
import { CurrentSession, Roles } from "../auth/decorators.js"
import {
  AdminUserDetailDto,
  AdminUserPageDto,
  AdminUsersQueryDto,
  BanUserDto,
  SetUserRoleDto,
  UserIdParamDto,
  WarnUserDto,
} from "./admin-users.dto.js"
import { AdminUsersService } from "./admin-users.service.js"
import { UserModerationService } from "./user-moderation.service.js"

/** Admin › Kullanıcılar (/admin/kullanicilar): liste, CSV, ayrıntı, rol, uyarı, askıya alma / kaldırma. */
@ApiTags("admin")
@ApiCookieAuth()
@Roles("admin")
@Controller("admin/users")
export class AdminUsersController {
  constructor(
    private readonly users: AdminUsersService,
    private readonly moderation: UserModerationService
  ) {}

  /** Kullanıcı listesi: arama (ad, e-posta, telefon), rol, durum, sayfa. */
  @Get()
  @ApiOperation({ summary: "Kullanıcılar" })
  @ZodResponse({ status: 200, type: AdminUserPageDto })
  list(@Query() query: AdminUsersQueryDto): Promise<AdminUserPageDto> {
    return this.users.list(query)
  }

  /** CSV dışa aktarma (geçerli süzgeçlerle; noktalı virgül ayraçlı, UTF-8 BOM). */
  @Get("export.csv")
  @Header("Content-Type", "text/csv; charset=utf-8")
  @Header("Content-Disposition", 'attachment; filename="kullanicilar.csv"')
  @Header("Cache-Control", "no-store")
  @ApiProduces("text/csv")
  @ApiOperation({ summary: "Kullanıcılar (CSV)" })
  csv(@Query() query: AdminUsersQueryDto): Promise<string> {
    return this.users.csv(query)
  }

  /** Kullanıcı ayrıntısı. */
  @Get(":id")
  @ApiOperation({ summary: "Kullanıcı ayrıntısı" })
  @ZodResponse({ status: 200, type: AdminUserDetailDto })
  detail(@Param() { id }: UserIdParamDto): Promise<AdminUserDetailDto> {
    return this.users.detail(id)
  }

  /** Rol değiştir (yalnız Üye ↔ Admin). */
  @Patch(":id/role")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Rol değiştir" })
  async setRole(
    @CurrentSession() session: AuthSession,
    @Param() { id }: UserIdParamDto,
    @Body() { role }: SetUserRoleDto
  ): Promise<void> {
    await this.users.setRole(session.user, id, role)
  }

  /** Uyar: hazır metin + neden (site içi + e-posta). */
  @Post(":id/warn")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Kullanıcıyı uyar" })
  async warn(
    @CurrentSession() session: AuthSession,
    @Param() { id }: UserIdParamDto,
    @Body() { reason }: WarnUserDto
  ): Promise<void> {
    await this.moderation.warn(session.user.id, id, reason, { targetType: "user", title: "" })
  }

  /** Askıya al (7 gün / 30 gün / kalıcı); oturumlar kapanır. */
  @Post(":id/ban")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Hesabı askıya al" })
  async ban(
    @CurrentSession() session: AuthSession,
    @Param() { id }: UserIdParamDto,
    @Body() { duration, reason }: BanUserDto
  ): Promise<void> {
    await this.moderation.ban(session.user.id, id, duration, reason ?? "admin")
  }

  /** Askıyı kaldır. */
  @Post(":id/unban")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Askıyı kaldır" })
  async unban(@CurrentSession() session: AuthSession, @Param() { id }: UserIdParamDto): Promise<void> {
    await this.moderation.unban(session.user.id, id)
  }
}
