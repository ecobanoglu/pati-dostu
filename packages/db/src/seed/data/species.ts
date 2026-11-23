type Size = "small" | "medium" | "large"

export type SpeciesSeed = {
  name: string
  slug: string
  icon: string
  breeds: Array<{ name: string; size?: Size }>
}

/** Her türün ilk ırkı "Melez / Bilinmiyor" olarak eklenir (seed betiğinde). */
export const speciesSeed: SpeciesSeed[] = [
  {
    name: "Kedi",
    slug: "kedi",
    icon: "cat",
    breeds: [
      { name: "Tekir" },
      { name: "Van Kedisi" },
      { name: "Ankara Kedisi" },
      { name: "British Shorthair" },
      { name: "Scottish Fold" },
      { name: "İran Kedisi (Persian)" },
      { name: "Exotic Shorthair" },
      { name: "Himalaya Kedisi" },
      { name: "Siyam Kedisi" },
      { name: "Rus Mavisi" },
      { name: "Maine Coon" },
      { name: "Ragdoll" },
      { name: "Norveç Orman Kedisi" },
      { name: "Bengal" },
      { name: "Sfenks" },
      { name: "Habeş Kedisi (Abyssinian)" },
    ],
  },
  {
    name: "Köpek",
    slug: "kopek",
    icon: "dog",
    breeds: [
      { name: "Kangal", size: "large" },
      { name: "Akbaş", size: "large" },
      { name: "Kars Çoban Köpeği", size: "large" },
      { name: "Alman Çoban Köpeği", size: "large" },
      { name: "Golden Retriever", size: "large" },
      { name: "Labrador Retriever", size: "large" },
      { name: "Sibirya Kurdu (Husky)", size: "large" },
      { name: "Samoyed", size: "large" },
      { name: "Rottweiler", size: "large" },
      { name: "Doberman", size: "large" },
      { name: "Cane Corso", size: "large" },
      { name: "Boxer", size: "large" },
      { name: "Dalmaçyalı", size: "large" },
      { name: "Border Collie", size: "medium" },
      { name: "Beagle", size: "medium" },
      { name: "Cocker Spaniel", size: "medium" },
      { name: "Fransız Bulldog", size: "small" },
      { name: "İngiliz Bulldog", size: "medium" },
      { name: "Pug", size: "small" },
      { name: "Poodle", size: "medium" },
      { name: "Toy Poodle", size: "small" },
      { name: "Shih Tzu", size: "small" },
      { name: "Maltese Terrier", size: "small" },
      { name: "Yorkshire Terrier", size: "small" },
      { name: "Jack Russell Terrier", size: "small" },
      { name: "Pomeranian", size: "small" },
      { name: "Chihuahua", size: "small" },
      { name: "Cavalier King Charles Spaniel", size: "small" },
    ],
  },
  {
    name: "Kuş",
    slug: "kus",
    icon: "bird",
    breeds: [
      { name: "Muhabbet Kuşu" },
      { name: "Sultan Papağanı" },
      { name: "Cennet Papağanı" },
      { name: "Jako Papağanı" },
      { name: "Kanarya" },
      { name: "Zebra İspinozu" },
      { name: "Güvercin" },
    ],
  },
  {
    name: "Tavşan",
    slug: "tavsan",
    icon: "rabbit",
    breeds: [
      { name: "Hollanda Lop" },
      { name: "Mini Lop" },
      { name: "Aslan Baş" },
      { name: "Cüce Tavşan (Netherland Dwarf)" },
      { name: "Rex" },
      { name: "Angora Tavşanı" },
      { name: "Kaliforniya Tavşanı" },
    ],
  },
]
