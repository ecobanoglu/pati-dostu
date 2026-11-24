import type { ListingStatus } from "@pati-dostu/validators"

/*
 * İlan onay akışının durum geçişleri (saf fonksiyonlar; testleri listing-status.test.ts).
 *
 *   (yeni) ──taslak kaydet──▶ draft ──onaya gönder──▶ pending ──admin onaylar──▶ active ──sahibi──▶ adopted | closed
 *                                                       │  ▲                        │
 *                                     düzeltme iste ────┘  └──── düzenleyip gönder ─┘ (her düzenleme yeniden pending)
 *                                     reddet ──▶ rejected ──düzenleyip gönder──▶ pending
 */

export type TransitionError =
  /** Yayına girmiş / onaydaki ilan yeniden taslağa çevrilemez; düzenleme "onaya gönder" ile kaydedilir. */
  | "LISTING_NOT_DRAFT"
  /** Sahiplendirilmiş ya da kapatılmış ilan düzenlenemez. */
  | "LISTING_NOT_EDITABLE"
  /** Bu durumdan istenen duruma geçilemez. */
  | "LISTING_STATUS_INVALID"
  /** Admin yalnızca onay bekleyen ilanı inceleyebilir. */
  | "LISTING_NOT_PENDING"

export type TransitionResult = { ok: true; status: ListingStatus } | { ok: false; error: TransitionError }

const ok = (status: ListingStatus): TransitionResult => ({ ok: true, status })
const fail = (error: TransitionError): TransitionResult => ({ ok: false, error })

/**
 * Sahibi ilanı kaydedince yeni durum. `current` null ise yeni ilan.
 * Onaya gönderim her zaman `pending` yapar (yayındaki ilanın en küçük düzenlemesi dahil — ürün kuralı).
 */
export function statusOnSave(current: ListingStatus | null, submit: boolean): TransitionResult {
  if (current === "adopted" || current === "closed") return fail("LISTING_NOT_EDITABLE")
  if (submit) return ok("pending")
  if (current === null || current === "draft") return ok("draft")
  return fail("LISTING_NOT_DRAFT")
}

/** Sahibinin "sahiplendirildi / kapatıldı" işaretlemesi: yalnızca yayındaki ilanda. */
export function statusOnOwnerClose(current: ListingStatus, target: "adopted" | "closed"): TransitionResult {
  return current === "active" ? ok(target) : fail("LISTING_STATUS_INVALID")
}

/** Admin kararı (onayla / düzeltme iste / reddet): yalnızca onay bekleyen ilanda. */
export function statusOnReview(
  current: ListingStatus,
  decision: "approve" | "request_changes" | "reject"
): TransitionResult {
  if (current !== "pending") return fail("LISTING_NOT_PENDING")
  return ok(decision === "approve" ? "active" : decision === "reject" ? "rejected" : "changes_requested")
}
