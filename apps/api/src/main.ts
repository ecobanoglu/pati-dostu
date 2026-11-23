import { NestFactory } from "@nestjs/core"
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger"
import { cleanupOpenApiDoc } from "nestjs-zod"
import { z } from "zod"
import { tr } from "zod/locales"

import { AppModule } from "./app.module.js"

// Zod doğrulama hata mesajları Türkçe
z.config(tr())

const API_PREFIX = "api/v1"

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  app.setGlobalPrefix(API_PREFIX)
  app.enableCors({
    origin: process.env.WEB_URL ?? "http://localhost:3000",
    credentials: true,
  })
  app.enableShutdownHooks()

  const config = new DocumentBuilder()
    .setTitle("Pati Dostu API")
    .setDescription("Pati Dostu web ve mobil istemcilerinin kullandığı REST API.")
    .setVersion("1.0")
    .build()
  const document = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup(`${API_PREFIX}/docs`, app, cleanupOpenApiDoc(document), {
    jsonDocumentUrl: `${API_PREFIX}/openapi.json`,
  })

  await app.listen(process.env.PORT ?? 4000)
}

await bootstrap()
