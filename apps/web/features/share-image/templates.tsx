/* eslint-disable @next/next/no-img-element -- Satori (next/og) yalnızca <img> anlar; next/image burada çalışmaz */
import type { ShareFormat, ShareTemplate } from "@/lib/share-image"

/**
 * Görsel üretiminde (Satori) Tailwind/CSS değişkenleri çalışmadığı için marka renkleri ham değer olarak burada.
 * Kaynak: app/globals.css (--brand-*, --danger) — orada değişirse burada da değiştir.
 */
export const BRAND = {
  purple: "#6839cc",
  orange: "#ff781f",
  ink: "#25283d",
  body: "#575757",
  smoke: "#f6e8ff",
  smoke2: "#ecf1f5",
  danger: "#a60c56",
  white: "#ffffff",
} as const

/** Şablonun ihtiyaç duyduğu, ilandan hazırlanmış metinler ve görseller. Telefon numarası bilerek yoktur. */
export type ShareData = {
  /** Hayvanın adı (yoksa ilan başlığı). */
  name: string
  /** "Yavru · Dişi · Tekir · Bornova" */
  facts: string
  /** Rozet: "YUVA ARIYOR", "KAYIP" … (dile göre büyük harf) */
  badge: string
  /** Kısa durum + yer: "Yuva arıyor · Bornova" */
  status: string
  /** Polaroid alt yazısı: "Bir yuva arıyorum!" */
  tagline: string
  /** Afiş: "Gördüyseniz:" */
  cta: string
  /** Afiş: "Tekir kedi · Yavru" */
  breedLine: string
  /** Afiş: "Son görülme:" + yer · tarih (kayıp/bulunan) */
  lastSeenLabel: string | null
  lastSeen: string | null
  /** Özellik çipleri (aşılı, kısır…); "Özellikleri göster" kapalıysa boş. */
  features: string[]
  /** Kapak fotoğrafı (data: adresi) — yoksa yer tutucu. */
  photo: string | null
  /** İlan adresinin QR kodu (SVG data: adresi). */
  qr: string
  /** "pati-dostu.com/ilan/PD-100040" */
  link: string
  /** "pati-dostu.com" */
  host: string
  /** PD logosu (açık / koyu zemin), SVG data: adresi. */
  logo: string
  logoDark: string
}

type Props = { data: ShareData; story: boolean }

/** Ad uzunsa (ilan başlığı kullanıldığında) yazı boyutunu küçültür ki satırlara taşıp düzeni bozmasın. */
function nameSize(name: string, base: number): number {
  if (name.length > 24) return Math.round(base * 0.55)
  if (name.length > 16) return Math.round(base * 0.7)
  if (name.length > 10) return Math.round(base * 0.85)
  return base
}

/** Fotoğraf ya da (fotoğraf yoksa) soluk logolu yer tutucu; verilen kutuyu doldurur. */
function Photo({ src, logo, style }: { src: string | null; logo: string; style?: React.CSSProperties }) {
  if (src) return <img src={src} alt="" style={{ objectFit: "cover", ...style }} />
  return (
    <div
      style={{ display: "flex", alignItems: "center", justifyContent: "center", background: BRAND.smoke2, ...style }}
    >
      <img src={logo} alt="" width={180} height={180} style={{ opacity: 0.25 }} />
    </div>
  )
}

/** Beyaz kutuda QR kod. */
function Qr({ src, size, background = BRAND.white }: { src: string; size: number; background?: string }) {
  return (
    <div style={{ display: "flex", padding: size * 0.08, background, borderRadius: size * 0.14 }}>
      <img src={src} alt="" width={size} height={size} />
    </div>
  )
}

/** Özellik çipleri (açık mor zemin, mor yazı). */
function Chips({ items, size = 30 }: { items: string[]; size?: number }) {
  if (items.length === 0) return null
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
      {items.map((item) => (
        <div
          key={item}
          style={{
            display: "flex",
            padding: `${size * 0.3}px ${size * 0.7}px`,
            borderRadius: 999,
            background: BRAND.smoke,
            color: BRAND.purple,
            fontSize: size,
            fontWeight: 800,
          }}
        >
          {item}
        </div>
      ))}
    </div>
  )
}

/** Klasik: üstte fotoğraf ve turuncu rozet, altta mor bant (ad, bilgiler, bağlantı, QR). */
function Classic({ data, story }: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", background: BRAND.purple }}>
      <div style={{ display: "flex", position: "relative", flexGrow: 1 }}>
        <Photo src={data.photo} logo={data.logo} style={{ width: "100%", height: "100%" }} />
        <div
          style={{
            display: "flex",
            position: "absolute",
            top: 48,
            left: 48,
            padding: "16px 34px",
            borderRadius: 999,
            background: BRAND.orange,
            color: BRAND.ink,
            fontSize: 40,
            fontWeight: 800,
          }}
        >
          {data.badge}
        </div>
      </div>
      <div
        style={{ display: "flex", flexDirection: "column", padding: story ? "64px 64px 80px" : "48px 56px", gap: 12 }}
      >
        <div
          style={{
            display: "flex",
            color: BRAND.white,
            fontSize: nameSize(data.name, story ? 112 : 96),
            fontWeight: 800,
            lineHeight: 1.05,
          }}
        >
          {data.name}
        </div>
        <div style={{ display: "flex", color: BRAND.white, opacity: 0.92, fontSize: story ? 46 : 40 }}>
          {data.facts}
        </div>
        {data.features.length > 0 && (
          <div style={{ display: "flex", marginTop: 12 }}>
            <Chips items={data.features} />
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <img src={data.logoDark} alt="" width={76} height={76} />
            <div style={{ display: "flex", color: BRAND.white, fontSize: 34, fontWeight: 800 }}>{data.link}</div>
          </div>
          <Qr src={data.qr} size={story ? 200 : 170} />
        </div>
      </div>
    </div>
  )
}

/** Polaroid: açık mor zeminde hafif eğik beyaz fotoğraf kartı; altta "Bir yuva arıyorum!" ve QR. */
function Polaroid({ data, story }: Props) {
  const card = story ? 860 : 760
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        background: BRAND.smoke,
        padding: story ? "140px 80px 100px" : "48px 64px 44px",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: card,
          padding: "32px 32px 36px",
          background: BRAND.white,
          boxShadow: "0 18px 40px rgba(37,40,61,0.18)",
          transform: "rotate(-3deg)",
        }}
      >
        <Photo src={data.photo} logo={data.logo} style={{ width: card - 64, height: story ? 900 : 470 }} />
        <div
          style={{
            display: "flex",
            marginTop: 24,
            color: BRAND.ink,
            fontSize: nameSize(data.name, story ? 96 : 80),
            fontWeight: 800,
          }}
        >
          {data.name}
        </div>
        <div style={{ display: "flex", color: BRAND.body, fontSize: story ? 40 : 34 }}>{data.facts}</div>
        {data.features.length > 0 && (
          <div style={{ display: "flex", marginTop: 18 }}>
            <Chips items={data.features} size={26} />
          </div>
        )}
      </div>
      <div style={{ display: "flex", width: "100%", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", color: BRAND.purple, fontSize: story ? 56 : 44, fontWeight: 800 }}>
          {data.tagline}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <img src={data.logo} alt="" width={84} height={84} />
          <Qr src={data.qr} size={story ? 190 : 150} />
        </div>
      </div>
    </div>
  )
}

/** Afiş: bordo çerçeve, üstte büyük "KAYIP" başlığı, fotoğraf + bilgiler, altta "Gördüyseniz: bağlantı" ve QR. */
function Poster({ data, story }: Props) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        background: BRAND.danger,
        padding: 24,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          padding: story ? "40px 0 48px" : "18px 0 26px",
          lineHeight: 1.1,
          color: BRAND.white,
          fontSize: story ? 170 : 130,
          fontWeight: 800,
          letterSpacing: 18,
        }}
      >
        {data.badge}
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: story ? "column" : "row",
          flexGrow: 1,
          background: BRAND.white,
          padding: 36,
          gap: 36,
        }}
      >
        <Photo
          src={data.photo}
          logo={data.logo}
          style={story ? { width: "100%", height: 820 } : { width: 470, height: "100%" }}
        />
        <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 14 }}>
          <div
            style={{
              display: "flex",
              color: BRAND.ink,
              fontSize: nameSize(data.name, story ? 104 : 84),
              fontWeight: 800,
              lineHeight: 1.05,
            }}
          >
            {data.name}
          </div>
          <div style={{ display: "flex", color: BRAND.ink, fontSize: story ? 46 : 36 }}>{data.breedLine}</div>
          {data.features.length > 0 && <Chips items={data.features} size={story ? 32 : 26} />}
          {data.lastSeen && (
            <div style={{ display: "flex", flexDirection: "column", marginTop: 12, gap: 6 }}>
              <div style={{ display: "flex", color: BRAND.ink, fontSize: story ? 44 : 34, fontWeight: 800 }}>
                {data.lastSeenLabel}
              </div>
              <div style={{ display: "flex", color: BRAND.ink, fontSize: story ? 44 : 34 }}>{data.lastSeen}</div>
            </div>
          )}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: BRAND.ink,
          padding: story ? "36px 40px" : "24px 32px",
          gap: 24,
        }}
      >
        <div
          style={{ display: "flex", flexWrap: "wrap", color: BRAND.white, fontSize: story ? 40 : 32, fontWeight: 800 }}
        >
          {`${data.cta} ${data.link}`}
        </div>
        <Qr src={data.qr} size={story ? 190 : 140} />
      </div>
    </div>
  )
}

/** Minimal: beyaz zemin, yuvarlak köşeli fotoğraf, altta ad + "Yuva arıyor · Bornova", logo ve QR. */
function Minimal({ data, story }: Props) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        background: BRAND.white,
        padding: story ? 72 : 56,
        gap: story ? 56 : 40,
      }}
    >
      <Photo src={data.photo} logo={data.logo} style={{ width: "100%", flexGrow: 1, borderRadius: 48 }} />
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 24 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
          <div
            style={{
              display: "flex",
              color: BRAND.ink,
              fontSize: nameSize(data.name, story ? 112 : 92),
              fontWeight: 800,
              lineHeight: 1.05,
            }}
          >
            {data.name}
          </div>
          <div style={{ display: "flex", color: BRAND.body, fontSize: story ? 44 : 36 }}>{data.status}</div>
          {data.features.length > 0 && (
            <div style={{ display: "flex", marginTop: 10 }}>
              <Chips items={data.features} size={26} />
            </div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <img src={data.logo} alt="" width={84} height={84} />
          <Qr src={data.qr} size={story ? 180 : 150} background={BRAND.smoke} />
        </div>
      </div>
    </div>
  )
}

/** Turuncu: tam fotoğraf, sağ üst köşede turuncu çapraz şerit, altta lacivert bant. */
function Orange({ data, story }: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", background: BRAND.ink }}>
      <div style={{ display: "flex", position: "relative", flexGrow: 1, overflow: "hidden" }}>
        <Photo src={data.photo} logo={data.logo} style={{ width: "100%", height: "100%" }} />
        <div
          style={{
            display: "flex",
            position: "absolute",
            top: 130,
            right: -190,
            width: 760,
            justifyContent: "center",
            padding: "22px 0",
            background: BRAND.orange,
            color: BRAND.ink,
            fontSize: 46,
            fontWeight: 800,
            letterSpacing: 4,
            transform: "rotate(40deg)",
          }}
        >
          {data.badge}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: story ? "56px 64px 80px" : "40px 56px",
          gap: 24,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
          <div
            style={{
              display: "flex",
              color: BRAND.white,
              fontSize: nameSize(data.name, story ? 104 : 84),
              fontWeight: 800,
              lineHeight: 1.05,
            }}
          >
            {data.name}
          </div>
          <div style={{ display: "flex", color: BRAND.white, opacity: 0.92, fontSize: story ? 42 : 34 }}>
            {data.facts}
          </div>
          {data.features.length > 0 && (
            <div style={{ display: "flex", marginTop: 10 }}>
              <Chips items={data.features} size={26} />
            </div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <img src={data.logoDark} alt="" width={84} height={84} />
          <Qr src={data.qr} size={story ? 180 : 150} />
        </div>
      </div>
    </div>
  )
}

/** Karakter: solda fotoğraf, sağda rozet, ad, bilgiler ve özellik çipleri; altta logo ve site adı. */
function Character({ data, story }: Props) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: story ? "column" : "row",
        width: "100%",
        height: "100%",
        background: BRAND.white,
      }}
    >
      <Photo
        src={data.photo}
        logo={data.logo}
        style={story ? { width: "100%", height: 1060 } : { width: 470, height: "100%" }}
      />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          padding: story ? "64px 72px 72px" : "56px 52px 48px",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", color: "#b54f08", fontSize: story ? 40 : 32, fontWeight: 800 }}>
          {data.badge}
        </div>
        <div
          style={{
            display: "flex",
            color: BRAND.ink,
            fontSize: nameSize(data.name, story ? 120 : 92),
            fontWeight: 800,
            lineHeight: 1.05,
          }}
        >
          {data.name}
        </div>
        <div style={{ display: "flex", color: BRAND.body, fontSize: story ? 44 : 34 }}>{data.facts}</div>
        <div style={{ display: "flex", marginTop: 12 }}>
          <Chips items={data.features} size={story ? 34 : 28} />
        </div>
        <div style={{ display: "flex", flexGrow: 1 }} />
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <img src={data.logo} alt="" width={72} height={72} />
            <div style={{ display: "flex", color: BRAND.ink, fontSize: 30, fontWeight: 800 }}>{data.host}</div>
          </div>
          <Qr src={data.qr} size={story ? 180 : 130} background={BRAND.smoke} />
        </div>
      </div>
    </div>
  )
}

const TEMPLATES: Record<ShareTemplate, (props: Props) => React.ReactElement> = {
  classic: Classic,
  polaroid: Polaroid,
  poster: Poster,
  minimal: Minimal,
  orange: Orange,
  character: Character,
}

/** Seçilen şablonu verilen boyutta (gönderi / hikâye) çizer. */
export function ShareImage({
  template,
  format,
  data,
}: {
  template: ShareTemplate
  format: ShareFormat
  data: ShareData
}) {
  const Template = TEMPLATES[template]
  return (
    <div style={{ display: "flex", width: "100%", height: "100%", fontFamily: "Nunito" }}>
      <Template data={data} story={format === "story"} />
    </div>
  )
}
