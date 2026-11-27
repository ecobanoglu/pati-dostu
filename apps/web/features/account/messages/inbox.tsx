"use client"

import { MessagesSquare, Search } from "lucide-react"
import { useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { type MouseEvent, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react"

import { PdMark } from "@/components/brand/logo"
import { buttonVariants } from "@/components/ui/button"
import { Link } from "@/i18n/navigation"
import { apiFetch } from "@/lib/api-browser"
import { useErrorMessage } from "@/lib/errors"
import { refreshUnreadMessages } from "@/lib/use-unread-messages"
import { cn } from "@/lib/utils"

import { ChatPanel } from "./chat-panel"
import { ConversationItem } from "./conversation-item"
import type { Conversation, ConversationPage, Draft, Message, MessagePage } from "./types"

/** Açık konuşma bu aralıkla yeni mesajları sorar (karar: polling; sekme arka plandayken sormaz). */
const THREAD_POLL_MS = 5_000
/** Konuşma listesi (son mesajlar, okunmamış sayıları) bu aralıkla tazelenir. */
const LIST_POLL_MS = 30_000
/** Bir seferde yüklenen mesaj sayısı. */
const PAGE = 30

type Thread = { messages: Message[]; hasMore: boolean; readUpTo: string | null; loadingOlder: boolean }

/** Ekran masaüstü genişliğinde mi (lg). Sunucuda ve ilk çizimde masaüstü varsayılır. */
function useIsDesktop() {
  const [desktop, setDesktop] = useState(true)
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)")
    const update = () => setDesktop(mq.matches)
    update()
    mq.addEventListener("change", update)
    return () => mq.removeEventListener("change", update)
  }, [])
  return desktop
}

/** Sekme görünürken `fn`'i aralıkla çalıştırır; sekmeye dönünce hemen bir kez çalıştırır. */
function usePolling(fn: () => void, ms: number, enabled: boolean) {
  const saved = useRef(fn)
  useEffect(() => {
    saved.current = fn
  })
  useEffect(() => {
    if (!enabled) return
    const tick = () => {
      if (document.visibilityState === "visible") saved.current()
    }
    const timer = setInterval(tick, ms)
    document.addEventListener("visibilitychange", tick)
    return () => {
      clearInterval(timer)
      document.removeEventListener("visibilitychange", tick)
    }
  }, [ms, enabled])
}

/** API sayfasını konuşma durumuna çevirir. */
function toThread(page: MessagePage): Thread {
  return { messages: page.items, hasMore: page.hasMore, readUpTo: page.readUpTo, loadingOlder: false }
}

/** Yeni öğeleri listenin başına alır, aynı id'lileri tekrar etmez. */
function mergeFirstPage(page: Conversation[], current: Conversation[]): Conversation[] {
  const ids = new Set(page.map((c) => c.id))
  return [...page, ...current.filter((c) => !ids.has(c.id))]
}

/**
 * Mesajlar (tasarım 01-sayfalar/12): solda konuşma listesi (arama, okunmamış sayıları), sağda açık konuşma. Açık
 * konuşma adreste `?c={id}`; seçim sayfayı yenilemeden yapılır (history.pushState — geri tuşu çalışır). İlan
 * detayından gelen `?ilan={no}` taslağı ilk mesajla konuşmaya dönüşür. Mobilde liste görünür, konuşma tam ekran açılır
 * (karar). Polling: açık konuşma 5 sn, liste 30 sn; yeni gelen mesaj ekrandaysa okundu işaretlenir.
 */
export function Inbox({
  initial,
  initialSelected,
  initialThread,
  draft,
  notice,
  now: nowIso,
}: {
  initial: ConversationPage
  /** Adresteki konuşma (listede olmayabilir: eski bir konuşmaya bağlantıyla gelindi). */
  initialSelected: Conversation | null
  initialThread: MessagePage | null
  draft: Draft | null
  /** Adresteki konuşma bulunamadı ya da ilan yeni konuşmaya kapalı (yayında değil). */
  notice: "missing" | "listingUnavailable" | null
  now: string
}) {
  const t = useTranslations("Messages")
  const errorMessage = useErrorMessage()
  const params = useSearchParams()
  const isDesktop = useIsDesktop()
  const now = useMemo(() => new Date(nowIso), [nowIso])

  // Adresteki konuşma listede yoksa eklenir; açıldığı için okunmamış sayısı 0 gösterilir (aşağıda okundu işaretlenir).
  const [items, setItems] = useState(() => {
    const list =
      initialSelected && !initial.items.some((c) => c.id === initialSelected.id)
        ? [...initial.items, initialSelected]
        : initial.items
    return list.map((c) => (c.id === initialSelected?.id ? { ...c, unreadCount: 0 } : c))
  })
  const [cursor, setCursor] = useState(initial.nextCursor)
  const [query, setQuery] = useState("")
  /** Arama sonuçları ve ait oldukları sorgu (kutu boşken tam liste gösterilir). */
  const [results, setResults] = useState<{ q: string; items: Conversation[] } | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [threads, setThreads] = useState<Record<string, Thread>>(() =>
    initialSelected && initialThread ? { [initialSelected.id]: toThread(initialThread) } : {}
  )
  /** Gönderim hatası ve ait olduğu konuşma (başka konuşmaya geçince gösterilmez). */
  const [failure, setFailure] = useState<{ id: string; text: string } | null>(null)
  const openedFromList = useRef(false)

  const selectedId = params.get("c")
  const draftOpen = !selectedId && Boolean(params.get("ilan")) && draft !== null
  const selected = selectedId ? (items.find((c) => c.id === selectedId) ?? null) : null
  const thread = selectedId ? threads[selectedId] : undefined
  const panelOpen = Boolean(selected) || draftOpen

  // Mobilde konuşma tam ekranken arkadaki sayfa kaymasın.
  useEffect(() => {
    if (isDesktop || !panelOpen) return
    const root = document.documentElement
    const previous = root.style.overflow
    root.style.overflow = "hidden"
    return () => {
      root.style.overflow = previous
    }
  }, [isDesktop, panelOpen])

  /** Konuşmayı okundu işaretler (sayılar hemen düşer, rozet API'den tazelenir). */
  const markRead = useCallback(async (id: string) => {
    setItems((list) => list.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c)))
    await apiFetch(`/conversations/${id}/read`, { method: "POST" })
    void refreshUnreadMessages()
  }, [])

  /** Konuşmanın mesajlarını (en yeni 30) yükler. */
  const loadThread = useCallback(async (id: string) => {
    const { data } = await apiFetch<MessagePage>(`/conversations/${id}/messages?limit=${PAGE}`)
    if (data) setThreads((all) => ({ ...all, [id]: toThread(data) }))
  }, [])

  // Sayfa bir konuşmayla açıldıysa (bağlantı, bildirim, e-posta) onu okundu işaretle.
  useEffect(() => {
    if (initialSelected && initialSelected.unreadCount > 0) {
      void apiFetch(`/conversations/${initialSelected.id}/read`, { method: "POST" }).then(() => refreshUnreadMessages())
    }
  }, [initialSelected])

  /** Konuşma açılırken: mesajları yoksa yükler, okunmamışı varsa okundu işaretler. */
  function open(id: string) {
    if (!threads[id]) void loadThread(id)
    if ((items.find((c) => c.id === id)?.unreadCount ?? 0) > 0) void markRead(id)
  }

  // Tarayıcıda geri/ileri ile açılan konuşma henüz yüklenmediyse hemen yükle.
  const openRef = useRef(open)
  useEffect(() => {
    openRef.current = open
  })
  useEffect(() => {
    const onPop = () => {
      const id = new URLSearchParams(window.location.search).get("c")
      if (id) openRef.current(id)
    }
    window.addEventListener("popstate", onPop)
    return () => window.removeEventListener("popstate", onPop)
  }, [])

  /** Açık konuşmanın yeni mesajlarını sorar (after = son gelen mesaj). */
  const pollThread = useCallback(async () => {
    if (!selectedId) return
    const current = threads[selectedId]
    const lastId = current?.messages.filter((m) => !m.pending).at(-1)?.id
    if (!current || !lastId) return void loadThread(selectedId)
    const { data } = await apiFetch<MessagePage>(`/conversations/${selectedId}/messages?after=${lastId}&limit=100`)
    if (!data) return
    setThreads((all) => {
      const th = all[selectedId]
      if (!th) return all
      const known = new Set(th.messages.map((m) => m.id))
      const fresh = data.items.filter((m) => !known.has(m.id))
      return { ...all, [selectedId]: { ...th, messages: [...th.messages, ...fresh], readUpTo: data.readUpTo } }
    })
    if (data.items.some((m) => !m.mine)) {
      const lastIncoming = data.items.filter((m) => !m.mine).at(-1)!
      setItems((list) =>
        mergeFirstPage(
          list
            .filter((c) => c.id === selectedId)
            .map((c) => ({
              ...c,
              lastMessage: { body: lastIncoming.body, mine: false, createdAt: lastIncoming.createdAt, readAt: null },
              lastMessageAt: lastIncoming.createdAt,
            })),
          list
        )
      )
      void markRead(selectedId)
    }
  }, [selectedId, threads, loadThread, markRead])

  /** Listenin ilk sayfasını tazeler (aramadayken arama sonuçlarını). */
  const pollList = useCallback(async () => {
    const q = query.trim()
    const { data } = await apiFetch<ConversationPage>(
      `/conversations?limit=20${q ? `&q=${encodeURIComponent(q)}` : ""}`
    )
    if (!data) return
    // Açık konuşmanın sayısı ekranda okunduğu için 0 kalır.
    const items = data.items.map((c) => (c.id === selectedId ? { ...c, unreadCount: 0 } : c))
    if (q) setResults({ q, items })
    else setItems((list) => mergeFirstPage(items, list))
  }, [query, selectedId])

  usePolling(() => void pollThread(), THREAD_POLL_MS, Boolean(selectedId))
  usePolling(() => void pollList(), LIST_POLL_MS, true)

  // Arama: yazmayı bırakınca (300 ms) sunucuda arar; kutu boşalınca tam listeye döner.
  useEffect(() => {
    const q = query.trim()
    if (!q) return
    const timer = setTimeout(async () => {
      const { data } = await apiFetch<ConversationPage>(`/conversations?limit=20&q=${encodeURIComponent(q)}`)
      setResults({ q, items: data?.items ?? [] })
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  /** Listeyi bağlantıyla değil yerinde açar (sayfa yenilenmez); yeni sekmede açma vb. tarayıcıya kalır. */
  function select(event: MouseEvent<HTMLAnchorElement>, id: string) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
    event.preventDefault()
    if (id === selectedId) return
    openedFromList.current = true
    open(id)
    window.history.pushState(null, "", `${window.location.pathname}?c=${id}`)
  }

  /** Mobilde geri oku: listeden açıldıysa tarayıcı geçmişinde geri, bağlantıyla gelindiyse listeye. */
  function back() {
    if (openedFromList.current) {
      openedFromList.current = false
      window.history.back()
    } else {
      window.history.replaceState(null, "", window.location.pathname)
    }
  }

  /** Daha eski konuşmaları getirir (cursor). */
  async function loadMore() {
    if (!cursor) return
    setLoadingMore(true)
    const { data } = await apiFetch<ConversationPage>(`/conversations?limit=20&cursor=${encodeURIComponent(cursor)}`)
    setLoadingMore(false)
    if (!data) return
    setItems((list) => [...list, ...data.items.filter((c) => !list.some((x) => x.id === c.id))])
    setCursor(data.nextCursor)
  }

  /** Açık konuşmanın daha eski mesajlarını üste ekler. */
  async function loadOlder() {
    if (!selectedId || !thread || thread.loadingOlder) return
    const firstId = thread.messages[0]?.id
    if (!firstId) return
    setThreads((all) => ({ ...all, [selectedId]: { ...all[selectedId]!, loadingOlder: true } }))
    const { data } = await apiFetch<MessagePage>(
      `/conversations/${selectedId}/messages?before=${firstId}&limit=${PAGE}`
    )
    setThreads((all) => {
      const th = all[selectedId]!
      if (!data) return { ...all, [selectedId]: { ...th, loadingOlder: false } }
      return {
        ...all,
        [selectedId]: { ...th, messages: [...data.items, ...th.messages], hasMore: data.hasMore, loadingOlder: false },
      }
    })
  }

  /** Açık konuşmaya mesaj gönderir: önce "gönderiliyor" balonu, sonra sunucudaki kayıtla değiştirilir. */
  async function send(body: string): Promise<boolean> {
    if (!selectedId) return false
    const id = selectedId
    const tempId = `pending-${Date.now()}`
    const temp: Message = {
      id: tempId,
      body,
      mine: true,
      createdAt: new Date().toISOString(),
      readAt: null,
      pending: true,
    }
    setFailure(null)
    setThreads((all) => ({ ...all, [id]: { ...all[id]!, messages: [...all[id]!.messages, temp] } }))
    const { data, error } = await apiFetch<Message>(`/conversations/${id}/messages`, {
      method: "POST",
      body: JSON.stringify({ body }),
    })
    setThreads((all) => {
      const th = all[id]!
      const rest = th.messages.filter((m) => m.id !== tempId && m.id !== data?.id)
      return { ...all, [id]: { ...th, messages: data ? [...rest, data] : rest } }
    })
    if (!data) {
      setFailure({ id, text: errorMessage(error?.code, error?.details) })
      return false
    }
    setItems((list) =>
      mergeFirstPage(
        list
          .filter((c) => c.id === id)
          .map((c) => ({
            ...c,
            lastMessage: { body: data.body, mine: true, createdAt: data.createdAt, readAt: null },
            lastMessageAt: data.createdAt,
          })),
        list
      )
    )
    return true
  }

  /** Taslaktan ilk mesaj: konuşma oluşur, adres `?c={id}` olur ve konuşma listenin başına gelir. */
  async function sendFirst(body: string): Promise<boolean> {
    if (!draft) return false
    setFailure(null)
    const { data, error } = await apiFetch<Conversation>("/conversations", {
      method: "POST",
      body: JSON.stringify({ listingId: draft.listing.id, body }),
    })
    if (!data) {
      setFailure({ id: "draft", text: errorMessage(error?.code, error?.details) })
      return false
    }
    setItems((list) => mergeFirstPage([data], list))
    await loadThread(data.id)
    window.history.replaceState(null, "", `${window.location.pathname}?c=${data.id}`)
    return true
  }

  const searching = query.trim() !== ""
  // Yazarken (yeni sonuç gelene kadar) önceki arama sonuçları görünür.
  const shown = searching ? (results?.items ?? []) : items

  /** Konuşma listesi sütunu (masaüstünde solda; mobilde sayfanın kendisi). */
  const list = (
    <div className={cn("flex min-h-0 flex-col lg:border-r lg:border-border", panelOpen && !isDesktop && "hidden")}>
      <div className="grid gap-3 p-4 lg:p-4">
        <h1 className="text-2xl font-extrabold text-heading max-lg:hidden">{t("title")}</h1>
        {notice && (
          <p role="status" className="rounded-xl bg-smoke-2 px-3 py-2 text-sm font-bold text-heading lg:hidden">
            {t(notice === "missing" ? "notFound" : "listingUnavailable")}
          </p>
        )}
        <label className="relative block">
          <span className="sr-only">{t("searchLabel")}</span>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-body"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchLabel")}
            className="min-h-tap w-full rounded-xl border border-border bg-background pr-3 pl-10 text-[15px] text-heading placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
          />
        </label>
      </div>
      {shown.length === 0 ? (
        <p className="px-4 pb-6 text-sm text-body" role="status">
          {searching ? t("noResults") : t("emptyList")}
        </p>
      ) : (
        <ul
          aria-label={t("listLabel")}
          className="min-h-0 flex-1 divide-y divide-border overflow-y-auto border-t border-border"
        >
          {shown.map((c) => (
            <li key={c.id}>
              <ConversationItem
                conversation={c}
                now={now}
                selected={c.id === selectedId}
                onSelect={(e) => select(e, c.id)}
              />
            </li>
          ))}
          {!searching && cursor && (
            <li className="flex justify-center p-3">
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                aria-busy={loadingMore}
                className="min-h-tap rounded-full border border-border px-4 text-sm font-extrabold text-heading hover:bg-smoke-2 focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-60"
              >
                {t("loadMore")}
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  )

  /** Sağ taraf: açık konuşma, taslak ya da "bir konuşma seçin". */
  let panel: ReactNode
  if (selected) {
    panel = (
      <ChatPanel
        key={selected.id}
        other={selected.other}
        listing={selected.listing}
        messages={thread?.messages ?? []}
        readUpTo={thread?.readUpTo ?? null}
        hasMore={thread?.hasMore ?? false}
        loadingOlder={thread?.loadingOlder ?? false}
        onLoadOlder={loadOlder}
        onBack={back}
        onSend={send}
        sendError={failure?.id === selected.id ? failure.text : null}
        blockedNote={selected.other.deleted ? t("recipientDeleted") : null}
        now={now}
      />
    )
  } else if (draftOpen && draft) {
    panel = (
      <ChatPanel
        key="draft"
        other={{ ...draft.owner, deleted: false }}
        listing={draft.listing}
        messages={[]}
        readUpTo={null}
        hasMore={false}
        loadingOlder={false}
        onLoadOlder={() => {}}
        onBack={back}
        onSend={sendFirst}
        sendError={failure?.id === "draft" ? failure.text : null}
        blockedNote={draft.blocked === "own" ? t("ownListing") : null}
        intro={
          !draft.blocked && (
            <p className="my-6 text-center text-sm text-body">
              {t("draftIntro", { name: draft.owner.name, title: draft.listing.title ?? "" })}
            </p>
          )
        }
        now={now}
      />
    )
  } else {
    panel = (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center max-lg:hidden">
        <MessagesSquare aria-hidden="true" className="size-10 text-primary/60" />
        <p className="font-extrabold text-heading">
          {notice === "missing" ? t("notFound") : notice ? t("listingUnavailable") : t("selectPrompt")}
        </p>
        {!notice && <p className="max-w-xs text-sm text-body">{t("selectPromptText")}</p>}
      </div>
    )
  }

  if (items.length === 0 && !draftOpen && !searching && !notice) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-card border border-border bg-background px-6 py-14 text-center">
        <PdMark className="size-16 opacity-30 grayscale" />
        <h2 className="text-xl font-extrabold text-heading">{t("emptyTitle")}</h2>
        <p className="max-w-sm text-body">{t("emptyText")}</p>
        <Link href="/listings" className={cn(buttonVariants(), "mt-2")}>
          {t("emptyCta")}
        </Link>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-card border border-border bg-background",
        "lg:grid lg:h-[min(760px,calc(100dvh-9rem))] lg:min-h-[560px] lg:grid-cols-[300px_minmax(0,1fr)]"
      )}
    >
      {list}
      <div
        className={cn(
          "flex min-h-0 flex-col",
          panelOpen ? "max-lg:fixed max-lg:inset-0 max-lg:z-50 max-lg:bg-background" : "max-lg:hidden"
        )}
      >
        {panel}
      </div>
    </div>
  )
}
