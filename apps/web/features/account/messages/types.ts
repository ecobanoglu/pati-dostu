/** GET /conversations öğesi (apps/api › ConversationDto). */
export type Conversation = {
  id: string
  /** İlan benim mi (ben ilan sahibiyim, karşı taraf yazan kişi). */
  isOwner: boolean
  other: { id: string; name: string; image: string | null; deleted: boolean }
  listing: {
    id: string
    listingNo: number
    slug: string | null
    title: string | null
    status: string
    deleted: boolean
    coverUrl: string | null
  }
  lastMessage: { body: string; mine: boolean; createdAt: string; readAt: string | null } | null
  unreadCount: number
  lastMessageAt: string | null
}

export type ConversationPage = { items: Conversation[]; nextCursor: string | null }

/** Tek mesaj (apps/api › MessageDto). `pending`: gönderiliyor (yalnız istemcide). */
export type Message = {
  id: string
  body: string
  mine: boolean
  createdAt: string
  readAt: string | null
  pending?: boolean
}

export type MessagePage = { items: Message[]; hasMore: boolean; readUpTo: string | null }

/**
 * İlan detayındaki "Mesaj gönder" ile açılan, henüz konuşması olmayan taslak: ilk mesaj gönderilince konuşma oluşur.
 * `blocked`: yazılamıyorsa nedeni (kendi ilanı). Yayında olmayan ilana taslak hiç hazırlanmaz.
 */
export type Draft = {
  listing: Conversation["listing"]
  owner: { name: string; image: string | null }
  blocked: "own" | null
}
