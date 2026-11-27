import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from "@nestjs/common"
import { ApiCookieAuth, ApiOperation, ApiTags } from "@nestjs/swagger"
import { ZodResponse } from "nestjs-zod"

import type { AuthSession } from "../auth/auth.js"
import { CurrentSession } from "../auth/decorators.js"
import {
  ConversationDto,
  ConversationIdParamDto,
  ConversationPageDto,
  ConversationsQueryDto,
  MessageDto,
  MessagePageDto,
  MessagesQueryDto,
  MessagesUnreadDto,
  SendMessageDto,
  StartConversationDto,
} from "./messaging.dto.js"
import { MessagingService } from "./messaging.service.js"

@ApiTags("messaging")
@ApiCookieAuth()
@Controller("conversations")
export class MessagingController {
  constructor(private readonly messaging: MessagingService) {}

  /** Konuşmalarım (son mesajı en yeni önce), her birinde okunmamış sayısı; `q` ile kişi/ilan araması. */
  @Get()
  @ApiOperation({ summary: "Konuşma listesi" })
  @ZodResponse({ status: 200, type: ConversationPageDto })
  list(@CurrentSession() session: AuthSession, @Query() query: ConversationsQueryDto): Promise<ConversationPageDto> {
    return this.messaging.list(session.user.id, query)
  }

  /** İlan için konuşma başlatır (ilk mesajla); bu ilanda konuşma zaten varsa mesajı ona ekler. */
  @Post()
  @ApiOperation({ summary: "İlan için konuşma başlat" })
  @ZodResponse({ status: 201, type: ConversationDto })
  start(@CurrentSession() session: AuthSession, @Body() body: StartConversationDto): Promise<ConversationDto> {
    return this.messaging.start(session.user, body)
  }

  /** Tüm konuşmalarımdaki okunmamış mesaj sayısı (menü rozeti; polling ile sorgulanır). */
  @Get("unread-count")
  @ApiOperation({ summary: "Okunmamış mesaj sayısı" })
  @ZodResponse({ status: 200, type: MessagesUnreadDto })
  async unread(@CurrentSession() session: AuthSession): Promise<MessagesUnreadDto> {
    return { count: await this.messaging.unreadCount(session.user.id) }
  }

  /** Tek konuşma: karşı taraf ve ilan (konuşma başlığı). */
  @Get(":id")
  @ApiOperation({ summary: "Konuşma" })
  @ZodResponse({ status: 200, type: ConversationDto })
  get(@CurrentSession() session: AuthSession, @Param() { id }: ConversationIdParamDto): Promise<ConversationDto> {
    return this.messaging.get(session.user.id, id)
  }

  /** Mesajlar (eskiden yeniye): en yeniler, `before` ile eskiler, `after` ile yalnız yeniler (polling). */
  @Get(":id/messages")
  @ApiOperation({ summary: "Mesajlar" })
  @ZodResponse({ status: 200, type: MessagePageDto })
  messages(
    @CurrentSession() session: AuthSession,
    @Param() { id }: ConversationIdParamDto,
    @Query() query: MessagesQueryDto
  ): Promise<MessagePageDto> {
    return this.messaging.messages(session.user.id, id, query)
  }

  /** Mesaj gönderir (içerik filtresi + istek sınırı). */
  @Post(":id/messages")
  @ApiOperation({ summary: "Mesaj gönder" })
  @ZodResponse({ status: 201, type: MessageDto })
  send(
    @CurrentSession() session: AuthSession,
    @Param() { id }: ConversationIdParamDto,
    @Body() { body }: SendMessageDto
  ): Promise<MessageDto> {
    return this.messaging.send(session.user, id, body)
  }

  /** Karşı tarafın mesajlarını (ve bu konuşmanın "yeni mesaj" bildirimlerini) okundu işaretler. */
  @Post(":id/read")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Okundu işaretle" })
  async read(@CurrentSession() session: AuthSession, @Param() { id }: ConversationIdParamDto): Promise<void> {
    await this.messaging.markRead(session.user.id, id)
  }
}
