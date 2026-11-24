import { Controller, Delete, Get, HttpCode, HttpStatus, Param, Put, Query } from "@nestjs/common"
import { ApiCookieAuth, ApiOperation, ApiTags } from "@nestjs/swagger"
import { ZodResponse } from "nestjs-zod"

import type { AuthSession } from "../auth/auth.js"
import { CurrentSession } from "../auth/decorators.js"
import { ListingCardListDto, ListingRefParamDto, LocaleQueryDto } from "../listings/listings.dto.js"
import { FavoriteIdsDto } from "./favorites.dto.js"
import { FavoritesService } from "./favorites.service.js"

@ApiTags("favorites")
@ApiCookieAuth()
@Controller("listings")
export class FavoritesController {
  constructor(private readonly favorites: FavoritesService) {}

  /** İlanı favoriye ekler (yalnızca yayındaki ilan; tekrar çağrılabilir). */
  @Put(":ref/favorite")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Favoriye ekle" })
  async add(@Param() { ref }: ListingRefParamDto, @CurrentSession() session: AuthSession): Promise<void> {
    await this.favorites.add(session.user.id, ref)
  }

  /** İlanı favoriden çıkarır (favoride değilse de 204). */
  @Delete(":ref/favorite")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Favoriden çıkar" })
  async remove(@Param() { ref }: ListingRefParamDto, @CurrentSession() session: AuthSession): Promise<void> {
    await this.favorites.remove(session.user.id, ref)
  }
}

@ApiTags("favorites")
@ApiCookieAuth()
@Controller("me/favorites")
export class MyFavoritesController {
  constructor(private readonly favorites: FavoritesService) {}

  /** Favori ilanlarım: yayındakiler ve sahiplendirilen/kapatılanlar, en son eklenen önce. */
  @Get()
  @ApiOperation({ summary: "Favori ilanlarım" })
  @ZodResponse({ status: 200, type: ListingCardListDto })
  list(@Query() { locale }: LocaleQueryDto, @CurrentSession() session: AuthSession): Promise<ListingCardListDto> {
    return this.favorites.list(session.user.id, locale)
  }

  /** Favorideki ilanların numaraları (liste/detay sayfalarındaki kalpler için hafif istek). */
  @Get("ids")
  @ApiOperation({ summary: "Favorideki ilan numaraları" })
  @ZodResponse({ status: 200, type: FavoriteIdsDto })
  async ids(@CurrentSession() session: AuthSession): Promise<FavoriteIdsDto> {
    return { listingNos: await this.favorites.listingNos(session.user.id) }
  }
}
