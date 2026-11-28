import { Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from "@nestjs/common"
import { ApiOperation, ApiTags } from "@nestjs/swagger"
import { ZodResponse } from "nestjs-zod"

import type { AuthSession } from "../auth/auth.js"
import { CurrentSession, Public } from "../auth/decorators.js"
import {
  PostDetailDto,
  PostIdParamDto,
  PostLocaleQueryDto,
  PostPageDto,
  PostSlugParamDto,
  PostsQueryDto,
} from "./posts.dto.js"
import { PostsService } from "./posts.service.js"

@ApiTags("posts")
@Controller("posts")
export class PostsController {
  constructor(private readonly posts: PostsService) {}

  /** Blog / haber listesi (herkese açık): tür, kategori, bölge, sayfa. */
  @Public()
  @Get()
  @ApiOperation({ summary: "Blog ve haber listesi" })
  @ZodResponse({ status: 200, type: PostPageDto })
  list(@Query() query: PostsQueryDto): Promise<PostPageDto> {
    return this.posts.list(query)
  }

  /** Yazı detayı (slug ile): içerik, etiketler, ilgili yazılar. */
  @Public()
  @Get(":slug")
  @ApiOperation({ summary: "Blog yazısı / haber" })
  @ZodResponse({ status: 200, type: PostDetailDto })
  detail(@Param() { slug }: PostSlugParamDto, @Query() { locale }: PostLocaleQueryDto): Promise<PostDetailDto> {
    return this.posts.detail(slug, locale)
  }

  /** Okunma sayacı (web oturum başına bir kez; yazarın kendi bakışı sayılmaz). */
  @Public()
  @Post(":id/views")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Yazı okunma sayacı" })
  async view(@CurrentSession() session: AuthSession | null, @Param() { id }: PostIdParamDto): Promise<void> {
    await this.posts.view(id, session?.user.id ?? null)
  }
}
