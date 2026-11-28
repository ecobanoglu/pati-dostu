import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from "@nestjs/common"
import { ApiCookieAuth, ApiOperation, ApiTags } from "@nestjs/swagger"
import { ZodResponse } from "nestjs-zod"

import type { AuthSession } from "../auth/auth.js"
import { CurrentSession, Roles } from "../auth/decorators.js"
import {
  AdminApplicationDetailDto,
  AdminApplicationPageDto,
  AdminApplicationsQueryDto,
  ApplicationIdParamDto,
  MyApplicationDto,
  OrganizationApplicationDto,
  RejectApplicationDto,
} from "./organizations.dto.js"
import { OrganizationsService } from "./organizations.service.js"

/** Kurumsal başvuru (kullanıcı tarafı — /hesabim/kurumsal-basvuru). */
@ApiTags("organizations")
@ApiCookieAuth()
@Controller("organizations/applications")
export class OrganizationsController {
  constructor(private readonly organizations: OrganizationsService) {}

  /** Oturumdaki kullanıcının başvurusu (yoksa `application: null`). */
  @Get("me")
  @ApiOperation({ summary: "Başvurum" })
  @ZodResponse({ status: 200, type: MyApplicationDto })
  mine(@CurrentSession() session: AuthSession): Promise<MyApplicationDto> {
    return this.organizations.mine(session.user)
  }

  /** Başvuru gönder (reddedilmişse düzenleyip yeniden gönder). */
  @Post()
  @ApiOperation({ summary: "Kurumsal başvuru gönder" })
  @ZodResponse({ status: 201, type: MyApplicationDto })
  apply(@CurrentSession() session: AuthSession, @Body() body: OrganizationApplicationDto): Promise<MyApplicationDto> {
    return this.organizations.apply(session.user, body)
  }
}

/** Admin › Kurum başvuruları (/admin/kurum-basvurulari): liste, ayrıntı, onay, red. */
@ApiTags("admin")
@ApiCookieAuth()
@Roles("admin")
@Controller("admin/organizations/applications")
export class AdminOrganizationsController {
  constructor(private readonly organizations: OrganizationsService) {}

  /** Başvurular: durum sekmesi (bekleyen / onaylanan / reddedilen), sayfa. */
  @Get()
  @ApiOperation({ summary: "Kurum başvuruları" })
  @ZodResponse({ status: 200, type: AdminApplicationPageDto })
  list(@Query() query: AdminApplicationsQueryDto): Promise<AdminApplicationPageDto> {
    return this.organizations.list(query)
  }

  /** Başvuru ayrıntısı. */
  @Get(":id")
  @ApiOperation({ summary: "Kurum başvurusu ayrıntısı" })
  @ZodResponse({ status: 200, type: AdminApplicationDetailDto })
  detail(@Param() { id }: ApplicationIdParamDto): Promise<AdminApplicationDetailDto> {
    return this.organizations.detail(id)
  }

  /** Onayla: rol clinic / shelter olur. */
  @Post(":id/approve")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Başvuruyu onayla" })
  async approve(@CurrentSession() session: AuthSession, @Param() { id }: ApplicationIdParamDto): Promise<void> {
    await this.organizations.approve(session.user, id)
  }

  /** Reddet (gerekçe kullanıcıya gider). */
  @Post(":id/reject")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Başvuruyu reddet" })
  async reject(
    @CurrentSession() session: AuthSession,
    @Param() { id }: ApplicationIdParamDto,
    @Body() { reason }: RejectApplicationDto
  ): Promise<void> {
    await this.organizations.reject(session.user, id, reason)
  }
}
