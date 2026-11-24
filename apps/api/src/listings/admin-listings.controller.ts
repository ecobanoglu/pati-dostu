import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from "@nestjs/common"
import { ApiCookieAuth, ApiOperation, ApiTags } from "@nestjs/swagger"
import { ZodResponse } from "nestjs-zod"

import type { AuthSession } from "../auth/auth.js"
import { CurrentSession, RequirePermissions } from "../auth/decorators.js"
import {
  AdminListingPageDto,
  AdminQueueQueryDto,
  ListingIdParamDto,
  RejectListingDto,
  RequestChangesDto,
} from "./listings.dto.js"
import { ListingsService } from "./listings.service.js"

/** İlan onay kuyruğu ve kararları. Arayüzü 5. aşamada (admin paneli); şimdilik Swagger'dan denenir. */
@ApiTags("admin")
@ApiCookieAuth()
@RequirePermissions({ listing: ["approve"] })
@Controller("admin/listings")
export class AdminListingsController {
  constructor(private readonly listings: ListingsService) {}

  /** Onay kuyruğu (varsayılan: onay bekleyenler, en eski önce). */
  @Get()
  @ApiOperation({ summary: "İlan onay kuyruğu" })
  @ZodResponse({ status: 200, type: AdminListingPageDto })
  queue(@Query() { status, page, locale }: AdminQueueQueryDto): Promise<AdminListingPageDto> {
    return this.listings.adminQueue(status, page, locale)
  }

  /** Onayla: ilan yayına girer. */
  @Post(":id/approve")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "İlanı onayla" })
  async approve(@CurrentSession() session: AuthSession, @Param() { id }: ListingIdParamDto): Promise<void> {
    await this.listings.review(session.user, id, { kind: "approve" })
  }

  /** Reddet (gerekçe zorunlu): kural ihlali. Sahibi düzenleyip yeniden gönderebilir. */
  @Post(":id/reject")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "İlanı reddet" })
  async reject(
    @CurrentSession() session: AuthSession,
    @Param() { id }: ListingIdParamDto,
    @Body() { reason }: RejectListingDto
  ): Promise<void> {
    await this.listings.review(session.user, id, { kind: "reject", reason })
  }

  /** Düzeltme iste (not + düzeltilecek alanlar): küçük eksikler için. */
  @Post(":id/request-changes")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Düzeltme iste" })
  async requestChanges(
    @CurrentSession() session: AuthSession,
    @Param() { id }: ListingIdParamDto,
    @Body() { note, fields }: RequestChangesDto
  ): Promise<void> {
    await this.listings.review(session.user, id, { kind: "request_changes", note, fields })
  }
}
