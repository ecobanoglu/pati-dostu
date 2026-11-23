import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

/**
 * globals.css içindeki özel ölçüleri tailwind-merge'e tanıtır.
 * Bu olmadan twMerge "text-h1"i renk sanır ve "text-heading text-h1"
 * birleşiminde başlık rengini siler; "rounded-card"ı da tanımadığı için
 * "rounded-lg" ile çakıştığında ikisini birden bırakır.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["display", "h1", "h2", "h3", "h4", "h5", "h6", "article"],
      radius: ["card", "dialog", "sheet"],
      shadow: ["pop", "dialog", "poster"],
      spacing: ["tap"],
      container: ["site", "prose"],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
