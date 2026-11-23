import type { LocalizedText } from "../../schema/_common.js"

type Size = "small" | "medium" | "large"

export type SpeciesSeed = {
  name: LocalizedText & { en: string }
  slug: string
  icon: string
  breeds: Array<{ name: LocalizedText & { en: string }; size?: Size }>
}

/** Her türün ilk ırkı olarak eklenen seçenek (slug: "melez"). */
export const mixedBreedName = { tr: "Melez / Bilinmiyor", en: "Mixed / Unknown" }

/** Türler ve ırkları. Slug Türkçe addan üretilir; "Melez / Bilinmiyor" seed betiğinde her türe eklenir. */
export const speciesSeed: SpeciesSeed[] = [
  {
    name: { tr: "Kedi", en: "Cat" },
    slug: "kedi",
    icon: "cat",
    breeds: [
      { name: { tr: "Tekir", en: "Tabby" } },
      { name: { tr: "Van Kedisi", en: "Turkish Van" } },
      { name: { tr: "Ankara Kedisi", en: "Turkish Angora" } },
      { name: { tr: "British Shorthair", en: "British Shorthair" } },
      { name: { tr: "Scottish Fold", en: "Scottish Fold" } },
      { name: { tr: "İran Kedisi (Persian)", en: "Persian" } },
      { name: { tr: "Exotic Shorthair", en: "Exotic Shorthair" } },
      { name: { tr: "Himalaya Kedisi", en: "Himalayan" } },
      { name: { tr: "Siyam Kedisi", en: "Siamese" } },
      { name: { tr: "Rus Mavisi", en: "Russian Blue" } },
      { name: { tr: "Maine Coon", en: "Maine Coon" } },
      { name: { tr: "Ragdoll", en: "Ragdoll" } },
      { name: { tr: "Norveç Orman Kedisi", en: "Norwegian Forest Cat" } },
      { name: { tr: "Bengal", en: "Bengal" } },
      { name: { tr: "Sfenks", en: "Sphynx" } },
      { name: { tr: "Habeş Kedisi (Abyssinian)", en: "Abyssinian" } },
    ],
  },
  {
    name: { tr: "Köpek", en: "Dog" },
    slug: "kopek",
    icon: "dog",
    breeds: [
      { name: { tr: "Kangal", en: "Kangal" }, size: "large" },
      { name: { tr: "Akbaş", en: "Akbash" }, size: "large" },
      { name: { tr: "Kars Çoban Köpeği", en: "Kars Shepherd Dog" }, size: "large" },
      { name: { tr: "Alman Çoban Köpeği", en: "German Shepherd" }, size: "large" },
      { name: { tr: "Golden Retriever", en: "Golden Retriever" }, size: "large" },
      { name: { tr: "Labrador Retriever", en: "Labrador Retriever" }, size: "large" },
      { name: { tr: "Sibirya Kurdu (Husky)", en: "Siberian Husky" }, size: "large" },
      { name: { tr: "Samoyed", en: "Samoyed" }, size: "large" },
      { name: { tr: "Rottweiler", en: "Rottweiler" }, size: "large" },
      { name: { tr: "Doberman", en: "Dobermann" }, size: "large" },
      { name: { tr: "Cane Corso", en: "Cane Corso" }, size: "large" },
      { name: { tr: "Boxer", en: "Boxer" }, size: "large" },
      { name: { tr: "Dalmaçyalı", en: "Dalmatian" }, size: "large" },
      { name: { tr: "Border Collie", en: "Border Collie" }, size: "medium" },
      { name: { tr: "Beagle", en: "Beagle" }, size: "medium" },
      { name: { tr: "Cocker Spaniel", en: "Cocker Spaniel" }, size: "medium" },
      { name: { tr: "Fransız Bulldog", en: "French Bulldog" }, size: "small" },
      { name: { tr: "İngiliz Bulldog", en: "English Bulldog" }, size: "medium" },
      { name: { tr: "Pug", en: "Pug" }, size: "small" },
      { name: { tr: "Poodle", en: "Poodle" }, size: "medium" },
      { name: { tr: "Toy Poodle", en: "Toy Poodle" }, size: "small" },
      { name: { tr: "Shih Tzu", en: "Shih Tzu" }, size: "small" },
      { name: { tr: "Maltese Terrier", en: "Maltese" }, size: "small" },
      { name: { tr: "Yorkshire Terrier", en: "Yorkshire Terrier" }, size: "small" },
      { name: { tr: "Jack Russell Terrier", en: "Jack Russell Terrier" }, size: "small" },
      { name: { tr: "Pomeranian", en: "Pomeranian" }, size: "small" },
      { name: { tr: "Chihuahua", en: "Chihuahua" }, size: "small" },
      { name: { tr: "Cavalier King Charles Spaniel", en: "Cavalier King Charles Spaniel" }, size: "small" },
    ],
  },
  {
    name: { tr: "Kuş", en: "Bird" },
    slug: "kus",
    icon: "bird",
    breeds: [
      { name: { tr: "Muhabbet Kuşu", en: "Budgerigar" } },
      { name: { tr: "Sultan Papağanı", en: "Cockatiel" } },
      { name: { tr: "Cennet Papağanı", en: "Lovebird" } },
      { name: { tr: "Jako Papağanı", en: "African Grey Parrot" } },
      { name: { tr: "Kanarya", en: "Canary" } },
      { name: { tr: "Zebra İspinozu", en: "Zebra Finch" } },
      { name: { tr: "Güvercin", en: "Pigeon" } },
    ],
  },
  {
    name: { tr: "Tavşan", en: "Rabbit" },
    slug: "tavsan",
    icon: "rabbit",
    breeds: [
      { name: { tr: "Hollanda Lop", en: "Holland Lop" } },
      { name: { tr: "Mini Lop", en: "Mini Lop" } },
      { name: { tr: "Aslan Baş", en: "Lionhead" } },
      { name: { tr: "Cüce Tavşan (Netherland Dwarf)", en: "Netherland Dwarf" } },
      { name: { tr: "Rex", en: "Rex" } },
      { name: { tr: "Angora Tavşanı", en: "Angora Rabbit" } },
      { name: { tr: "Kaliforniya Tavşanı", en: "Californian" } },
    ],
  },
]
