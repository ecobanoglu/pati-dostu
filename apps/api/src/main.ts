// env ilk yüklenir: .env okunur ve doğrulanır, eksikse uygulama açılmadan anlaşılır bir hata verir.
import { env } from "./config/env.js"

import { NestFactory } from "@nestjs/core"
import type { NestExpressApplication } from "@nestjs/platform-express"
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger"
import { toNodeHandler } from "better-auth/node"
import { cleanupOpenApiDoc } from "nestjs-zod"
import { z } from "zod"
import { tr } from "zod/locales"

import { AppModule } from "./app.module.js"
import type { Auth } from "./auth/auth.js"
import { AUTH } from "./auth/auth.tokens.js"

// Zod doğrulama hata mesajları Türkçe
z.config(tr())

const API_PREFIX = "api/v1"

/** API'yi başlatır: önek, CORS, Better Auth uçları, body parser ve Swagger dokümanı. */
async function bootstrap() {
  // Better Auth isteğin ham gövdesini kendisi okur; bu yüzden Nest'in body parser'ı
  // Better Auth bağlandıktan sonra elle açılır.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false })

  app.setGlobalPrefix(API_PREFIX)
  app.enableCors({ origin: env.WEB_URL, credentials: true })
  app.enableShutdownHooks()

  // Kimlik uçları: /api/auth/* (kayıt, giriş, çıkış, e-posta doğrulama, şifre sıfırlama, admin)
  const auth = app.get<Auth>(AUTH)
  app.getHttpAdapter().getInstance().all("/api/auth/*splat", toNodeHandler(auth))

  app.useBodyParser("json", { limit: "1mb" })
  app.useBodyParser("urlencoded", { extended: true, limit: "1mb" })

  const config = new DocumentBuilder()
    .setTitle("Pati Dostu API")
    .setDescription(
      "Pati Dostu web ve mobil istemcilerinin kullandığı REST API.\n\n" +
        "Kimlik uçları Better Auth tarafından `/api/auth/*` altında sunulur: " +
        "[Better Auth uç noktaları](/api/auth/reference)."
    )
    .setVersion("1.0")
    .addCookieAuth("pati-dostu.session_token")
    .build()
  const document = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup(`${API_PREFIX}/docs`, app, cleanupOpenApiDoc(document), {
    jsonDocumentUrl: `${API_PREFIX}/openapi.json`,
  })

  await app.listen(env.PORT)
}

await bootstrap()
