import { Body, Controller, HttpCode, HttpStatus, Param, Post } from "@nestjs/common"
import { ApiCookieAuth, ApiOperation, ApiTags } from "@nestjs/swagger"
import { ZodResponse } from "nestjs-zod"

import type { AuthSession } from "../auth/auth.js"
import { CurrentSession } from "../auth/decorators.js"
import { CommentIdParamDto } from "../comments/comments.dto.js"
import { ListingRefParamDto } from "../listings/listings.dto.js"
import {
  CommentReportDto,
  ListingReportDto,
  ReplyReportDto,
  ReportResultDto,
  TopicReportDto,
  UserIdParamDto,
  UserReportDto,
} from "./reports.dto.js"
import { ReportsService } from "./reports.service.js"

@ApiTags("reports")
@ApiCookieAuth()
@Controller()
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  /** Yayındaki ilanı şikâyet et (neden + açıklama). */
  @Post("listings/:ref/report")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "İlanı şikâyet et" })
  @ZodResponse({ status: 201, type: ReportResultDto })
  listing(
    @CurrentSession() session: AuthSession,
    @Param() { ref }: ListingRefParamDto,
    @Body() body: ListingReportDto
  ): Promise<ReportResultDto> {
    return this.reports.reportListing(session.user, ref, body)
  }

  /** İlan yorumunu şikâyet et. */
  @Post("comments/:id/report")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Yorumu şikâyet et" })
  @ZodResponse({ status: 201, type: ReportResultDto })
  comment(
    @CurrentSession() session: AuthSession,
    @Param() { id }: CommentIdParamDto,
    @Body() body: CommentReportDto
  ): Promise<ReportResultDto> {
    return this.reports.reportComment(session.user, id, body)
  }

  /** Topluluk konusunu şikâyet et. */
  @Post("forum/topics/:id/report")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Topluluk konusunu şikâyet et" })
  @ZodResponse({ status: 201, type: ReportResultDto })
  topic(
    @CurrentSession() session: AuthSession,
    @Param() { id }: CommentIdParamDto,
    @Body() body: TopicReportDto
  ): Promise<ReportResultDto> {
    return this.reports.reportTopic(session.user, id, body)
  }

  /** Topluluk cevabını şikâyet et. */
  @Post("forum/replies/:id/report")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Topluluk cevabını şikâyet et" })
  @ZodResponse({ status: 201, type: ReportResultDto })
  reply(
    @CurrentSession() session: AuthSession,
    @Param() { id }: CommentIdParamDto,
    @Body() body: ReplyReportDto
  ): Promise<ReportResultDto> {
    return this.reports.reportReply(session.user, id, body)
  }

  /** Kullanıcıyı şikâyet et (Mesajlar'daki konuşmadan). */
  @Post("users/:id/report")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Kullanıcıyı şikâyet et" })
  @ZodResponse({ status: 201, type: ReportResultDto })
  user(
    @CurrentSession() session: AuthSession,
    @Param() { id }: UserIdParamDto,
    @Body() body: UserReportDto
  ): Promise<ReportResultDto> {
    return this.reports.reportUser(session.user, id, body)
  }
}
