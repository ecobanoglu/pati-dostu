/**
 * Demo blog yazıları ve haberler (4. aşama). İçerik Tiptap JSON'u (editör 7. adımda aynı biçimi üretir). Yazar demo
 * "editor" kullanıcısı. Haberler hayalidir: kaynak "Demo içerik" olarak yazılır, gerçek bir kuruma atfedilmez, rakam
 * içermez. Kapak fotoğrafları Wikimedia Commons'tan (serbest lisanslı, gözle kontrol edilir).
 */

type Mark = { type: "bold" } | { type: "italic" } | { type: "link"; attrs: { href: string } }
type Inline = { type: "text"; text: string; marks?: Mark[] }
export type TiptapNode = { type: string; attrs?: Record<string, unknown>; content?: Array<TiptapNode | Inline> }

/** Metin parçası; `**kalın**` ve `[metin](adres)` kısayolları desteklenir. */
function inline(text: string): Inline[] {
  const out: Inline[] = []
  const re = /\*\*(.+?)\*\*|\[(.+?)\]\((.+?)\)/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    if (m.index > last) out.push({ type: "text", text: text.slice(last, m.index) })
    if (m[1]) out.push({ type: "text", text: m[1], marks: [{ type: "bold" }] })
    else out.push({ type: "text", text: m[2]!, marks: [{ type: "link", attrs: { href: m[3]! } }] })
    last = m.index + m[0].length
  }
  if (last < text.length) out.push({ type: "text", text: text.slice(last) })
  return out
}
const p = (text: string): TiptapNode => ({ type: "paragraph", content: inline(text) })
const h2 = (text: string): TiptapNode => ({ type: "heading", attrs: { level: 2 }, content: inline(text) })
const ul = (...items: string[]): TiptapNode => ({
  type: "bulletList",
  content: items.map((i) => ({ type: "listItem", content: [p(i)] })),
})
/** Vurgulu kutu: "tip" (İpucu, mor zemin) ya da "info" (başlıklı, çerçeveli). */
const callout = (tone: "tip" | "info", title: string, ...content: TiptapNode[]): TiptapNode => ({
  type: "callout",
  attrs: { tone, title },
  content,
})
const doc = (...content: TiptapNode[]): TiptapNode => ({ type: "doc", content })

export type DemoPost = {
  key: string
  type: "blog" | "news"
  category: string
  title: string
  excerpt: string
  /** Kaç gün önce yayınlandı. */
  daysAgo: number
  featured?: true
  country?: string
  tags?: string[]
  photo: string
  content: TiptapNode
}

export const demoPosts: DemoPost[] = [
  {
    key: "yedi-soru",
    type: "blog",
    category: "sahiplenme",
    title: "Sahiplenmeden önce kendinize sormanız gereken 7 soru",
    excerpt:
      "Zaman, bütçe, yaşam alanı ve uzun vadeli sorumluluk: kalıcı bir yuva olmaya hazır olup olmadığınızı anlamanın yolları.",
    daysAgo: 7,
    featured: true,
    tags: ["sahiplenme", "yeni-baslayanlar"],
    photo: "family adopting dog shelter",
    content: doc(
      p(
        "Bir hayvanı sahiplenmek on beş yıla varan bir söz demek. Karar vermeden önce şu soruları dürüstçe yanıtlayın."
      ),
      h2("Zamanım var mı?"),
      p(
        "Köpekler günde en az iki yürüyüş, kediler ise oyun ve ilgi ister. Yoğun bir dönemdeyseniz geçici yuva olmak daha uygun olabilir."
      ),
      h2("Yaşam alanım uygun mu?"),
      p("Kiradaysanız ev sahibinizle konuşun; balkon ve pencerelerin güvenli olması gerektiğini unutmayın."),
      h2("Beklenmedik masraflara hazır mıyım?"),
      ul("Düzenli aşı ve parazit uygulamaları", "Kısırlaştırma", "Acil veteriner ziyaretleri", "Mama ve kum"),
      callout(
        "tip",
        "İpucu",
        p("Sahiplenmeden önce birkaç hafta geçici yuva olmak, sorumluluğu denemenin iyi bir yoludur.")
      ),
      h2("Ailemdeki herkes istekli mi?"),
      p("Evdeki herkesin karara katılması, alerjilerin ve diğer hayvanlarla uyumun önceden konuşulması önemlidir.")
    ),
  },
  {
    key: "ilk-kedi",
    type: "blog",
    category: "sahiplenme",
    title: "İlk kez kedi sahiplenecekler için hazırlık listesi",
    excerpt: "Evi hazırlamaktan ilk veteriner ziyaretine kadar ilk hafta yapılacaklar.",
    daysAgo: 9,
    tags: ["kedi", "sahiplenme", "yeni-baslayanlar"],
    photo: "kitten new home",
    content: doc(
      p(
        "Yeni bir kediyle tanışmak heyecan verici; ama ilk günlerin rahat geçmesi biraz hazırlığa bağlı. Bu liste, sahiplenme gününden önce ve sonra yapmanız gerekenleri bir arada topluyor."
      ),
      h2("Evi hazırlayın"),
      p(
        "Kedinizin ilk günlerini geçireceği sessiz bir oda seçin. Pencere ve balkonları file ile güvenli hale getirin; kabloları ve küçük eşyaları toplayın."
      ),
      h2("Alınacaklar listesi"),
      ul(
        "Yaşına uygun mama, mama ve su kabı",
        "Kum kabı ve topaklanan kum",
        "Taşıma çantası",
        "Tırmalama tahtası ve birkaç oyuncak"
      ),
      callout(
        "tip",
        "İpucu",
        p(
          "Sahiplendiğiniz kişiden kedinin alıştığı mamanın adını isteyin; ilk haftalarda aynı mamayla devam etmek mide sorunlarını azaltır."
        )
      ),
      h2("İlk veteriner ziyareti"),
      p(
        "İlk hafta içinde genel kontrol, iç-dış parazit uygulaması ve aşı takvimi için bir veterinere başvurun. [Topluluğumuzda](/topluluk) deneyimli sahiplerden de tavsiye alabilirsiniz."
      ),
      h2("İlk hafta: sabır ve rutin"),
      p("Kediniz saklanabilir; bu normaldir. Mama saatlerini sabit tutun, onu zorlamadan yanına gelmesini bekleyin.")
    ),
  },
  {
    key: "kisirlastirma",
    type: "blog",
    category: "saglik",
    title: "Kısırlaştırma hakkında doğru bilinen yanlışlar",
    excerpt: "Kısırlaştırmanın zamanı, faydaları ve iyileşme süreci hakkında sık sorulanlar.",
    daysAgo: 11,
    tags: ["saglik", "kedi", "kopek"],
    photo: "cat wearing cone collar",
    content: doc(
      p(
        "Kısırlaştırma hem hayvanın sağlığı hem de sokaktaki yavru sayısının azalması için önemli bir adım. En sık duyduğumuz yanlışları derledik."
      ),
      h2('"Bir kez doğurması gerekir"'),
      p("Bu görüşün bilimsel bir dayanağı yok. Erken kısırlaştırma bazı hastalıkların riskini azaltır."),
      h2('"Kısırlaştırılan hayvan kilo alır"'),
      p("Metabolizma biraz yavaşlar; porsiyonu ayarlamak ve oyun süresini artırmak yeterlidir."),
      callout(
        "info",
        "İyileşme döneminde",
        ul("Yaka ya da body kullanın", "İlk günlerde zıplamasını sınırlayın", "Dikiş yerini her gün kontrol edin")
      )
    ),
  },
  {
    key: "kis-sokak",
    type: "blog",
    category: "bakim",
    title: "Kışın sokak hayvanlarına nasıl yardım edebiliriz?",
    excerpt: "Mama, su ve barınak desteği için mahallede uygulanabilecek basit adımlar.",
    daysAgo: 13,
    tags: ["sokak-hayvanlari", "kis"],
    photo: "cat in snow outdoors",
    content: doc(
      p(
        "Soğuk havalarda sokak hayvanlarının en çok ihtiyaç duyduğu şeyler kuru bir sığınak, donmamış su ve düzenli mamadır."
      ),
      h2("Kuru bir sığınak"),
      p("Strafor kutuların içine **saman** koyun; battaniye nemi tutar ve donabilir."),
      h2("Donmayan su"),
      p("Su kaplarını sabah ve akşam tazeleyin; koyu renkli kaplar güneşte daha geç donar."),
      callout(
        "tip",
        "İpucu",
        p("Komşularınızla mama ve su saatlerini paylaşarak düzenli bir besleme takvimi oluşturabilirsiniz.")
      )
    ),
  },
  {
    key: "yeni-kopek",
    type: "blog",
    category: "davranis",
    title: "Yeni köpeğiniz eve alışırken ilk iki hafta",
    excerpt: "Rutin oluşturmak, sınırları belirlemek ve güven kazanmak için öneriler.",
    daysAgo: 16,
    tags: ["kopek", "yeni-baslayanlar"],
    photo: "dog lying on sofa",
    content: doc(
      p(
        "Yeni evine gelen bir köpeğin çevresini tanıması zaman alır. İlk iki hafta sabırlı ve tutarlı olmak her şeyi kolaylaştırır."
      ),
      h2("Rutin oluşturun"),
      p("Yürüyüş, mama ve uyku saatlerini sabit tutun; tahmin edilebilir bir gün köpeğin kaygısını azaltır."),
      h2("Ödülle öğretin"),
      ul("Kısa ve sık eğitim seansları", "Doğru davranışa anında ödül", "Bağırmak yerine dikkatini başka yöne çekin")
    ),
  },
  {
    key: "yavru-beslenme",
    type: "blog",
    category: "beslenme",
    title: "Yavru kediler için beslenme rehberi",
    excerpt: "Kaç öğün, hangi mama ve ne zaman yetişkin mamasına geçilmeli?",
    daysAgo: 20,
    tags: ["kedi", "beslenme"],
    photo: "kitten eating",
    content: doc(
      p("Yavru kediler hızlı büyür; bu dönemde enerji ve protein ihtiyaçları yetişkinlerden yüksektir."),
      h2("Öğün sayısı"),
      p("İlk aylarda günde dört öğün, altı aydan sonra üç öğün yeterlidir."),
      h2("Yetişkin mamasına geçiş"),
      p("Geçişi bir yaş civarında, eski ve yeni mamayı birkaç gün karıştırarak yapın.")
    ),
  },
  {
    key: "gecici-yuva",
    type: "blog",
    category: "sahiplenme",
    title: "Geçici yuva olmak: neler beklemelisiniz?",
    excerpt: "Süre, masraflar ve sahiplendirme sürecinde geçici yuvanın rolü.",
    daysAgo: 24,
    tags: ["gecici-yuva", "sahiplenme"],
    photo: "kittens sleeping basket",
    content: doc(
      p("Geçici yuva, bir hayvanın kalıcı ailesini bulana kadar güvende kalmasını sağlar ve barınaklarda yer açar."),
      h2("Ne kadar sürer?"),
      p("Süre birkaç haftadan birkaç aya değişebilir; başlamadan önce ilan sahibiyle konuşun."),
      callout(
        "info",
        "Masraflar kime ait?",
        p("Çoğu barınak ve gönüllü grubu mama ve veteriner masraflarını karşılar; anlaşmayı baştan netleştirin.")
      )
    ),
  },
  {
    key: "kampanya",
    type: "news",
    category: "duyuru",
    title: "Belediyeden ücretsiz kısırlaştırma kampanyası",
    excerpt: "Kampanya kapsamında sahipli ve sahipsiz kedi ve köpekler için randevu alınabilecek.",
    daysAgo: 1,
    country: "TR",
    photo: "veterinary clinic dog",
    content: doc(
      p(
        "Demo haber: bir belediyenin veteriner işleri biriminin ücretsiz kısırlaştırma kampanyası başlattığı varsayılıyor."
      ),
      p(
        "Haber metni, editörün kaynaktaki bilgileri kendi cümleleriyle özetlediği bir örnektir; tarih, adres ve başvuru koşulları kaynaktan kontrol edilir."
      ),
      callout(
        "info",
        "Nasıl başvurulur?",
        ul(
          "Başvuru tarihleri: kaynakta belirtilir",
          "Başvuru yeri: belediye veteriner birimi",
          "Gerekenler: kimlik ve varsa aşı kartı"
        )
      )
    ),
  },
  {
    key: "avrupa",
    type: "news",
    category: "haber",
    title: "Avrupa'da sahiplendirme ilgisi artıyor",
    excerpt: "Barınaklar son yıllarda sahiplenmeye ilginin arttığını bildiriyor.",
    daysAgo: 2,
    country: "EU",
    photo: "animal shelter dogs",
    content: doc(
      p("Demo haber: Avrupa'daki bazı barınakların sahiplenmeye ilginin arttığını bildirdiği varsayılıyor."),
      p("Gerçek haberlerde editör, kaynağın verdiği bilgileri bağlamıyla birlikte ve kaynağa bağlantı vererek aktarır.")
    ),
  },
  {
    key: "sahiplendirme-gunu",
    type: "news",
    category: "etkinlik",
    title: "Hafta sonu sahiplendirme günü",
    excerpt: "Gönüllüler ve barınaklar bir araya gelerek sahiplendirme etkinliği düzenliyor.",
    daysAgo: 3,
    country: "TR",
    photo: "puppies playing grass",
    content: doc(
      p("Demo haber: gönüllüler ve barınakların bir parkta sahiplendirme etkinliği düzenlediği varsayılıyor."),
      ul(
        "Etkinlikte aşılı ve kısırlaştırılmış hayvanlar tanıtılır",
        "Sahiplenme görüşmeleri yerinde yapılır",
        "Mama ve malzeme bağışı kabul edilir"
      )
    ),
  },
  {
    key: "mikrocip",
    type: "news",
    category: "haber",
    title: "Kayıp hayvanlar için mikroçip zorunluluğu tartışılıyor",
    excerpt: "Mikroçip kaydının kayıp hayvanların sahiplerine dönüşünü hızlandırdığı vurgulanıyor.",
    daysAgo: 5,
    country: "DE",
    photo: "dog at veterinarian",
    content: doc(
      p("Demo haber: bir ülkede evcil hayvanlar için mikroçip zorunluluğunun tartışıldığı varsayılıyor."),
      p(
        "Mikroçip, kaybolan bir hayvanın sahibine ulaşmanın en güvenilir yollarından biridir; kayıt bilgilerinin güncel tutulması da önemlidir."
      )
    ),
  },
]

/** Demo etiketleri (slug → ad). */
export const demoTags: Record<string, string> = {
  sahiplenme: "sahiplenme",
  "yeni-baslayanlar": "yeni başlayanlar",
  kedi: "kedi",
  kopek: "köpek",
  saglik: "sağlık",
  beslenme: "beslenme",
  "sokak-hayvanlari": "sokak hayvanları",
  kis: "kış",
  "gecici-yuva": "geçici yuva",
}
