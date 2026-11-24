import { avatarSchema, deleteAccountSchema, listingStatuses, updateMeSchema } from "@pati-dostu/validators"
import { createZodDto } from "nestjs-zod"
import { z } from "zod"

export const meResponseSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    email: z.email(),
    emailVerified: z.boolean(),
    image: z.string().nullable(),
    role: z.enum(["user", "clinic", "shelter", "admin"]),
    phone: z.string().nullable(),
    cityId: z.uuid().nullable(),
    locale: z.enum(["tr", "en"]),
    marketingOptIn: z.boolean(),
    /** Yeni ilanlarda "Telefonumu göster" varsayılanı. */
    showPhoneByDefault: z.boolean(),
    /** Hakkımda (en fazla 300 karakter). */
    bio: z.string().nullable(),
    /** E-posta/şifre hesabı mı (yalnız Google ile girişte false). */
    hasPassword: z.boolean(),
    /** Boşsa (Google ile ilk giriş) web KVKK onay ekranını gösterir. */
    termsAcceptedAt: z.iso.datetime().nullable(),
  })
  .meta({ id: "Me" })

export class MeResponseDto extends createZodDto(meResponseSchema) {}

/** GET /me/summary: Hesabım › Panel özeti sayıları. */
export const meSummarySchema = z
  .object({
    /** İlan sayısı, duruma göre (tüm durumlar; olmayan 0). */
    listings: z.object(
      Object.fromEntries(listingStatuses.map((s) => [s, z.number().int()])) as Record<
        (typeof listingStatuses)[number],
        z.ZodNumber
      >
    ),
    favorites: z.number().int(),
    /** İlanlarının toplam görüntülenme sayısı. */
    views: z.number().int(),
  })
  .meta({ id: "MeSummary" })

export class MeSummaryDto extends createZodDto(meSummarySchema) {}

/** PATCH /me: profil, telefon, tercihler (alt küme). */
export class UpdateMeDto extends createZodDto(updateMeSchema) {}
/** PUT /me/avatar: yüklenen geçici dosyanın anahtarı. */
export class AvatarDto extends createZodDto(avatarSchema) {}
/** PUT /me/avatar yanıtı: profil fotoğrafının herkese açık adresi. */
export class AvatarResponseDto extends createZodDto(z.object({ image: z.url() }).meta({ id: "AvatarResponse" })) {}
/** DELETE /me: mevcut şifre (Google hesabında boş) + onay. */
export class DeleteAccountDto extends createZodDto(deleteAccountSchema) {}
