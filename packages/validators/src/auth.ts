import { z } from "zod"

import { ValidationCode as C } from "./codes.js"

/** Şifre kuralı (kayıt formu): 8–128 karakter, en az bir harf ve bir rakam. */
const PASSWORD_RULE = /^(?=.*\p{L})(?=.*\d).{8,128}$/u

/** Şifre kurala uyuyor mu? API (Better Auth hook) ve formlar aynı kuralı kullanır. */
export function isStrongPassword(value: string): boolean {
  return PASSWORD_RULE.test(value)
}

/**
 * Şifre gücü 0–4 (formdaki 4 çubuklu gösterge için). Kurala uymayan şifre en fazla 1 alır;
 * uzunluk, büyük/küçük harf karışımı ve sembol puanı artırır.
 */
export function passwordStrength(value: string): 0 | 1 | 2 | 3 | 4 {
  if (!value) return 0
  if (!isStrongPassword(value)) return 1
  let score = 2
  if (value.length >= 12) score++
  if (/[^\p{L}\d]/u.test(value) || (/\p{Lu}/u.test(value) && /\p{Ll}/u.test(value))) score++
  return Math.min(score, 4) as 2 | 3 | 4
}

/** "0532 123 45 67", "+90 532…", "532…" → "+905321234567"; Türkiye cep numarası değilse null. */
export function normalizeTurkishMobile(input: string): string | null {
  const digits = input.replace(/[\s()-]/g, "")
  const match = /^(?:\+?90|0)?(5\d{9})$/.exec(digits)
  return match ? `+90${match[1]}` : null
}

const email = z.string().trim().min(1, C.REQUIRED).pipe(z.email(C.EMAIL_INVALID))

const password = z.string().refine(isStrongPassword, C.PASSWORD_WEAK)

/** Giriş formu. Burada şifre kuralı denetlenmez: eski kurala göre konmuş şifreler de girebilmeli. */
export const signInSchema = z.object({
  email,
  password: z.string().min(1, C.REQUIRED),
  rememberMe: z.boolean(),
})
export type SignInInput = z.infer<typeof signInSchema>

/** Kayıt formu (tasarım: 01-sayfalar/10-kayit-ol). Telefon ve şehir isteğe bağlı; boş metin "girilmedi" sayılır. */
export const signUpSchema = z.object({
  name: z.string().trim().min(2, C.NAME_TOO_SHORT).max(80, C.NAME_TOO_LONG),
  email,
  phone: z
    .string()
    .trim()
    .refine((v) => v === "" || normalizeTurkishMobile(v) !== null, C.PHONE_INVALID),
  cityId: z.union([z.literal(""), z.uuid(C.CITY_INVALID)]),
  password,
  acceptTerms: z.literal(true, C.TERMS_NOT_ACCEPTED),
  marketingOptIn: z.boolean(),
})
export type SignUpInput = z.infer<typeof signUpSchema>

/** "Şifremi unuttum" formu. */
export const forgotPasswordSchema = z.object({ email })
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>

/** Yeni şifre belirleme formu: iki alan aynı olmalı. */
export const resetPasswordSchema = z
  .object({
    newPassword: password,
    confirmPassword: z.string().min(1, C.REQUIRED),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: C.PASSWORDS_DO_NOT_MATCH,
    path: ["confirmPassword"],
  })
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
