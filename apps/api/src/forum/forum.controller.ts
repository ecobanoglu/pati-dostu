import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put, Query } from "@nestjs/common"
import { ApiCookieAuth, ApiOperation, ApiTags } from "@nestjs/swagger"
import { ZodResponse } from "nestjs-zod"

import type { AuthSession } from "../auth/auth.js"
import { CurrentSession, Public } from "../auth/decorators.js"
import {
  CreatedTopicDto,
  CreateReplyDto,
  CreateTopicDto,
  ForumCategoryListDto,
  ForumIdParamDto,
  ForumLocaleQueryDto,
  LikeResultDto,
  ReplyDto,
  SimilarTopicListDto,
  SimilarTopicsQueryDto,
  TopicDetailDto,
  TopicPageDto,
  TopicSlugParamDto,
  TopicsQueryDto,
  TopicViewerDto,
} from "./forum.dto.js"
import { ForumService } from "./forum.service.js"

@ApiTags("forum")
@Controller("forum")
export class ForumController {
  constructor(private readonly forum: ForumService) {}

  /** Kategoriler ve konu sayıları. */
  @Public()
  @Get("categories")
  @ApiOperation({ summary: "Topluluk kategorileri" })
  @ZodResponse({ status: 200, type: ForumCategoryListDto })
  categories(@Query() { locale }: ForumLocaleQueryDto): Promise<ForumCategoryListDto> {
    return this.forum.categories(locale)
  }

  /** Konu listesi: kategori, tür, arama, sıralama (yeni / popüler / cevapsız), sayfa. */
  @Public()
  @Get("topics")
  @ApiOperation({ summary: "Topluluk konuları" })
  @ZodResponse({ status: 200, type: TopicPageDto })
  list(@Query() query: TopicsQueryDto): Promise<TopicPageDto> {
    return this.forum.list(query)
  }

  /** Başlığa benzer konular (soru sorarken ve konu detayında). */
  @Public()
  @Get("similar")
  @ApiOperation({ summary: "Benzer konular" })
  @ZodResponse({ status: 200, type: SimilarTopicListDto })
  similar(@Query() query: SimilarTopicsQueryDto): Promise<SimilarTopicListDto> {
    return this.forum.similar(query)
  }

  /** Konu detayı ve cevaplar (slug ile). */
  @Public()
  @Get("topics/:slug")
  @ApiOperation({ summary: "Konu detayı" })
  @ZodResponse({ status: 200, type: TopicDetailDto })
  detail(@Param() { slug }: TopicSlugParamDto, @Query() { locale }: ForumLocaleQueryDto): Promise<TopicDetailDto> {
    return this.forum.detail(slug, locale)
  }

  /** Görüntülenme (web oturum başına bir kez çağırır; yazarın bakışı sayılmaz). */
  @Public()
  @Post("topics/:id/views")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Konu görüntülenmesi" })
  async view(@Param() { id }: ForumIdParamDto, @CurrentSession() session: AuthSession | null): Promise<void> {
    await this.forum.view(id, session?.user.id ?? null)
  }

  /** Bakan kişinin durumu: soru sahibi mi, takip ediyor mu, beğendiği cevaplar. */
  @ApiCookieAuth()
  @Get("topics/:id/viewer")
  @ApiOperation({ summary: "Konuda bakan kişinin durumu" })
  @ZodResponse({ status: 200, type: TopicViewerDto })
  viewer(@Param() { id }: ForumIdParamDto, @CurrentSession() session: AuthSession): Promise<TopicViewerDto> {
    return this.forum.viewer(session.user.id, id)
  }

  /** Soru sor (içerik filtresinden geçerse anında yayınlanır). */
  @ApiCookieAuth()
  @Post("topics")
  @ApiOperation({ summary: "Konu aç" })
  @ZodResponse({ status: 201, type: CreatedTopicDto })
  create(@CurrentSession() session: AuthSession, @Body() body: CreateTopicDto): Promise<CreatedTopicDto> {
    return this.forum.create(session.user, body)
  }

  /** Konuyu sil (yazan ya da admin). */
  @ApiCookieAuth()
  @Delete("topics/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Konuyu sil" })
  async removeTopic(@CurrentSession() session: AuthSession, @Param() { id }: ForumIdParamDto): Promise<void> {
    await this.forum.removeTopic(session.user, id)
  }

  /** Konuyu takip et (yeni cevapta bildirim). */
  @ApiCookieAuth()
  @Put("topics/:id/follow")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Konuyu takip et" })
  async follow(@CurrentSession() session: AuthSession, @Param() { id }: ForumIdParamDto): Promise<void> {
    await this.forum.follow(session.user.id, id, true)
  }

  /** Takibi bırak. */
  @ApiCookieAuth()
  @Delete("topics/:id/follow")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Takibi bırak" })
  async unfollow(@CurrentSession() session: AuthSession, @Param() { id }: ForumIdParamDto): Promise<void> {
    await this.forum.follow(session.user.id, id, false)
  }

  /** Cevap yaz. */
  @ApiCookieAuth()
  @Post("topics/:id/replies")
  @ApiOperation({ summary: "Cevap yaz" })
  @ZodResponse({ status: 201, type: ReplyDto })
  reply(
    @CurrentSession() session: AuthSession,
    @Param() { id }: ForumIdParamDto,
    @Body() { body }: CreateReplyDto
  ): Promise<ReplyDto> {
    return this.forum.reply(session.user, id, body)
  }

  /** Cevabı sil (yazan ya da admin). */
  @ApiCookieAuth()
  @Delete("replies/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Cevabı sil" })
  async removeReply(@CurrentSession() session: AuthSession, @Param() { id }: ForumIdParamDto): Promise<void> {
    await this.forum.removeReply(session.user, id)
  }

  /** "Faydalı" işaretle. */
  @ApiCookieAuth()
  @Put("replies/:id/like")
  @ApiOperation({ summary: "Cevabı beğen (Faydalı)" })
  @ZodResponse({ status: 200, type: LikeResultDto })
  like(@CurrentSession() session: AuthSession, @Param() { id }: ForumIdParamDto): Promise<LikeResultDto> {
    return this.forum.like(session.user.id, id, true)
  }

  /** "Faydalı"yı geri al. */
  @ApiCookieAuth()
  @Delete("replies/:id/like")
  @ApiOperation({ summary: "Beğeniyi geri al" })
  @ZodResponse({ status: 200, type: LikeResultDto })
  unlike(@CurrentSession() session: AuthSession, @Param() { id }: ForumIdParamDto): Promise<LikeResultDto> {
    return this.forum.like(session.user.id, id, false)
  }

  /** En iyi cevabı seç (yalnız soru sahibi; konu "Çözüldü" olur). */
  @ApiCookieAuth()
  @Post("replies/:id/best-answer")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "En iyi cevap" })
  async best(@CurrentSession() session: AuthSession, @Param() { id }: ForumIdParamDto): Promise<void> {
    await this.forum.bestAnswer(session.user, id, true)
  }

  /** En iyi cevap seçimini kaldır. */
  @ApiCookieAuth()
  @Delete("replies/:id/best-answer")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "En iyi cevap seçimini kaldır" })
  async unbest(@CurrentSession() session: AuthSession, @Param() { id }: ForumIdParamDto): Promise<void> {
    await this.forum.bestAnswer(session.user, id, false)
  }
}
