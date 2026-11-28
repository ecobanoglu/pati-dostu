import {
  defaultNotificationPrefs,
  fixedNotificationChannels,
  type NotificationType,
  notificationTypes,
  resolveNotificationPrefs,
} from "@pati-dostu/validators"
import { describe, expect, it } from "vitest"

describe("resolveNotificationPrefs", () => {
  it("boş tercihleri varsayılanlarla doldurur", () => {
    expect(resolveNotificationPrefs({})).toEqual(defaultNotificationPrefs)
    expect(resolveNotificationPrefs(null)).toEqual(defaultNotificationPrefs)
  })

  it("kayıtlı kanalı korur, eksik kanalı varsayılandan alır", () => {
    const prefs = resolveNotificationPrefs({ listing_review: { email: false } })
    expect(prefs.listing_review).toEqual({ inApp: true, email: false })
    expect(prefs.favorite_update).toEqual(defaultNotificationPrefs.favorite_update)
  })

  it("bilinmeyen konuları yok sayar", () => {
    const prefs = resolveNotificationPrefs({ eski_konu: { inApp: false } })
    expect(Object.keys(prefs).sort()).toEqual(Object.keys(defaultNotificationPrefs).sort())
  })
})

describe("notificationTypes", () => {
  it("her tür bilinen bir konuya bağlı ya da sabit kanallı", () => {
    for (const [type, topic] of Object.entries(notificationTypes)) {
      if (topic === "moderation") expect(fixedNotificationChannels[type as NotificationType]).toBeDefined()
      else expect(defaultNotificationPrefs[topic]).toBeDefined()
    }
  })
})
