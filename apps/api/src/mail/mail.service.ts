import { Injectable, Logger } from "@nestjs/common"
import nodemailer, { type Transporter } from "nodemailer"
import { Resend } from "resend"

import { env } from "../config/env.js"

export type MailMessage = {
  to: string
  subject: string
  html: string
  text: string
}

/**
 * E-posta gönderimi:
 * - RESEND_API_KEY varsa Resend (yayın),
 * - yoksa SMTP_HOST varsa SMTP (geliştirmede Mailpit, http://localhost:8025),
 * - ikisi de yoksa e-posta konsola yazılır (Docker'sız geliştirme için).
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name)
  private readonly resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : undefined
  private readonly smtp: Transporter | undefined = env.SMTP_HOST
    ? nodemailer.createTransport({ host: env.SMTP_HOST, port: env.SMTP_PORT, secure: false })
    : undefined

  /** E-postayı ayarlı kanaldan gönderir (Resend → SMTP → konsol); Resend hata dönerse istisna fırlatır. */
  async send(message: MailMessage): Promise<void> {
    if (this.resend) {
      const { error } = await this.resend.emails.send({ from: env.EMAIL_FROM, ...message })
      if (error) throw new Error(`Resend: ${error.message}`)
      return
    }
    if (this.smtp) {
      await this.smtp.sendMail({ from: env.EMAIL_FROM, ...message })
      return
    }
    this.logger.log(
      `E-posta (gönderilmedi, SMTP/Resend ayarlı değil)\nKime: ${message.to}\nKonu: ${message.subject}\n${message.text}`
    )
  }
}
