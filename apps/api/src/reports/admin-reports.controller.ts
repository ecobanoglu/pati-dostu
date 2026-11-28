import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from "@nestjs/common"
import { ApiCookieAuth, ApiOperation, ApiTags } from "@nestjs/swagger"
import { ZodResponse } from "nestjs-zod"

import type { AuthSession } from "../auth/auth.js"
import { CurrentSession, RequirePermissions } from "../auth/decorators.js"
import {
  AdminReportsQueryDto,
  DismissReportDto,
  ReportCaseDto,
  ReportCasePageDto,
  ReportCaseParamsDto,
  ResolveReportDto,
} from "./admin-reports.dto.js"
import { AdminReportsService } from "./admin-reports.service.js"

/** Şikâyet dosyaları ve sonuçlandırma (admin › Şikayetler — /admin/sikayetler). */
@ApiTags("admin")
@ApiCookieAuth()
@RequirePermissions({ report: ["resolve"] })
@Controller("admin/reports")
export class AdminReportsController {
  constructor(private readonly reports: AdminReportsService) {}

  /** Dosyalar (hedef başına tek kayıt): açık / sonuçlanan, hedef türü, sayfa. */
  @Get()
  @ApiOperation({ summary: "Şikâyet dosyaları" })
  @ZodResponse({ status: 200, type: ReportCasePageDto })
  list(@Query() query: AdminReportsQueryDto): Promise<ReportCasePageDto> {
    return this.reports.list(query)
  }

  /** Dosya ayrıntısı: içerik, şikâyetler, içerik sahibi ve geçmişi. */
  @Get(":targetType/:targetId")
  @ApiOperation({ summary: "Şikâyet dosyası" })
  @ZodResponse({ status: 200, type: ReportCaseDto })
  detail(@Param() { targetType, targetId }: ReportCaseParamsDto): Promise<ReportCaseDto> {
    return this.reports.detail(targetType, targetId)
  }

  /** Seçili işlemleri uygula (içeriği kaldır / uyar / askıya al) ve dosyayı kapat. */
  @Post(":targetType/:targetId/resolve")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Şikâyeti sonuçlandır" })
  async resolve(
    @CurrentSession() session: AuthSession,
    @Param() { targetType, targetId }: ReportCaseParamsDto,
    @Body() body: ResolveReportDto
  ): Promise<void> {
    await this.reports.resolve(session.user, targetType, targetId, body)
  }

  /** Şikâyeti asılsız say (içerikte değişiklik yok). */
  @Post(":targetType/:targetId/dismiss")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Şikâyeti asılsız say" })
  async dismiss(
    @CurrentSession() session: AuthSession,
    @Param() { targetType, targetId }: ReportCaseParamsDto,
    @Body() { note }: DismissReportDto
  ): Promise<void> {
    await this.reports.dismiss(session.user, targetType, targetId, note)
  }
}
