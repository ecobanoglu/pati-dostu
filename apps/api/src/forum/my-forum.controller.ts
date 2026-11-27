import { Controller, Get, Query } from "@nestjs/common"
import { ApiCookieAuth, ApiOperation, ApiTags } from "@nestjs/swagger"
import { ZodResponse } from "nestjs-zod"

import type { AuthSession } from "../auth/auth.js"
import { CurrentSession } from "../auth/decorators.js"
import { MyForumQueryDto, MyReplyPageDto, MyTopicPageDto } from "./forum.dto.js"
import { MyForumService } from "./my-forum.service.js"

@ApiTags("forum")
@ApiCookieAuth()
@Controller("me/forum")
export class MyForumController {
  constructor(private readonly myForum: MyForumService) {}

  /** Sorularım: kendi konularım (+ en iyi cevabın yazarı) ve sekme sayıları. */
  @Get("topics")
  @ApiOperation({ summary: "Sorularım" })
  @ZodResponse({ status: 200, type: MyTopicPageDto })
  topics(@CurrentSession() session: AuthSession, @Query() { page, locale }: MyForumQueryDto): Promise<MyTopicPageDto> {
    return this.myForum.topics(session.user.id, page, locale)
  }

  /** Cevaplarım: yazdığım cevaplar ve konuları. */
  @Get("replies")
  @ApiOperation({ summary: "Cevaplarım" })
  @ZodResponse({ status: 200, type: MyReplyPageDto })
  replies(@CurrentSession() session: AuthSession, @Query() { page, locale }: MyForumQueryDto): Promise<MyReplyPageDto> {
    return this.myForum.replies(session.user.id, page, locale)
  }

  /** Takip ettiklerim: takip ettiğim başkalarının konuları (son etkinliğe göre). */
  @Get("following")
  @ApiOperation({ summary: "Takip ettiğim konular" })
  @ZodResponse({ status: 200, type: MyTopicPageDto })
  following(
    @CurrentSession() session: AuthSession,
    @Query() { page, locale }: MyForumQueryDto
  ): Promise<MyTopicPageDto> {
    return this.myForum.following(session.user.id, page, locale)
  }
}
