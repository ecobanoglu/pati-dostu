import { getLocale } from "next-intl/server"

import { getPathname, redirect } from "@/i18n/navigation"
import type { Locale } from "@/i18n/routing"
import { getListing } from "@/lib/listings"
import { apiServer } from "@/lib/server-api"
import { getCurrentUser } from "@/lib/session"

import { Inbox } from "./inbox"
import type { Conversation, ConversationPage, Draft, MessagePage } from "./types"

/**
 * Mesajlar sayfasının verisi (oturumla, önbelleksiz): konuşma listesinin ilk sayfası; `?c={id}` varsa o konuşma ve
 * son mesajları; `?ilan={no}` varsa (ilan detayındaki "Mesaj gönder") o ilandaki konuşmaya yönlendirir, yoksa taslak
 * hazırlar. Oturum yoksa girişe yönlendirir (adres sorgusuyla birlikte döner). cookies() okuduğu için <Suspense>
 * içinde render edilir.
 */
export async function Messages({ c, ilan }: { c?: string; ilan?: string }) {
  const locale = (await getLocale()) as Locale
  const user = await getCurrentUser()
  if (!user) {
    const query = c ? { c } : ilan ? { ilan } : undefined
    return redirect({
      href: {
        pathname: "/sign-in",
        query: { next: getPathname({ href: { pathname: "/account/messages", query }, locale }) },
      },
      locale,
    })
  }

  const listingNo = ilan && /^\d{6,10}$/.test(ilan) ? Number(ilan) : null
  let draft: Draft | null = null
  let notice: "missing" | "listingUnavailable" | null = null
  if (!c && ilan) {
    const listing = listingNo ? await getListing(listingNo, locale) : null
    // Yayında olmayan (ya da olmayan) ilana yeni konuşma açılmaz.
    if (!listing) notice = "listingUnavailable"
    else {
      const existing = await apiServer<ConversationPage>(`/conversations?listingId=${listing.id}&limit=1`)
      const found = existing?.items[0]
      if (found) {
        return redirect({ href: { pathname: "/account/messages", query: { c: found.id } }, locale })
      }
      draft = {
        listing: {
          id: listing.id,
          listingNo: listing.listingNo,
          slug: listing.slug,
          title: listing.title,
          status: listing.status,
          deleted: false,
          coverUrl: listing.coverUrl,
        },
        owner: { name: listing.owner.name, image: listing.owner.image },
        blocked: listing.owner.id === user.id ? "own" : null,
      }
    }
  }

  const valid = c && /^[0-9a-f-]{36}$/i.test(c) ? c : null
  const [page, selected, thread] = await Promise.all([
    apiServer<ConversationPage>("/conversations?limit=20"),
    valid ? apiServer<Conversation>(`/conversations/${valid}`) : null,
    valid ? apiServer<MessagePage>(`/conversations/${valid}/messages?limit=30`) : null,
  ])

  return (
    <Inbox
      initial={page ?? { items: [], nextCursor: null }}
      initialSelected={selected}
      initialThread={thread}
      draft={draft}
      notice={c && !selected ? "missing" : notice}
      now={new Date().toISOString()}
    />
  )
}

/** Yüklenirken: liste + konuşma iskeleti. */
export function MessagesFallback() {
  return (
    <div
      aria-hidden="true"
      className="overflow-hidden rounded-card border border-border bg-background lg:grid lg:h-[min(760px,calc(100dvh-9rem))] lg:min-h-[560px] lg:grid-cols-[300px_minmax(0,1fr)]"
    >
      <div className="grid content-start gap-3 p-4 lg:border-r lg:border-border">
        <div className="h-11 rounded-xl bg-smoke-2" />
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex gap-3 py-2">
            <div className="size-13 animate-pulse rounded-xl bg-smoke-2 motion-reduce:animate-none" />
            <div className="grid flex-1 content-start gap-2">
              <div className="h-4 w-24 rounded bg-smoke-2" />
              <div className="h-3 w-40 rounded bg-smoke-2" />
            </div>
          </div>
        ))}
      </div>
      <div className="max-lg:hidden" />
    </div>
  )
}
