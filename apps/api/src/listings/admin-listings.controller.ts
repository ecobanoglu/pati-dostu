import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from "@nestjs/common"
import { ApiCookieAuth, ApiOperation, ApiTags } from "@nestjs/swagger"
import { ZodResponse } from "nestjs-zod"

import type { AuthSession } from "../auth/auth.js"
import { CurrentSession, RequirePermissions } from "../auth/decorators.js"
import { AdminListingsService } from "./admin-listings.service.js"
import { ListingReviewService } from "./listing-review.service.js"
import {
  AdminListingPageDto,
  AdminListingsQueryDto,
  ListingIdParamDto,
  LocaleQueryDto,
  RejectionReasonListDto,
  RejectListingDto,
  RemoveListingDto,
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
    private readonly review: ListingReviewService,
    private readonly admin: AdminListingsService
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

  /** Tüm ilanlar (taslaklar hariç): durum, tür, arama, sıralama, sayfa; durum sayıları. */
  @Get()
  @ApiOperation({ summary: "İlanlar (admin)" })
  @ZodResponse({ status: 200, type: AdminListingPageDto })
  list(@Query() query: AdminListingsQueryDto): Promise<AdminListingPageDto> {
    return this.admin.list(query)
  }

  /** Yayından kaldır: yayındaki ilan kapatılır, sahibine bildirim gider. */
  @Post(":id/close")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "İlanı yayından kaldır" })
  async close(@CurrentSession() session: AuthSession, @Param() { id }: ListingIdParamDto): Promise<void> {
    await this.admin.close(session.user, id)
  }

  /** Sil (yumuşak): hazır gerekçe ve/veya not; sahibine gerekçeli bildirim. */
  @Post(":id/remove")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "İlanı sil (gerekçeli)" })
  async remove(
    @CurrentSession() session: AuthSession,
    @Param() { id }: ListingIdParamDto,
    @Body() body: RemoveListingDto
  ): Promise<void> {
    await this.admin.remove(session.user, id, body)
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
