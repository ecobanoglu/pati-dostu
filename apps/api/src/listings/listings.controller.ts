import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Put, Query } from "@nestjs/common"
import { ApiCookieAuth, ApiOperation, ApiTags } from "@nestjs/swagger"
import { ZodResponse } from "nestjs-zod"

import type { AuthSession } from "../auth/auth.js"
import { CurrentSession, Public } from "../auth/decorators.js"
import {
  ListingCardListDto,
  ListingDetailDto,
  ListingIdParamDto,
  ListingImagesDto,
  ListingOwnerStatusDto,
  ListingPageDto,
  ListingPhoneDto,
  ListingQueryDto,
  ListingRefParamDto,
  LocaleQueryDto,
  OwnListingDto,
  SaveListingDto,
} from "./listings.dto.js"
import { ListingsService } from "./listings.service.js"

@ApiTags("listings")
@Controller("listings")
export class ListingsController {
  constructor(private readonly listings: ListingsService) {}

  /** Yayındaki ilanlar: filtreler, arama, sıralama, sayfalama. */
  @Public()
  @Get()
  @ApiOperation({ summary: "İlanlar (yalnızca yayındakiler)" })
  @ZodResponse({ status: 200, type: ListingPageDto })
  list(@Query() query: ListingQueryDto): Promise<ListingPageDto> {
    return this.listings.list(query)
  }

  /** İlan detayı (ilan numarası ya da uuid ile). Sahibi ve admin yayında olmayanı da görür. */
  @Public()
  @Get(":ref")
  @ApiOperation({ summary: "İlan detayı" })
  @ZodResponse({ status: 200, type: ListingDetailDto })
  detail(
    @Param() { ref }: ListingRefParamDto,
    @Query() { locale }: LocaleQueryDto,
    @CurrentSession() session: AuthSession | null
  ): Promise<ListingDetailDto> {
    return this.listings.detail(ref, session?.user ?? null, locale)
  }

  /** İlan sahibinin tam telefon numarası ("Numarayı göster"): giriş gerekir; numara izni yoksa 404. */
  @ApiCookieAuth()
  @Get(":ref/phone")
  @ApiOperation({ summary: "İlan sahibinin telefonu (giriş gerekli)" })
  @ZodResponse({ status: 200, type: ListingPhoneDto })
  phone(@Param() { ref }: ListingRefParamDto, @CurrentSession() session: AuthSession): Promise<ListingPhoneDto> {
    return this.listings.phone(ref, session.user)
  }

  /** Görüntülenme kaydı (detay sayfası açılınca tarayıcıdan bir kez; detay okuması yan etkisiz kalsın diye ayrı). */
  @Public()
  @Post(":ref/views")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Görüntülenme say" })
  async view(@Param() { ref }: ListingRefParamDto, @CurrentSession() session: AuthSession | null): Promise<void> {
    await this.listings.recordView(ref, session?.user ?? null)
  }

  /** Benzer ilanlar (aynı tür ve il, rastgele 4). */
  @Public()
  @Get(":ref/similar")
  @ApiOperation({ summary: "Benzer ilanlar" })
  @ZodResponse({ status: 200, type: ListingCardListDto })
  similar(@Param() { ref }: ListingRefParamDto, @Query() { locale }: LocaleQueryDto): Promise<ListingCardListDto> {
    return this.listings.similar(ref, locale)
  }

  /** Yeni ilan: taslak (submit: false) ya da onaya gönderim (submit: true). */
  @ApiCookieAuth()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "İlan oluştur (taslak ya da onaya gönder)" })
  @ZodResponse({ status: 201, type: OwnListingDto })
  create(
    @CurrentSession() session: AuthSession,
    @Body() body: SaveListingDto,
    @Query() { locale }: LocaleQueryDto
  ): Promise<OwnListingDto> {
    return this.listings.create(session.user, body, locale)
  }

  /** İlanı kaydet: form ilanın tamamını gönderir; onaya gönderim ilanı yeniden onaya düşürür. */
  @ApiCookieAuth()
  @Patch(":id")
  @ApiOperation({ summary: "İlanı düzenle (her düzenleme yeniden onaya düşer)" })
  @ZodResponse({ status: 200, type: OwnListingDto })
  update(
    @CurrentSession() session: AuthSession,
    @Param() { id }: ListingIdParamDto,
    @Body() body: SaveListingDto,
    @Query() { locale }: LocaleQueryDto
  ): Promise<OwnListingDto> {
    return this.listings.update(session.user, id, body, locale)
  }

  /** Fotoğraf sırası ve kapak (ilk fotoğraf). */
  @ApiCookieAuth()
  @Put(":id/images")
  @ApiOperation({ summary: "Fotoğrafları sırala / değiştir" })
  @ZodResponse({ status: 200, type: OwnListingDto })
  images(
    @CurrentSession() session: AuthSession,
    @Param() { id }: ListingIdParamDto,
    @Body() { images }: ListingImagesDto,
    @Query() { locale }: LocaleQueryDto
  ): Promise<OwnListingDto> {
    return this.listings.updateImages(session.user, id, images, locale)
  }

  /** Sahiplendirildi / kapatıldı (yalnızca yayındaki ilan). */
  @ApiCookieAuth()
  @Post(":id/status")
  @ApiOperation({ summary: "Sahiplendirildi / kapatıldı olarak işaretle" })
  @ZodResponse({ status: 200, type: OwnListingDto })
  status(
    @CurrentSession() session: AuthSession,
    @Param() { id }: ListingIdParamDto,
    @Body() { status }: ListingOwnerStatusDto,
    @Query() { locale }: LocaleQueryDto
  ): Promise<OwnListingDto> {
    return this.listings.setOwnerStatus(session.user, id, status, locale)
  }

  /** İlanı sil (yumuşak silme; sahibi ya da admin). */
  @ApiCookieAuth()
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "İlanı sil" })
  async remove(@CurrentSession() session: AuthSession, @Param() { id }: ListingIdParamDto): Promise<void> {
    await this.listings.remove(session.user, id)
  }
}

@ApiTags("listings")
@ApiCookieAuth()
@Controller("me/listings")
export class MyListingsController {
  constructor(private readonly listings: ListingsService) {}

  /** Kullanıcının kendi ilanları (taslak, onayda, yayında, reddedilen…). */
  @Get()
  @ApiOperation({ summary: "İlanlarım" })
  @ZodResponse({ status: 200, type: ListingCardListDto })
  mine(@CurrentSession() session: AuthSession, @Query() { locale }: LocaleQueryDto): Promise<ListingCardListDto> {
    return this.listings.myListings(session.user.id, locale)
  }

  /** Düzenleme formu için kendi ilanı (admin notu ve fotoğraf anahtarlarıyla). */
  @Get(":id")
  @ApiOperation({ summary: "Kendi ilanım (düzenleme için)" })
  @ZodResponse({ status: 200, type: OwnListingDto })
  one(
    @CurrentSession() session: AuthSession,
    @Param() { id }: ListingIdParamDto,
    @Query() { locale }: LocaleQueryDto
  ): Promise<OwnListingDto> {
    return this.listings.getOwn(session.user.id, id, locale)
  }
}
