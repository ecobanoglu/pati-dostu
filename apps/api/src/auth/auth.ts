import { type Database, account, city, session, user, verification } from "@pati-dostu/db"
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { APIError, createAuthMiddleware } from "better-auth/api"
import { admin, openAPI } from "better-auth/plugins"
import { isStrongPassword, normalizeTurkishMobile } from "@pati-dostu/validators"
import { eq } from "drizzle-orm"

import { ErrorCode } from "../common/errors.js"
import { env } from "../config/env.js"
import type { MailService } from "../mail/mail.service.js"
import { type MailLocale, resetPasswordMail, verifyEmailMail } from "../mail/templates.js"
import { ac, roles } from "./permissions.js"

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const LOCALES = ["tr", "en"] as const

/** Kayıt/profil kuralı ihlali: 400 + istemcinin çevireceği hata kodu (+ Türkçe varsayılan mesaj). */
const invalid = (code: ErrorCode, message: string) => new APIError("BAD_REQUEST", { code, message })

/** Kullanıcının e-posta dili; bilinmiyorsa Türkçe. */
const mailLocale = (u: object): MailLocale => ("locale" in u && u.locale === "en" ? "en" : "tr")

/** Web'deki "E-postanı doğrula" sayfası, dile göre (apps/web/i18n/routing.ts › pathnames ile aynı). */
const VERIFY_EMAIL_PATH: Record<MailLocale, string> = { tr: "/e-posta-dogrula", en: "/en/verify-email" }

/**
 * Doğrulama bağlantısının, doğrulamadan sonra web'e dönmesini sağlar. Web kayıt formu kendi dönüş adresini verir;
 * ama girişte doğrulanmamış kullanıcıya Better Auth'un kendiliğinden gönderdiği e-postada dönüş adresi "/" olur
 * ve kullanıcı API'nin kök adresine düşerdi. Böyle durumlarda dönüş adresi kullanıcının dilindeki doğrulama sayfası yapılır.
 */
export function withWebCallback(url: string, locale: MailLocale): string {
  const link = new URL(url)
  const callback = link.searchParams.get("callbackURL")
  if (!callback || !callback.startsWith(env.WEB_URL)) {
    link.searchParams.set("callbackURL", `${env.WEB_URL}${VERIFY_EMAIL_PATH[locale]}?verified=1`)
  }
  return link.toString()
}

/** Better Auth örneğini oluşturur: e-posta/şifre ve Google girişi, e-posta doğrulama, şifre sıfırlama, roller ve kayıt formu kuralları. */
export function createAuth(db: Database, mail: MailService) {
  return betterAuth({
    appName: "Pati Dostu",
    baseURL: env.BETTER_AUTH_URL,
    basePath: "/api/auth",
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: [env.WEB_URL],

    database: drizzleAdapter(db, {
      provider: "pg",
      schema: { user, session, account, verification },
    }),

    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      resetPasswordTokenExpiresIn: 60 * 60,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) => {
        await mail.send(resetPasswordMail(mailLocale(user), user.email, user.name, url))
      },
    },

    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true,
      autoSignInAfterVerification: true,
      expiresIn: 60 * 60 * 24,
      sendVerificationEmail: async ({ user, url }) => {
        const locale = mailLocale(user)
        await mail.send(verifyEmailMail(locale, user.email, user.name, withWebCallback(url, locale)))
      },
    },

    socialProviders:
      env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
        ? { google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET } }
        : {},

    user: {
      additionalFields: {
        phone: { type: "string", required: false, input: true },
        cityId: { type: "string", required: false, input: true },
        bio: { type: "string", required: false, input: true },
        locale: { type: "string", required: false, defaultValue: "tr", input: true },
        marketingOptIn: { type: "boolean", required: false, defaultValue: false, input: true },
        termsAcceptedAt: { type: "date", required: false, input: false },
      },
    },

    plugins: [
      // Kimlik uçlarının dokümanı: /api/auth/reference
      openAPI(),
      admin({
        ac,
        roles,
        defaultRole: "user",
        adminRoles: ["admin"],
      }),
    ],

    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        const body = (ctx.body ?? {}) as Record<string, unknown>

        if (ctx.path === "/sign-up/email") {
          if (body.acceptTerms !== true) {
            throw invalid(ErrorCode.TERMS_NOT_ACCEPTED, "KVKK Aydınlatma Metni ve Kullanım Şartları kabul edilmelidir.")
          }
          if (typeof body.password !== "string" || !isStrongPassword(body.password)) {
            throw invalid(ErrorCode.PASSWORD_WEAK, "Şifre en az 8 karakter olmalı; harf ve rakam içermelidir.")
          }
        }

        if (ctx.path === "/reset-password" || ctx.path === "/change-password") {
          if (typeof body.newPassword !== "string" || !isStrongPassword(body.newPassword)) {
            throw invalid(ErrorCode.PASSWORD_WEAK, "Şifre en az 8 karakter olmalı; harf ve rakam içermelidir.")
          }
        }

        if (ctx.path === "/sign-up/email" || ctx.path === "/update-user") {
          if (body.phone != null && body.phone !== "" && normalizeTurkishMobile(String(body.phone)) === null) {
            throw invalid(ErrorCode.PHONE_INVALID, "Telefon numarası 05xx xxx xx xx biçiminde olmalı.")
          }
          if (body.locale != null && !(LOCALES as readonly unknown[]).includes(body.locale)) {
            throw invalid(ErrorCode.LOCALE_INVALID, "Desteklenmeyen dil.")
          }
          if (body.cityId != null && body.cityId !== "") {
            const cityId = String(body.cityId)
            const found =
              UUID.test(cityId) &&
              (await db.select({ id: city.id }).from(city).where(eq(city.id, cityId)).limit(1)).length > 0
            if (!found) throw invalid(ErrorCode.CITY_INVALID, "Geçersiz şehir.")
          }
        }
      }),
    },

    databaseHooks: {
      user: {
        create: {
          before: async (data, ctx) => {
            const phone =
              typeof data.phone === "string" && data.phone !== "" ? normalizeTurkishMobile(data.phone) : null
            return {
              data: {
                ...data,
                phone,
                cityId: data.cityId || null,
                // E-posta/şifre kaydında onay yukarıdaki hook'ta zorunlu tutuldu. Google ile ilk girişte
                // termsAcceptedAt boş kalır; web onay ekranını gösterir.
                termsAcceptedAt: ctx?.path === "/sign-up/email" ? new Date() : null,
              },
            }
          },
        },
        update: {
          before: async (data) => {
            if (typeof data.phone === "string") {
              return { data: { ...data, phone: data.phone === "" ? null : normalizeTurkishMobile(data.phone) } }
            }
            return { data }
          },
        },
      },
    },

    advanced: {
      // Yayında web (pati-dostu.com) ve API (api.pati-dostu.com) aynı oturum cookie'sini paylaşır.
      crossSubDomainCookies: env.COOKIE_DOMAIN ? { enabled: true, domain: env.COOKIE_DOMAIN } : undefined,
      cookiePrefix: "pati-dostu",
    },
  })
}

export type Auth = ReturnType<typeof createAuth>
export type AuthSession = NonNullable<Awaited<ReturnType<Auth["api"]["getSession"]>>>
