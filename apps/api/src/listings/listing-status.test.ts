import { describe, expect, it } from "vitest"

import { statusOnOwnerClose, statusOnReview, statusOnSave } from "./listing-status.js"

describe("statusOnSave", () => {
  it("yeni ilan: taslak ya da onaya gönderim", () => {
    expect(statusOnSave(null, false)).toEqual({ ok: true, status: "draft" })
    expect(statusOnSave(null, true)).toEqual({ ok: true, status: "pending" })
  })

  it("taslak, taslak olarak kalabilir ya da gönderilebilir", () => {
    expect(statusOnSave("draft", false)).toEqual({ ok: true, status: "draft" })
    expect(statusOnSave("draft", true)).toEqual({ ok: true, status: "pending" })
  })

  it.each(["active", "pending", "changes_requested", "rejected"] as const)(
    "%s ilan her düzenlemede yeniden onaya düşer",
    (current) => expect(statusOnSave(current, true)).toEqual({ ok: true, status: "pending" })
  )

  it.each(["active", "pending", "changes_requested", "rejected"] as const)("%s ilan taslağa çevrilemez", (current) =>
    expect(statusOnSave(current, false)).toEqual({ ok: false, error: "LISTING_NOT_DRAFT" })
  )

  it.each(["adopted", "closed"] as const)("%s ilan düzenlenemez", (current) => {
    expect(statusOnSave(current, true)).toEqual({ ok: false, error: "LISTING_NOT_EDITABLE" })
    expect(statusOnSave(current, false)).toEqual({ ok: false, error: "LISTING_NOT_EDITABLE" })
  })
})

describe("statusOnOwnerClose", () => {
  it("yalnızca yayındaki ilan sahiplendirildi/kapatıldı yapılır", () => {
    expect(statusOnOwnerClose("active", "adopted")).toEqual({ ok: true, status: "adopted" })
    expect(statusOnOwnerClose("active", "closed")).toEqual({ ok: true, status: "closed" })
    expect(statusOnOwnerClose("pending", "adopted")).toEqual({ ok: false, error: "LISTING_STATUS_INVALID" })
    expect(statusOnOwnerClose("draft", "closed")).toEqual({ ok: false, error: "LISTING_STATUS_INVALID" })
  })
})

describe("statusOnReview", () => {
  it("admin kararları onay bekleyen ilanda", () => {
    expect(statusOnReview("pending", "approve")).toEqual({ ok: true, status: "active" })
    expect(statusOnReview("pending", "reject")).toEqual({ ok: true, status: "rejected" })
    expect(statusOnReview("pending", "request_changes")).toEqual({ ok: true, status: "changes_requested" })
  })
  it.each(["draft", "active", "rejected", "changes_requested"] as const)("%s ilan incelenemez", (current) =>
    expect(statusOnReview(current, "approve")).toEqual({ ok: false, error: "LISTING_NOT_PENDING" })
  )
})
