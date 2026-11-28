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

/** Şikâyet nedenlerinin e-postadaki adları (web: messages › Reports.reasons). */
const REPORT_REASON_LABELS: Record<MailLocale, Record<string, string>> = {
  tr: {
    sale: "Satış / ücret talebi",
    fake: "Sahte ya da yanıltıcı içerik",
    animal_abuse: "Hayvana kötü muamele",
    inappropriate: "Uygunsuz içerik",
    spam: "Spam",
    misinformation: "Yanlış bilgi",
    harassment: "Taciz ya da hakaret",
    fake_account: "Sahte hesap",
    other: "Diğer",
  },
  en: {
    sale: "Sale / fee request",
    fake: "Fake or misleading content",
    animal_abuse: "Animal abuse",
    inappropriate: "Inappropriate content",
    spam: "Spam",
    misinformation: "Misinformation",
    harassment: "Harassment or insults",
    fake_account: "Fake account",
    other: "Other",
  },
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
    user_warned: {
      subject: "Hesabınızla ilgili uyarı",
      text: (title: string) =>
        `${title ? `"${title}" paylaşımınız` : "Paylaşımınız"} topluluk kurallarına aykırı bulundu. Tekrarlanırsa hesabınız askıya alınabilir.`,
      detail: "Neden",
      button: "Bildirimlere git",
      reasons: REPORT_REASON_LABELS.tr,
    },
    forum_content_removed: {
      subject: "Topluluk paylaşımınız kaldırıldı",
      text: (title: string, kind: "topic" | "reply") =>
        kind === "topic"
          ? `"${title}" konunuz topluluk kurallarına aykırı bulunduğu için kaldırıldı.`
          : `"${title}" konusuna yazdığınız cevap topluluk kurallarına aykırı bulunduğu için kaldırıldı.`,
      detail: "Gerekçe",
      button: "Topluluğa git",
      reasons: REPORT_REASON_LABELS.tr,
    },
    org_application_approved: {
      subject: "Kurumsal başvurunuz onaylandı",
      text: (name: string, type: "clinic" | "shelter") =>
        `"${name}" başvurunuz onaylandı. Hesabınız artık ${type === "clinic" ? "veteriner kliniği" : "barınak"} hesabı ve doğrulanmış rozetle görünüyor.`,
      button: "Hesabıma git",
    },
    org_application_rejected: {
      subject: "Kurumsal başvurunuz onaylanmadı",
      text: (name: string) => `"${name}" başvurunuz onaylanmadı. Bilgileri düzeltip yeniden gönderebilirsiniz.`,
      detail: "Gerekçe",
      button: "Başvuruyu düzenle",
    },
    report_resolved: {
      subject: "Şikayetiniz incelendi",
      action_taken: (title: string) => `Şikayet ettiğiniz "${title}" incelendi ve gerekli işlem yapıldı.`,
      no_violation: (title: string) => `Şikayet ettiğiniz "${title}" incelendi; kural ihlali bulunmadı.`,
      button: "Bildirimlere git",
    },
    listing_closed_by_admin: {
      subject: "İlanınız yayından kaldırıldı",
      text: (title: string) => `"${title}" ilanınız yönetim tarafından yayından kaldırıldı.`,
      button: "İlanlarıma git",
    },
    listing_removed: {
      subject: "İlanınız kaldırıldı",
      text: (title: string) => `"${title}" ilanınız platform kurallarına uymadığı için kaldırıldı.`,
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
    forum_reply: {
      subjectOwn: (sender: string) => `${sender} sorunuza cevap yazdı`,
      subjectFollow: (sender: string) => `${sender} takip ettiğiniz konuya cevap yazdı`,
      text: (sender: string, title: string) => `${sender}, "${title}" konusuna cevap yazdı.`,
      detail: "Cevap",
      button: "Cevabı görüntüle",
    },
    forum_best_answer: {
      subject: "Cevabınız en iyi cevap seçildi",
      text: (title: string) => `"${title}" konusundaki cevabınız en iyi cevap seçildi. Teşekkürler!`,
      button: "Konuyu görüntüle",
    },
    report_created: {
      subject: "Yeni şikayet",
      text: (title: string) => `"${title}" için yeni bir şikayet var.`,
      button: "Bildirimlere git",
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
    user_warned: {
      subject: "A warning about your account",
      text: (title: string) =>
        `${title ? `Your post "${title}"` : "Your post"} was found to break the community rules. If this happens again, your account may be suspended.`,
      detail: "Reason",
      button: "Go to notifications",
      reasons: REPORT_REASON_LABELS.en,
    },
    forum_content_removed: {
      subject: "Your community post was removed",
      text: (title: string, kind: "topic" | "reply") =>
        kind === "topic"
          ? `Your topic "${title}" was removed for breaking the community rules.`
          : `Your reply to "${title}" was removed for breaking the community rules.`,
      detail: "Reason",
      button: "Go to the community",
      reasons: REPORT_REASON_LABELS.en,
    },
    org_application_approved: {
      subject: "Your organization application was approved",
      text: (name: string, type: "clinic" | "shelter") =>
        `Your application for "${name}" was approved. Your account now appears as a ${type === "clinic" ? "veterinary clinic" : "shelter"} with a verified badge.`,
      button: "Go to my account",
    },
    org_application_rejected: {
      subject: "Your organization application wasn't approved",
      text: (name: string) =>
        `Your application for "${name}" wasn't approved. You can correct the details and resubmit.`,
      detail: "Reason",
      button: "Edit application",
    },
    report_resolved: {
      subject: "Your report was reviewed",
      action_taken: (title: string) => `"${title}", which you reported, was reviewed and action was taken.`,
      no_violation: (title: string) => `"${title}", which you reported, was reviewed; no rule violation was found.`,
      button: "Go to notifications",
    },
    listing_closed_by_admin: {
      subject: "Your listing was unpublished",
      text: (title: string) => `Your listing "${title}" was unpublished by the moderators.`,
      button: "Go to my listings",
    },
    listing_removed: {
      subject: "Your listing was removed",
      text: (title: string) => `Your listing "${title}" was removed because it doesn't follow the platform rules.`,
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
    forum_reply: {
      subjectOwn: (sender: string) => `${sender} answered your question`,
      subjectFollow: (sender: string) => `${sender} replied to a topic you follow`,
      text: (sender: string, title: string) => `${sender} replied to "${title}".`,
      detail: "Reply",
      button: "View reply",
    },
    forum_best_answer: {
      subject: "Your answer was chosen as the best answer",
      text: (title: string) => `Your answer in "${title}" was chosen as the best answer. Thank you!`,
      button: "View topic",
    },
    report_created: {
      subject: "New report",
      text: (title: string) => `There's a new report about "${title}".`,
      button: "Go to notifications",
    },
  },
} satisfies Record<MailLocale, unknown>

/** Bildirim e-postasının verisi: tür, ilan başlığı, hedef bağlantı ve türe göre ek bilgi. */
export type NotificationMailData =
  | { type: "listing_approved"; title: string; url: string }
  | { type: "listing_rejected"; title: string; url: string; reason: string }
  | { type: "listing_changes_requested"; title: string; url: string; note: string }
  | { type: "listing_closed_by_admin"; title: string; url: string }
  | { type: "user_warned"; title: string; url: string; reason: string }
  | { type: "report_resolved"; title: string; url: string; outcome: "action_taken" | "no_violation" }
  | { type: "org_application_approved"; title: string; url: string; orgType: "clinic" | "shelter" }
  | {
      type: "forum_content_removed"
      title: string
      url: string
      kind: "topic" | "reply"
      reason: string
      note: string | null
    }
  | { type: "org_application_rejected"; title: string; url: string; reason: string }
  | { type: "listing_removed"; title: string; url: string; reason: string }
  | { type: "favorite_closed"; title: string; url: string; outcome: "adopted" | "reunited" | "closed" }
  | { type: "new_message"; title: string; url: string; senderName: string; preview: string }
  | { type: "listing_comment"; title: string; url: string; senderName: string; preview: string }
  | { type: "forum_reply"; title: string; url: string; senderName: string; preview: string; own: boolean }
  | { type: "forum_best_answer"; title: string; url: string }
  | { type: "report_created"; title: string; url: string }

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
    case "user_warned":
      ;({ subject, button: buttonLabel } = n.user_warned)
      text = n.user_warned.text(data.title)
      detail = { label: n.user_warned.detail, value: n.user_warned.reasons[data.reason] ?? data.reason }
      break
    case "forum_content_removed": {
      ;({ subject, button: buttonLabel } = n.forum_content_removed)
      text = n.forum_content_removed.text(data.title, data.kind)
      const reason = n.forum_content_removed.reasons[data.reason] ?? data.reason
      detail = { label: n.forum_content_removed.detail, value: data.note ? `${reason} — ${data.note}` : reason }
      break
    }
    case "org_application_approved":
      ;({ subject, button: buttonLabel } = n.org_application_approved)
      text = n.org_application_approved.text(data.title, data.orgType)
      break
    case "org_application_rejected":
      ;({ subject, button: buttonLabel } = n.org_application_rejected)
      text = n.org_application_rejected.text(data.title)
      detail = { label: n.org_application_rejected.detail, value: data.reason }
      break
    case "report_resolved":
      ;({ subject, button: buttonLabel } = n.report_resolved)
      text = n.report_resolved[data.outcome](data.title)
      break
    case "listing_closed_by_admin":
      ;({ subject, button: buttonLabel } = n.listing_closed_by_admin)
      text = n.listing_closed_by_admin.text(data.title)
      break
    case "listing_removed":
      ;({ subject, button: buttonLabel } = n.listing_removed)
      text = n.listing_removed.text(data.title)
      detail = { label: n.listing_removed.detail, value: data.reason }
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
    case "forum_reply":
      subject = data.own ? n.forum_reply.subjectOwn(data.senderName) : n.forum_reply.subjectFollow(data.senderName)
      buttonLabel = n.forum_reply.button
      text = n.forum_reply.text(data.senderName, data.title)
      detail = { label: n.forum_reply.detail, value: data.preview }
      break
    case "forum_best_answer":
      ;({ subject, button: buttonLabel } = n.forum_best_answer)
      text = n.forum_best_answer.text(data.title)
      break
    case "report_created":
      ;({ subject, button: buttonLabel } = n.report_created)
      text = n.report_created.text(data.title)
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
