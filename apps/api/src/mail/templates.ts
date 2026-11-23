import type { MailMessage } from "./mail.service.js"

/*
 * Geçici, sade şablonlar. İleride packages/emails (React Email) ile marka tasarımına geçirilecek.
 * Renkler globals.css'teki marka değerleridir (e-posta istemcileri CSS değişkeni desteklemez).
 * Metinler kullanıcının diline göre (user.locale) seçilir.
 */

export type MailLocale = "tr" | "en"

/** Şablonlarda kullanılan tüm metinler, dil başına. */
const strings = {
  tr: {
    footer: "Bu e-postayı siz istemediyseniz dikkate almayın.",
    linkFallback: "Buton çalışmazsa bu bağlantıyı tarayıcınıza yapıştırın:",
    hello: (name: string) => `Merhaba ${name},`,
    verify: {
      subject: "E-posta adresinizi doğrulayın",
      title: "E-posta adresinizi doğrulayın",
      intro: "Pati Dostu'ya hoş geldiniz! Hesabınızı etkinleştirmek için e-posta adresinizi doğrulayın.",
      button: "E-postamı doğrula",
      expires: "Bağlantı 24 saat geçerlidir.",
    },
    reset: {
      subject: "Şifre sıfırlama",
      title: "Şifrenizi sıfırlayın",
      intro: "Hesabınız için şifre sıfırlama isteği aldık. Yeni şifre belirlemek için:",
      button: "Yeni şifre belirle",
      expires: "Bağlantı 1 saat geçerlidir.",
    },
  },
  en: {
    footer: "If you didn't request this email, you can safely ignore it.",
    linkFallback: "If the button doesn't work, paste this link into your browser:",
    hello: (name: string) => `Hi ${name},`,
    verify: {
      subject: "Verify your email address",
      title: "Verify your email address",
      intro: "Welcome to Pati Dostu! Please verify your email address to activate your account.",
      button: "Verify my email",
      expires: "This link is valid for 24 hours.",
    },
    reset: {
      subject: "Reset your password",
      title: "Reset your password",
      intro: "We received a request to reset your password. To choose a new one:",
      button: "Set a new password",
      expires: "This link is valid for 1 hour.",
    },
  },
} satisfies Record<MailLocale, unknown>

/** Kullanıcıdan gelen metni HTML'e güvenle yerleştirmek için özel karakterleri kaçışlar. */
const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c)

/** Tüm e-postaların ortak çerçevesi: logo, başlık, içerik ve alt bilgi. */
function layout(locale: MailLocale, title: string, body: string) {
  return `<!doctype html>
<html lang="${locale}">
  <body style="margin:0;background:#f6e8ff;font-family:Arial,Helvetica,sans-serif;color:#575757">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;padding:32px">
          <tr><td>
            <p style="margin:0 0 24px;font-size:20px;font-weight:800;color:#25283d">Pati <span style="color:#6839cc">Dostu</span></p>
            <h1 style="margin:0 0 16px;font-size:22px;color:#25283d">${title}</h1>
            ${body}
            <p style="margin:32px 0 0;font-size:12px;color:#575757">${strings[locale].footer}<br>Pati Dostu · iletisim@pati-dostu.com</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`
}

/** Mor eylem butonu ve buton çalışmazsa kopyalanabilecek düz bağlantı. */
function button(locale: MailLocale, url: string, label: string) {
  return `<p style="margin:24px 0"><a href="${escapeHtml(url)}" style="display:inline-block;background:#6839cc;color:#ffffff;text-decoration:none;font-weight:800;padding:14px 24px;border-radius:8px">${label}</a></p>
<p style="font-size:13px;margin:0">${strings[locale].linkFallback}<br><a href="${escapeHtml(url)}" style="color:#6839cc;word-break:break-all">${escapeHtml(url)}</a></p>`
}

/** Bağlantılı tek eylemli e-posta (doğrulama, sıfırlama) üretir: HTML ve düz metin sürümü. */
function actionMail(locale: MailLocale, kind: "verify" | "reset", to: string, name: string, url: string): MailMessage {
  const s = strings[locale]
  const k = s[kind]
  return {
    to,
    subject: k.subject,
    html: layout(
      locale,
      k.title,
      `<p>${escapeHtml(s.hello(name))}</p><p>${k.intro}</p>${button(locale, url, k.button)}<p style="font-size:13px">${k.expires}</p>`
    ),
    text: `${s.hello(name)}\n\n${k.intro}\n${url}\n\n${k.expires}\n\n${s.footer}`,
  }
}

/** Kayıttan sonra gönderilen e-posta doğrulama iletisi. */
export function verifyEmailMail(locale: MailLocale, to: string, name: string, url: string): MailMessage {
  return actionMail(locale, "verify", to, name, url)
}

/** "Şifremi unuttum" isteğinde gönderilen şifre sıfırlama iletisi. */
export function resetPasswordMail(locale: MailLocale, to: string, name: string, url: string): MailMessage {
  return actionMail(locale, "reset", to, name, url)
}
