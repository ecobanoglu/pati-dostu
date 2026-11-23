import type { routing } from "./i18n/routing"
import type en from "./messages/en.json"
import type tr from "./messages/tr.json"

/*
 * next-intl tip güvenliği: t("HomePage.title") gibi anahtarlar tr.json'a göre denetlenir,
 * olmayan anahtar derleme hatası verir.
 */
declare module "next-intl" {
  interface AppConfig {
    Locale: (typeof routing.locales)[number]
    Messages: typeof tr
  }
}

/*
 * Dil dosyaları aynı anahtarlara sahip olmalı: birinde eksik ya da fazla anahtar varsa
 * `pnpm typecheck` hata verir (çeviri unutulmasın diye).
 */
type SameShape<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false
type AssertTrue<T extends true> = T
export type MessagesInSync = AssertTrue<SameShape<typeof tr, typeof en>>
