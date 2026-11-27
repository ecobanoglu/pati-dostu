import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Query } from "@nestjs/common"
import { ApiCookieAuth, ApiOperation, ApiTags } from "@nestjs/swagger"
import { ZodResponse } from "nestjs-zod"

import type { AuthSession } from "../auth/auth.js"
import { CurrentSession, Public } from "../auth/decorators.js"
import { ListingRefParamDto } from "../listings/listings.dto.js"
import { CommentDto, CommentIdParamDto, CommentPageDto, CommentsQueryDto, CreateCommentDto } from "./comments.dto.js"
import { CommentsService } from "./comments.service.js"

@ApiTags("comments")
@Controller()
export class CommentsController {
  constructor(private readonly comments: CommentsService) {}

  /** Yayındaki ilanın yorumları (herkese açık), en yeni önce. */
  @Public()
  @Get("listings/:ref/comments")
  @ApiOperation({ summary: "İlan yorumları" })
  @ZodResponse({ status: 200, type: CommentPageDto })
  list(@Param() { ref }: ListingRefParamDto, @Query() query: CommentsQueryDto): Promise<CommentPageDto> {
    return this.comments.list(ref, query)
  }

  /** Yorum yazar (içerik filtresinden geçerse anında yayınlanır). */
  @ApiCookieAuth()
  @Post("listings/:ref/comments")
  @ApiOperation({ summary: "Yorum yaz" })
  @ZodResponse({ status: 201, type: CommentDto })
  create(
    @CurrentSession() session: AuthSession,
    @Param() { ref }: ListingRefParamDto,
    @Body() { body }: CreateCommentDto
  ): Promise<CommentDto> {
    return this.comments.create(session.user, ref, body)
  }

  /** Yorumu siler: yazan, ilan sahibi ya da admin. */
  @ApiCookieAuth()
  @Delete("comments/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Yorumu sil" })
  async remove(@CurrentSession() session: AuthSession, @Param() { id }: CommentIdParamDto): Promise<void> {
    await this.comments.remove(session.user, id)
  }
}
