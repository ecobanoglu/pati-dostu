import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from "@nestjs/common"
import { ApiCookieAuth, ApiOperation, ApiTags } from "@nestjs/swagger"
import { ZodResponse } from "nestjs-zod"

import type { AuthSession } from "../auth/auth.js"
import { CurrentSession } from "../auth/decorators.js"
import {
  MarkNotificationsReadDto,
  NotificationPageDto,
  NotificationsQueryDto,
  UnreadCountDto,
} from "./notifications.dto.js"
import { NotificationsService } from "./notifications.service.js"

@ApiTags("notifications")
@ApiCookieAuth()
@Controller("me/notifications")
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  /** Bildirimlerim, en yeni önce (cursor ile sayfalı) + okunmamış sayısı. */
  @Get()
  @ApiOperation({ summary: "Site içi bildirimler" })
  @ZodResponse({ status: 200, type: NotificationPageDto })
  list(@CurrentSession() session: AuthSession, @Query() query: NotificationsQueryDto): Promise<NotificationPageDto> {
    return this.notifications.list(session.user.id, query)
  }

  /** Okunmamış bildirim sayısı (üst menüdeki zil bunu dakikada bir ve sekmeye dönünce sorgular — polling kararı). */
  @Get("unread-count")
  @ApiOperation({ summary: "Okunmamış bildirim sayısı" })
  @ZodResponse({ status: 200, type: UnreadCountDto })
  async unread(@CurrentSession() session: AuthSession): Promise<UnreadCountDto> {
    return { count: await this.notifications.unreadCount(session.user.id) }
  }

  /** Okundu işaretle: `ids` verilirse onları, verilmezse tümünü. */
  @Post("read")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Bildirimleri okundu işaretle" })
  async read(@CurrentSession() session: AuthSession, @Body() { ids }: MarkNotificationsReadDto): Promise<void> {
    await this.notifications.markRead(session.user.id, ids)
  }
}
