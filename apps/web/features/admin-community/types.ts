/** Silinmiş içeriğin silme bilgisi (apps/api › admin-forum.dto). */
export type Removal = {
  at: string
  by: string | null
  byAuthor: boolean
  reason: string | null
  note: string | null
} | null

type Person = { id: string; name: string; email: string }

export type CommunityCounts = { topics: number; replies: number; deletedTopics: number; deletedReplies: number }

/** GET /admin/forum/topics › items[] */
export type AdminTopicRow = {
  id: string
  title: string
  slug: string
  category: { id: string; slug: string; name: string }
  author: Person
  answerCount: number
  viewCount: number
  isSolved: boolean
  isPinned: boolean
  isLocked: boolean
  createdAt: string
  removal: Removal
}

/** GET /admin/forum/replies › items[] */
export type AdminReplyRow = {
  id: string
  excerpt: string
  topic: { id: string; title: string; slug: string; categorySlug: string; deleted: boolean }
  author: Person
  likeCount: number
  isBestAnswer: boolean
  createdAt: string
  removal: Removal
}

export type AdminForumPage<T> = { items: T[]; total: number; page: number; pageSize: number; counts: CommunityCounts }
