import { Controller, Get, Param, Query } from "@nestjs/common"
import { ApiOperation, ApiTags } from "@nestjs/swagger"
import { ZodResponse } from "nestjs-zod"

import { Public } from "../auth/decorators.js"
import { PostDetailDto, PostLocaleQueryDto, PostPageDto, PostSlugParamDto, PostsQueryDto } from "./posts.dto.js"
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
}
