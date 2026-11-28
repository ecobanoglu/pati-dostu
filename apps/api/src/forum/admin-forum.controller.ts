import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from "@nestjs/common"
import { ApiCookieAuth, ApiOperation, ApiTags } from "@nestjs/swagger"
import { ZodResponse } from "nestjs-zod"

import type { AuthSession } from "../auth/auth.js"
import { CurrentSession, Roles } from "../auth/decorators.js"
import {
  AdminForumQueryDto,
  AdminReplyPageDto,
  AdminTopicPageDto,
  ForumIdParamDto,
  RemoveForumContentDto,
  UpdateForumTopicDto,
} from "./admin-forum.dto.js"
import { AdminForumService } from "./admin-forum.service.js"

/** Admin › Topluluk (/admin/topluluk): konu ve cevap listeleri, kategori taşıma, sabitleme, kilitleme, gerekçeli silme. */
@ApiTags("admin")
@ApiCookieAuth()
@Roles("admin")
@Controller("admin/forum")
export class AdminForumController {
  constructor(private readonly forum: AdminForumService) {}

  /** Konular: arama, kategori, yayında / silinmiş, sıralama, sayfa. */
  @Get("topics")
  @ApiOperation({ summary: "Topluluk konuları (admin)" })
  @ZodResponse({ status: 200, type: AdminTopicPageDto })
  topics(@Query() query: AdminForumQueryDto): Promise<AdminTopicPageDto> {
    return this.forum.topics(query)
  }

  /** Cevaplar: arama, kategori, yayında / silinmiş, sayfa. */
  @Get("replies")
  @ApiOperation({ summary: "Topluluk cevapları (admin)" })
  @ZodResponse({ status: 200, type: AdminReplyPageDto })
  replies(@Query() query: AdminForumQueryDto): Promise<AdminReplyPageDto> {
    return this.forum.replies(query)
  }

  /** Kategori taşı / sabitle / kilitle. */
  @Patch("topics/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Konuyu düzenle (kategori, sabit, kilit)" })
  async update(
    @CurrentSession() session: AuthSession,
    @Param() { id }: ForumIdParamDto,
    @Body() body: UpdateForumTopicDto
  ): Promise<void> {
    await this.forum.update(session.user, id, body)
  }

  /** Konuyu gerekçeyle sil (yazara bildirim). */
  @Post("topics/:id/remove")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Konuyu sil (gerekçeli)" })
  async removeTopic(
    @CurrentSession() session: AuthSession,
    @Param() { id }: ForumIdParamDto,
    @Body() body: RemoveForumContentDto
  ): Promise<void> {
    await this.forum.removeTopic(session.user, id, body)
  }

  /** Cevabı gerekçeyle sil (yazara bildirim). */
  @Post("replies/:id/remove")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Cevabı sil (gerekçeli)" })
  async removeReply(
    @CurrentSession() session: AuthSession,
    @Param() { id }: ForumIdParamDto,
    @Body() body: RemoveForumContentDto
  ): Promise<void> {
    await this.forum.removeReply(session.user, id, body)
  }
}
