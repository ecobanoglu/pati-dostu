/**
 * Demo topluluk konuları ve cevapları (4. aşama). Yazarlar demo kullanıcı anahtarları; "inbox" = `.env ›
 * DEMO_INBOX_EMAIL`'deki gerçek hesap (Sorularım sayfası dolu görünsün; değişken yoksa "can"). Kimlikler sabit
 * `de000000-…` biçimindedir: clearDemo gerçek hesaba ait demo konu ve cevapları da bu önekle bulup siler.
 * Metinler sınırlı Markdown (**kalın**, *italik*, "- " liste). `ago` dakika önce; cevaplarda `ago` azalan sırada.
 */

const HOUR = 60
const DAY = 24 * HOUR

export type DemoReply = {
  author: string
  ago: number
  body: string
  /** "Faydalı" işaretleyen kullanıcı anahtarları (yazarın kendisi olamaz). */
  likes?: string[]
  best?: true
}

export type DemoTopic = {
  key: string
  category: string
  species?: "kedi" | "kopek" | "kus" | "tavsan"
  author: string
  ago: number
  title: string
  body: string
  views: number
  /** Wikimedia Commons'tan konu fotoğrafı (sorgu + adet; en fazla 3). */
  photos?: { query: string; count: number }
  /** Konuyu takip eden kullanıcılar (yazar her zaman takip eder). */
  followers?: string[]
  replies: DemoReply[]
}

export const demoTopics: DemoTopic[] = [
  {
    key: "mama-yemiyor",
    category: "beslenme",
    species: "kedi",
    author: "elif",
    ago: 2 * HOUR,
    title: "Yavru kedim mama yemiyor, ne yapmalıyım?",
    body: "İki aylık kedimi yeni sahiplendim. Su içiyor ve oyun oynuyor ama mamasını koklayıp bırakıyor.\n\n**Yaş mama mı** denemeliyim, ne kadar beklemeliyim?",
    views: 240,
    photos: { query: "kitten eating cat food", count: 1 },
    followers: ["zeynep"],
    replies: [
      {
        author: "klinik",
        ago: HOUR + 30,
        body: "Yeni eve gelen yavrularda ilk 2–3 gün iştahsızlık sık görülür. Yaş mamayı oda sıcaklığında, az ve sık verin; su tüketimini izleyin.\n\n**24 saatten uzun** hiç yemezse ya da halsizlik, kusma varsa vakit kaybetmeden veteriner kontrolüne götürün.",
        likes: ["elif", "mert", "zeynep", "can"],
        best: true,
      },
      {
        author: "mert",
        ago: 50,
        body: "Bizim yavruda da aynısı olmuştu, eski evinden getirdiğimiz mamayı birkaç gün karıştırarak verince düzeldi.",
        likes: ["elif"],
      },
      {
        author: "zeynep",
        ago: 30,
        body: "Mama kabını kum kabından uzak, sessiz bir köşeye koymak da işe yarıyor.",
        likes: ["elif"],
      },
    ],
  },
  {
    key: "sokak-kopegi-asi",
    category: "saglik",
    species: "kopek",
    author: "can",
    ago: 5 * HOUR,
    title: "Sokaktan aldığım köpeğe hangi aşıları yaptırmalıyım?",
    body: "Yaklaşık bir yaşında, sokaktan aldım. Veteriner kontrolünden önce hangi sırayı izlemeliyim?\n\n- İç ve dış parazit\n- Karma aşı\n- Kuduz",
    views: 180,
    replies: [
      {
        author: "klinik",
        ago: 4 * HOUR,
        body: "Önce genel muayene ve parazit uygulaması yapılır; ardından karma aşı (2 doz, 3–4 hafta arayla) ve kuduz aşısı gelir. Kan tahlili ile genel durumuna bakmak da iyi olur.",
        likes: ["can", "elif"],
        best: true,
      },
      {
        author: "zeynep",
        ago: 3 * HOUR,
        body: "Mikroçip de taktırmayı unutmayın; kayıp durumunda çok işe yarıyor.",
        likes: ["can"],
      },
    ],
  },
  {
    key: "iki-kedi-alistirma",
    category: "davranis",
    species: "kedi",
    author: "mert",
    ago: DAY + 2 * HOUR,
    title: "İki kediyi birbirine nasıl alıştırırım?",
    body: "Evde 3 yaşında bir kedim var, yeni gelen yavruyla tanıştırmak istiyorum. Şimdiden *tıslamaya* başladı.",
    views: 410,
    followers: ["elif", "inbox"],
    replies: [
      {
        author: "klinik",
        ago: DAY,
        body: "İlk hafta ayrı odalarda tutun, battaniyelerini değiştirerek kokularını tanıştırın. Sonra kapı aralığından, en son kısa ve gözetimli karşılaşmalarla ilerleyin.",
        likes: ["mert", "zeynep", "elif"],
      },
      {
        author: "barinak",
        ago: DAY - 3 * HOUR,
        body: "Mama kaplarını başta uzak tutun ve iki ayrı kum kabı kullanın. Sabır en önemli kısım, bazen birkaç hafta sürebiliyor.",
        likes: ["mert"],
      },
    ],
  },
  {
    key: "gecici-yuva-dikkat",
    category: "sahiplenme",
    author: "zeynep",
    ago: DAY + 6 * HOUR,
    title: "Geçici yuva olmak için nelere dikkat etmeliyim?",
    body: "İlk kez geçici yuva olacağım; masraflar ve süre konusunda tecrübesi olan var mı?",
    views: 95,
    replies: [
      {
        author: "barinak",
        ago: DAY + 2 * HOUR,
        body: "Biz mama ve veteriner masraflarını karşılıyoruz; geçici yuvadan beklediğimiz güvenli bir ortam ve düzenli haber. Süre genelde 2–8 hafta arası.",
        likes: ["zeynep", "elif"],
        best: true,
      },
    ],
  },
  {
    key: "balkon-sokak-kedisi",
    category: "bakim",
    species: "kedi",
    author: "elif",
    ago: 2 * DAY + 4 * HOUR,
    title: "Kışın balkonda kalan sokak kedisi için ne yapabilirim?",
    body: "Her gece balkona gelen bir kedi var, soğuktan korumak için öneriniz var mı?",
    views: 150,
    photos: { query: "cat in snow", count: 1 },
    replies: [
      {
        author: "can",
        ago: 2 * DAY,
        body: "Strafor kutunun içine **saman** koyun (battaniye nemi tutar). Girişi rüzgâr almayan tarafa bakmalı.",
        likes: ["elif", "zeynep"],
      },
      {
        author: "barinak",
        ago: DAY + 20 * HOUR,
        body: "Suyun donmaması için kabı sabah ve akşam tazeleyin.",
        likes: ["elif"],
      },
    ],
  },
  {
    key: "kayip-afis",
    category: "kayip-hayvan",
    species: "kedi",
    author: "inbox",
    ago: 3 * DAY,
    title: "Bornova'da kaybolan kedim için afiş nasıl hazırlanır?",
    body: "Dün akşam kapıdan çıktı, hangi bilgileri yazmalıyım?",
    views: 60,
    replies: [],
  },
  {
    key: "kisirlastirma-bakim",
    category: "saglik",
    species: "kedi",
    author: "inbox",
    ago: 2 * DAY,
    title: "Kısırlaştırma sonrası bakım nasıl olmalı?",
    body: "Dişi kedim yarın kısırlaştırılacak. Eve geldikten sonra nelere dikkat etmeliyim?\n\n- Yaka kullanmalı mıyım?\n- Ne zaman mama verebilirim?",
    views: 72,
    replies: [
      {
        author: "klinik",
        ago: 2 * DAY - 3 * HOUR,
        body: "Narkozdan sonraki ilk 6 saat su, 12 saat sonra az miktarda mama verebilirsiniz. Dikişleri yalamaması için 7–10 gün yaka ya da body kullanın.",
        likes: ["inbox", "zeynep"],
      },
      { author: "zeynep", ago: DAY, body: "Bizimkinde body yakadan çok daha rahat oldu.", likes: [] },
      {
        author: "mert",
        ago: 10 * HOUR,
        body: "Atlayıp zıplamasın diye ilk günlerde yüksek yerleri kapatın.",
        likes: ["inbox"],
      },
    ],
  },
  {
    key: "masraf-kim",
    category: "sahiplenme",
    author: "inbox",
    ago: 6 * DAY,
    title: "Geçici yuva için masrafları kim karşılıyor?",
    body: "Barınaklarla çalışan geçici yuvalarda mama ve veteriner masrafları genelde nasıl paylaşılıyor?",
    views: 88,
    replies: [
      {
        author: "barinak",
        ago: 5 * DAY,
        body: "Bizde tüm masraflar barınağa ait; fiş ya da fatura ile karşılıyoruz.",
        likes: ["inbox"],
      },
      { author: "elif", ago: 4 * DAY, body: "Gönüllü gruplarda da çoğunlukla aynı şekilde.", likes: [] },
      {
        author: "can",
        ago: 3 * DAY,
        body: "Anlaşmayı baştan yazılı yapmak her iki taraf için de iyi.",
        likes: ["inbox"],
      },
    ],
  },
  {
    key: "kus-kafes",
    category: "bakim",
    species: "kus",
    author: "mert",
    ago: 4 * DAY,
    title: "Muhabbet kuşu kafesi ne sıklıkla temizlenmeli?",
    body: "İki muhabbet kuşum var. Kafes altlığını her gün mü değiştirmeliyim?",
    views: 64,
    photos: { query: "budgerigar cage", count: 1 },
    replies: [
      {
        author: "klinik",
        ago: 4 * DAY - 5 * HOUR,
        body: "Altlık her gün, su ve yem kapları her gün, kafesin tamamı haftada bir sıcak su ve sabunla temizlenmeli. Kimyasal temizleyici kullanmayın.",
        likes: ["mert", "inbox"],
        best: true,
      },
      {
        author: "inbox",
        ago: 3 * DAY,
        body: "Tüneklerin farklı kalınlıkta olması ayak sağlığı için de önemliymiş.",
        likes: ["mert"],
      },
    ],
  },
  {
    key: "tavsan-beslenme",
    category: "beslenme",
    species: "tavsan",
    author: "zeynep",
    ago: 7 * DAY,
    title: "Tavşan günde ne kadar kuru ot yemeli?",
    body: "Yeni sahiplendiğim Hollanda Lop'a pelet de veriyorum. Kuru ot ne kadar olmalı?",
    views: 120,
    replies: [
      {
        author: "barinak",
        ago: 6 * DAY,
        body: "Beslenmenin **%80'i kuru ot** olmalı ve önünde sürekli bulunmalı. Pelet günde 1–2 yemek kaşığı yeterli; taze yeşillikler de eklenebilir.",
        likes: ["zeynep", "elif"],
        best: true,
      },
    ],
  },
  {
    key: "kopek-yalniz",
    category: "davranis",
    species: "kopek",
    author: "can",
    ago: 9 * DAY,
    title: "Köpeğim evde yalnız kalınca havlıyor",
    body: "İşe gidince 4–5 saat yalnız kalıyor ve komşular havladığını söylüyor. Ne yapabilirim?",
    views: 230,
    replies: [
      {
        author: "klinik",
        ago: 8 * DAY,
        body: "Ayrılık kaygısı olabilir. Çıkmadan önce uzun bir yürüyüş, oyalayıcı oyuncaklar ve çıkışları kısa sürelerle alıştırarak uzatmak işe yarar. Devam ederse bir davranış uzmanına danışın.",
        likes: ["can", "mert", "zeynep"],
      },
      { author: "elif", ago: 7 * DAY, body: "İçine mama koyulan oyuncaklar bizde çok iyi oldu.", likes: ["can"] },
    ],
  },
  {
    key: "tuy-dokme",
    category: "bakim",
    species: "kedi",
    author: "zeynep",
    ago: 12 * DAY,
    title: "Kedimin tüyleri çok dökülüyor, normal mi?",
    body: "Mevsim geçişinde arttı ama son haftalarda neredeyse her yer tüy oldu.",
    views: 175,
    replies: [],
  },
  {
    key: "ilk-kedi-liste",
    category: "diger",
    author: "elif",
    ago: 15 * DAY,
    title: "İlk kez kedi sahiplenecekler için alışveriş listesi",
    body: "Önümüzdeki hafta ilk kedimi sahipleniyorum. Eksik bir şey var mı?\n\n- Mama ve su kabı\n- Kum kabı ve kum\n- Taşıma çantası\n- Tırmalama tahtası",
    views: 310,
    followers: ["inbox"],
    replies: [
      {
        author: "barinak",
        ago: 14 * DAY,
        body: "Pencereler için **file** en önemli eksik; düşmeler çok sık oluyor.",
        likes: ["elif", "inbox", "zeynep"],
      },
      { author: "mert", ago: 13 * DAY, body: "Bir de tüy tarağı ve tırnak makası.", likes: ["elif"] },
    ],
  },
]
