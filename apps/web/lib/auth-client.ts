"use client"

import { createAuthClient } from "better-auth/react"

import { PUBLIC_API_URL } from "./api"

/**
 * Tarayıcıdaki Better Auth istemcisi: giriş, kayıt, çıkış, şifre sıfırlama istekleri API'nin /api/auth/* uçlarına gider.
 * API ayrı bir adreste olduğu için cookie'ler `credentials: "include"` ile gönderilir.
 */
export const authClient = createAuthClient({
  baseURL: PUBLIC_API_URL,
  basePath: "/api/auth",
  fetchOptions: { credentials: "include" },
})
