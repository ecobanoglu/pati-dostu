import { existsSync } from "node:fs"
import { mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { join } from "node:path"

import { rejectedPhotos } from "./data.js"

/**
 * Demo ilan fotoğrafları: Wikimedia Commons'tan, yalnızca serbest lisanslı (CC0, CC BY, CC BY-SA, kamu malı)
 * gerçek hayvan fotoğrafları. İndirilenler packages/db/.demo-cache/ altında tutulur (git'e girmez); tekrar
 * çalıştırmada yeniden indirilmez. Her dosyanın kaynak, yazar ve lisansı attributions.json'da.
 */

const API = "https://commons.wikimedia.org/w/api.php"
/** Commons, otomatik istemcilerden tanımlayıcı bir User-Agent ister (kişisel bilgi içermez). */
const USER_AGENT = "PatiDostuDevSeed/1.0 (development demo data script)"
export const CACHE_DIR = join(import.meta.dirname, "..", "..", ".demo-cache")
const PHOTO_DIR = join(CACHE_DIR, "photos")
const ATTRIBUTION_FILE = join(CACHE_DIR, "attributions.json")

/** Kabul edilen lisanslar (ticari kullanım ve değiştirmeye izin veren). */
const LICENSE_OK = /^(cc0|cc[- ]by(-sa)?[- ][0-9.]+|public domain|pd)/i
/** Evcil hayvan fotoğrafı olmayanları ele (çizim, heykel, müze, yemek…). */
const TITLE_BAD =
  /(meat|dead|skull|skelet|taxiderm|statue|sculpt|drawing|painting|illustrat|stamp|museum|toy|food|logo|map|diagram|wild|zoo|market|show|exhibition)/i

export type Attribution = { file: string; title: string; source: string; author: string; license: string }

type Candidate = { title: string; url: string; author: string; license: string; page: string }

type ImageInfo = {
  thumburl?: string
  width: number
  height: number
  mime: string
  descriptionurl: string
  extmetadata?: Record<string, { value?: string }>
}

/** Kısa bekleme: Commons'a nazik davranmak için ardışık istekler arasında. */
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Commons isteği: 429 (çok fazla istek) ya da 5xx dönerse Retry-After kadar (yoksa artan sürelerle) bekleyip
 * en fazla 6 kez yeniden dener.
 */
async function commonsFetch(url: string): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, { headers: { "user-agent": USER_AGENT } })
    if (res.ok || attempt >= 5 || (res.status !== 429 && res.status < 500)) return res
    const wait = Number(res.headers.get("retry-after")) * 1000 || 2000 * 2 ** attempt
    console.log(`  Commons yoğun (${res.status}), ${Math.round(wait / 1000)} sn bekleniyor…`)
    await pause(wait)
  }
}

/** HTML etiketlerini atar (Commons yazar alanı HTML olabilir). */
const stripHtml = (s: string) =>
  s
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim()

/** Bir arama için uygun aday fotoğrafları döndürür (lisans, boyut, oran ve başlık süzgecinden geçenler). */
async function search(query: string): Promise<Candidate[]> {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    generator: "search",
    gsrsearch: `${query} filemime:image/jpeg`,
    gsrnamespace: "6",
    gsrlimit: "40",
    prop: "imageinfo",
    iiprop: "url|mime|size|extmetadata",
    iiurlwidth: "1600",
    iiextmetadatafilter: "LicenseShortName|Artist",
  })
  const res = await commonsFetch(`${API}?${params}`)
  if (!res.ok) throw new Error(`Commons araması başarısız (${res.status}): ${query}`)
  const body = (await res.json()) as {
    query?: { pages?: Record<string, { title: string; index: number; imageinfo?: ImageInfo[] }> }
  }
  return Object.values(body.query?.pages ?? {})
    .sort((a, b) => a.index - b.index)
    .flatMap((page) => {
      const info = page.imageinfo?.[0]
      if (!info?.thumburl || info.mime !== "image/jpeg") return []
      const ratio = info.width / info.height
      const license = info.extmetadata?.LicenseShortName?.value ?? ""
      if (info.width < 1000 || ratio < 0.75 || ratio > 1.8) return []
      const title = page.title.replace(/^File:/, "")
      if (!LICENSE_OK.test(license) || TITLE_BAD.test(title) || rejectedPhotos.has(title)) return []
      return [
        {
          title,
          url: info.thumburl,
          author: stripHtml(info.extmetadata?.Artist?.value ?? "") || "Bilinmiyor",
          license,
          page: info.descriptionurl,
        },
      ]
    })
}

/** Önbellekteki kaynak bilgilerini okur. */
async function readAttributions(): Promise<Record<string, Attribution>> {
  if (!existsSync(ATTRIBUTION_FILE)) return {}
  return JSON.parse(await readFile(ATTRIBUTION_FILE, "utf8")) as Record<string, Attribution>
}

/**
 * Her ilan için istenen sayıda fotoğrafı hazırlar ve yerel dosya yollarını döndürür. Önbellekte olan dosya yeniden
 * indirilmez. Aynı fotoğraf iki ilanda kullanılmaz.
 */
export async function preparePhotos(
  requests: Array<{ key: string; query: string; count: number }>
): Promise<Map<string, string[]>> {
  await mkdir(PHOTO_DIR, { recursive: true })
  const attributions = await readAttributions()
  // Reddedilen fotoğraflar önbellekten çıkarılır; yerlerine yenisi indirilir.
  for (const [file, a] of Object.entries(attributions)) {
    if (rejectedPhotos.has(a.title)) {
      await rm(join(PHOTO_DIR, file), { force: true })
      delete attributions[file]
    }
  }
  const used = new Set(Object.values(attributions).map((a) => a.source))
  const result = new Map<string, string[]>()

  for (const { key, query, count } of requests) {
    const files: string[] = []
    const missing: number[] = []
    for (let i = 0; i < count; i++) {
      const file = `${key}-${i + 1}.jpg`
      if (existsSync(join(PHOTO_DIR, file)) && attributions[file]) files.push(join(PHOTO_DIR, file))
      else missing.push(i)
    }
    if (missing.length > 0) {
      const candidates = (await search(query)).filter((c) => !used.has(c.page))
      for (const i of missing) {
        const pick = candidates.shift()
        if (!pick) break
        const file = `${key}-${i + 1}.jpg`
        const res = await commonsFetch(pick.url)
        if (!res.ok) continue
        await writeFile(join(PHOTO_DIR, file), Buffer.from(await res.arrayBuffer()))
        attributions[file] = { file, title: pick.title, source: pick.page, author: pick.author, license: pick.license }
        used.add(pick.page)
        files.push(join(PHOTO_DIR, file))
        await pause(1000)
      }
      await writeFile(ATTRIBUTION_FILE, JSON.stringify(attributions, null, 2))
      await pause(1000)
    }
    if (files.length === 0) console.warn(`  ! "${query}" için uygun fotoğraf bulunamadı (${key})`)
    result.set(key, files)
  }
  return result
}
