import { Suspense } from "react"

import { Hero } from "@/features/home/hero"
import { LatestListings, LatestListingsFallback } from "@/features/home/latest-listings"

/**
 * Anasayfa — / (tasarım 01-anasayfa, 16-mobil-anasayfa): hero arama ve "En yeni ilanlar".
 * "Topluluktan sorular" ve "Blogdan son yazılar" 4. aşamada eklenecek. Sekme başlığı ve açıklama kök düzenden.
 */
export default function HomePage() {
  return (
    <>
      <Hero />
      <Suspense fallback={<LatestListingsFallback />}>
        <LatestListings />
      </Suspense>
    </>
  )
}
