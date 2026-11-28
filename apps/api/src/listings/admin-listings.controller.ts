import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from "@nestjs/common"
import { ApiCookieAuth, ApiOperation, ApiTags } from "@nestjs/swagger"
import { ZodResponse } from "nestjs-zod"

import type { AuthSession } from "../auth/auth.js"
import { CurrentSession, RequirePermissions } from "../auth/decorators.js"
import { ListingReviewService } from "./listing-review.service.js"
import {
  AdminListingPageDto,
  AdminQueueQueryDto,
  ListingIdParamDto,
  LocaleQueryDto,
  RejectionReasonListDto,
  RejectListingDto,
  RequestChangesDto,
  ReviewInfoDto,
  ReviewQueueDto,
  ReviewQueueQueryDto,
} from "./listings.dto.js"
import { ListingsService } from "./listings.service.js"

/** İlan onay kuyruğu, inceleme bilgisi ve kararlar (admin › İlan onayı — /admin/ilan-onayi). */
@ApiTags("admin")
@ApiCookieAuth()
@RequirePermissions({ listing: ["approve"] })
@Controller("admin/listings")
export class AdminListingsController {
  constructor(
    private readonly listings: ListingsService,
    private readonly review: ListingReviewService
  ) {}

  /** Onay kuyruğu (işaretli, süzgeçli; en fazla 200). */
  @Get("queue")
  @ApiOperation({ summary: "İlan onay kuyruğu (işaretlerle)" })
  @ZodResponse({ status: 200, type: ReviewQueueDto })
  reviewQueue(@Query() query: ReviewQueueQueryDto): Promise<ReviewQueueDto> {
    return this.review.queue(query)
  }

  /** Etkin red gerekçeleri. */
  @Get("rejection-reasons")
  @ApiOperation({ summary: "Red gerekçeleri" })
  @ZodResponse({ status: 200, type: RejectionReasonListDto })
  reasons(@Query() { locale }: LocaleQueryDto): Promise<RejectionReasonListDto> {
    return this.review.reasons(locale)
  }

  /** İnceleme bilgisi: içerik taraması, işaretler, ilan sahibinin geçmişi, önceki not. */
  @Get(":id/review")
  @ApiOperation({ summary: "İlan inceleme bilgisi" })
  @ZodResponse({ status: 200, type: ReviewInfoDto })
  info(@Param() { id }: ListingIdParamDto): Promise<ReviewInfoDto> {
    return this.review.info(id)
  }

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

  /** Reddet (hazır gerekçe ve/veya not): kural ihlali. Sahibi düzenleyip yeniden gönderebilir. */
  @Post(":id/reject")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "İlanı reddet" })
  async reject(
    @CurrentSession() session: AuthSession,
    @Param() { id }: ListingIdParamDto,
    @Body() body: RejectListingDto
  ): Promise<void> {
    await this.review.reject(session.user, id, body)
  }

  /** Düzeltme iste (not + isteğe bağlı düzeltilecek bölümler): küçük eksikler için. */
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
