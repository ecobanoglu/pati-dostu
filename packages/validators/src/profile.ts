import { z } from "zod"

import { isStrongPassword, normalizeTurkishMobile } from "./auth.js"
import { ValidationCode as C } from "./codes.js"

/** "Hakkımda" metninin en fazla uzunluğu (tasarım: "38 / 300"). */
export const BIO_MAX = 300

/** Profil bilgileri formu (Profil ve ayarlar › Profil bilgileri). Boş şehir / hakkımda "" olarak gelir. */
export const profileSchema = z.object({
  name: z.string().trim().min(2, C.NAME_TOO_SHORT).max(80, C.NAME_TOO_LONG),
  cityId: z.union([z.literal(""), z.uuid(C.CITY_INVALID)]),
  bio: z.string().trim().max(BIO_MAX, C.BIO_TOO_LONG),
})
export type ProfileInput = z.infer<typeof profileSchema>

/** İletişim formu: telefon (05xx xxx xx xx; boş bırakılabilir). E-posta bu formda değiştirilmez. */
export const contactSchema = z.object({
  phone: z
    .string()
    .trim()
    .refine((v) => v === "" || normalizeTurkishMobile(v) !== null, C.PHONE_INVALID),
})
export type ContactInput = z.infer<typeof contactSchema>

/** Tercihler: haftalık bülten e-postası ve yeni ilanlarda telefonun varsayılan olarak gösterilmesi. */
export const preferencesSchema = z.object({
  marketingOptIn: z.boolean(),
  showPhoneByDefault: z.boolean(),
})
export type PreferencesInput = z.infer<typeof preferencesSchema>

/** PATCH /me gövdesi: yukarıdaki formların herhangi bir alt kümesi (her bölüm kendi alanlarını gönderir). */
export const updateMeSchema = profileSchema.extend(contactSchema.shape).extend(preferencesSchema.shape).partial()
export type UpdateMeInput = z.infer<typeof updateMeSchema>

/** Şifre değiştirme formu. Mevcut şifre burada kurala göre denetlenmez (eski kuralla konmuş olabilir). */
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, C.REQUIRED),
  newPassword: z.string().refine(isStrongPassword, C.PASSWORD_WEAK),
})
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>

/**
 * DELETE /me gövdesi: şifreli hesapta mevcut şifre zorunlu; yalnız Google ile giriş yapan hesapta boş gelir ve
 * onay olarak `confirm: true` yeterlidir (API hangisinin gerektiğini hesaptan bilir).
 */
export const deleteAccountSchema = z.object({
  password: z.string().max(128),
  confirm: z.literal(true, C.REQUIRED),
})
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>

/** PUT /me/avatar gövdesi: tarayıcının yüklediği geçici dosyanın anahtarı (tmp/avatars/{userId}/…). */
export const avatarSchema = z.object({ key: z.string().min(1).max(200) })
export type AvatarInput = z.infer<typeof avatarSchema>
