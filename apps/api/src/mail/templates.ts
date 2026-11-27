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

/** Tüm e-postaların ortak çerçevesi: logo, başlık, içerik ve alt bilgi (varsayılan: "siz istemediyseniz…"). */
function layout(locale: MailLocale, title: string, body: string, footer: string = strings[locale].footer) {
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
            <p style="margin:32px 0 0;font-size:12px;color:#575757">${footer}<br>Pati Dostu · iletisim@pati-dostu.com</p>
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

/** Bildirim e-postalarının metinleri (site içi bildirimlerle aynı anlam; web'deki çeviriler messages › Notifications). */
const notificationStrings = {
  tr: {
    footer: "Bildirim tercihlerinizi Profil ve ayarlar sayfasından değiştirebilirsiniz.",
    listing_approved: {
      subject: "İlanınız yayında",
      text: (title: string) => `"${title}" ilanınız onaylandı ve yayına girdi.`,
      button: "İlanı görüntüle",
    },
    listing_rejected: {
      subject: "İlanınız reddedildi",
      text: (title: string) => `"${title}" ilanınız yayınlanmadı.`,
      detail: "Gerekçe",
      button: "İlanlarıma git",
    },
    listing_changes_requested: {
      subject: "İlanınız için düzeltme istendi",
      text: (title: string) => `"${title}" ilanınızın yayınlanması için birkaç düzeltme gerekiyor.`,
      detail: "Admin notu",
      button: "İlanı düzenle",
    },
    favorite_closed: {
      subject: "Favorinizdeki ilan sonuçlandı",
      adopted: (title: string) => `Favorinizdeki "${title}" ilanı sahiplendirildi.`,
      reunited: (title: string) => `Favorinizdeki "${title}" ilanında hayvan sahibine kavuştu.`,
      closed: (title: string) => `Favorinizdeki "${title}" ilanı yayından kaldırıldı.`,
      button: "Favorilerime git",
    },
    new_message: {
      subject: (sender: string) => `${sender} size mesaj gönderdi`,
      text: (sender: string, title: string) => `${sender}, "${title}" ilanı hakkında size mesaj gönderdi.`,
      detail: "Mesaj",
      button: "Mesajı yanıtla",
      note: "Okuyana kadar bu konuşmadan yeni e-posta göndermeyeceğiz.",
    },
    listing_comment: {
      subject: (sender: string) => `${sender} ilanınıza yorum yazdı`,
      text: (sender: string, title: string) => `${sender}, "${title}" ilanınıza yorum yazdı.`,
      detail: "Yorum",
      button: "Yorumu görüntüle",
    },
  },
  en: {
    footer: "You can change your notification preferences on the Profile and settings page.",
    listing_approved: {
      subject: "Your listing is live",
      text: (title: string) => `Your listing "${title}" was approved and is now live.`,
      button: "View listing",
    },
    listing_rejected: {
      subject: "Your listing was rejected",
      text: (title: string) => `Your listing "${title}" wasn't published.`,
      detail: "Reason",
      button: "Go to my listings",
    },
    listing_changes_requested: {
      subject: "Changes requested for your listing",
      text: (title: string) => `Your listing "${title}" needs a few changes before it can be published.`,
      detail: "Admin's note",
      button: "Edit listing",
    },
    favorite_closed: {
      subject: "A listing you saved has an update",
      adopted: (title: string) => `"${title}", a listing you saved, has been adopted.`,
      reunited: (title: string) => `The pet in "${title}", a listing you saved, is back with its family.`,
      closed: (title: string) => `"${title}", a listing you saved, was taken down.`,
      button: "Go to my favorites",
    },
    new_message: {
      subject: (sender: string) => `${sender} sent you a message`,
      text: (sender: string, title: string) => `${sender} sent you a message about "${title}".`,
      detail: "Message",
      button: "Reply",
      note: "We won't email you about this conversation again until you've read it.",
    },
    listing_comment: {
      subject: (sender: string) => `${sender} commented on your listing`,
      text: (sender: string, title: string) => `${sender} commented on your listing "${title}".`,
      detail: "Comment",
      button: "View comment",
    },
  },
} satisfies Record<MailLocale, unknown>

/** Bildirim e-postasının verisi: tür, ilan başlığı, hedef bağlantı ve türe göre ek bilgi. */
export type NotificationMailData =
  | { type: "listing_approved"; title: string; url: string }
  | { type: "listing_rejected"; title: string; url: string; reason: string }
  | { type: "listing_changes_requested"; title: string; url: string; note: string }
  | { type: "favorite_closed"; title: string; url: string; outcome: "adopted" | "reunited" | "closed" }
  | { type: "new_message"; title: string; url: string; senderName: string; preview: string }
  | { type: "listing_comment"; title: string; url: string; senderName: string; preview: string }

/** Bildirim e-postası (ilan sonucu, favori güncellemesi, yeni mesaj, ilan yorumu): kullanıcının dilinde, tek butonlu. */
export function notificationMail(
  locale: MailLocale,
  to: string,
  name: string,
  data: NotificationMailData
): MailMessage {
  const s = strings[locale]
  const n = notificationStrings[locale]
  let subject: string
  let text: string
  let detail: { label: string; value: string } | null = null
  let buttonLabel: string
  switch (data.type) {
    case "listing_approved":
      ;({ subject, button: buttonLabel } = n.listing_approved)
      text = n.listing_approved.text(data.title)
      break
    case "listing_rejected":
      ;({ subject, button: buttonLabel } = n.listing_rejected)
      text = n.listing_rejected.text(data.title)
      detail = { label: n.listing_rejected.detail, value: data.reason }
      break
    case "listing_changes_requested":
      ;({ subject, button: buttonLabel } = n.listing_changes_requested)
      text = n.listing_changes_requested.text(data.title)
      detail = { label: n.listing_changes_requested.detail, value: data.note }
      break
    case "favorite_closed":
      ;({ subject, button: buttonLabel } = n.favorite_closed)
      text = n.favorite_closed[data.outcome](data.title)
      break
    case "new_message":
      subject = n.new_message.subject(data.senderName)
      buttonLabel = n.new_message.button
      text = `${n.new_message.text(data.senderName, data.title)} ${n.new_message.note}`
      detail = { label: n.new_message.detail, value: data.preview }
      break
    case "listing_comment":
      subject = n.listing_comment.subject(data.senderName)
      buttonLabel = n.listing_comment.button
      text = n.listing_comment.text(data.senderName, data.title)
      detail = { label: n.listing_comment.detail, value: data.preview }
      break
  }
  const detailHtml = detail
    ? `<p style="background:#f6e8ff;border-radius:8px;padding:12px 16px"><b>${escapeHtml(detail.label)}:</b> ${escapeHtml(detail.value)}</p>`
    : ""
  return {
    to,
    subject,
    html: layout(
      locale,
      subject,
      `<p>${escapeHtml(s.hello(name))}</p><p>${escapeHtml(text)}</p>${detailHtml}${button(locale, data.url, buttonLabel)}`,
      n.footer
    ),
    text: `${s.hello(name)}\n\n${text}\n${detail ? `\n${detail.label}: ${detail.value}\n` : ""}\n${data.url}\n\n${n.footer}`,
  }
}
