import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from "@nestjs/common"
import { ApiCookieAuth, ApiOperation, ApiTags } from "@nestjs/swagger"
import { ZodResponse } from "nestjs-zod"

import type { AuthSession } from "../auth/auth.js"
import { CurrentSession, RequirePermissions } from "../auth/decorators.js"
import { AdminPostsService } from "./admin-posts.service.js"
import {
  AdminPostDetailDto,
  AdminPostOptionsDto,
  AdminPostPageDto,
  AdminPostsQueryDto,
  BulkPostsDto,
  BulkPostsResultDto,
  PostIdParamDto,
  PostLocaleQueryDto,
  SavePostDto,
} from "./posts.dto.js"

/** Blog ve haber yönetimi (yalnız admin — `post: publish` yetkisi). Arayüz: /admin/yazilar. */
@ApiTags("admin")
@ApiCookieAuth()
@RequirePermissions({ post: ["publish"] })
@Controller("admin/posts")
export class AdminPostsController {
  constructor(private readonly posts: AdminPostsService) {}

  /** Yazı listesi: tür, durum, kategori, başlıkta arama, sıralama, sayfa; sekme sayılarıyla. */
  @Get()
  @ApiOperation({ summary: "Blog / haber listesi (admin)" })
  @ZodResponse({ status: 200, type: AdminPostPageDto })
  list(@Query() query: AdminPostsQueryDto): Promise<AdminPostPageDto> {
    return this.posts.list(query)
  }

  /** Editör seçenekleri: kategoriler ve etiket önerileri. */
  @Get("options")
  @ApiOperation({ summary: "Editör seçenekleri (kategoriler, etiketler)" })
  @ZodResponse({ status: 200, type: AdminPostOptionsDto })
  options(@Query() { locale }: PostLocaleQueryDto): Promise<AdminPostOptionsDto> {
    return this.posts.options(locale)
  }

  /** Toplu işlem: seçilenleri yayından kaldır ya da sil. */
  @Post("bulk")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Toplu yayından kaldır / sil" })
  @ZodResponse({ status: 200, type: BulkPostsResultDto })
  bulk(@CurrentSession() session: AuthSession, @Body() body: BulkPostsDto): Promise<BulkPostsResultDto> {
    return this.posts.bulk(session.user, body)
  }

  /** Editör için yazının tamamı. */
  @Get(":id")
  @ApiOperation({ summary: "Yazı (editör)" })
  @ZodResponse({ status: 200, type: AdminPostDetailDto })
  get(@Param() { id }: PostIdParamDto): Promise<AdminPostDetailDto> {
    return this.posts.get(id)
  }

  /** Yeni yazı: taslak, yayın ya da planlı yayın. */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Yeni yazı" })
  @ZodResponse({ status: 201, type: AdminPostDetailDto })
  create(@CurrentSession() session: AuthSession, @Body() body: SavePostDto): Promise<AdminPostDetailDto> {
    return this.posts.create(session.user, body)
  }

  /** Yazıyı kaydeder (tam kayıt; durum değişikliği dahil). */
  @Patch(":id")
  @ApiOperation({ summary: "Yazıyı güncelle" })
  @ZodResponse({ status: 200, type: AdminPostDetailDto })
  update(
    @CurrentSession() session: AuthSession,
    @Param() { id }: PostIdParamDto,
    @Body() body: SavePostDto
  ): Promise<AdminPostDetailDto> {
    return this.posts.update(session.user, id, body)
  }

  /** Yazıyı siler (yumuşak). */
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Yazıyı sil" })
  async remove(@CurrentSession() session: AuthSession, @Param() { id }: PostIdParamDto): Promise<void> {
    await this.posts.remove(session.user, id)
  }
}
