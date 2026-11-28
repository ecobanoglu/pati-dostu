import { Suspense } from "react"

import { BlogHighlights, BlogHighlightsFallback } from "@/features/home/blog-highlights"
import { CommunityQuestions, CommunityQuestionsFallback } from "@/features/home/community-questions"
import { Hero } from "@/features/home/hero"
import { LatestListings, LatestListingsFallback } from "@/features/home/latest-listings"

/**
 * Anasayfa — / (tasarım 01-anasayfa, 16-mobil-anasayfa): hero arama, "En yeni ilanlar", "Topluluktan sorular" ve
 * "Blogdan son yazılar". Sekme başlığı ve açıklama kök düzenden.
 */
export default function HomePage() {
  return (
    <>
      <Hero />
      <Suspense fallback={<LatestListingsFallback />}>
        <LatestListings />
      </Suspense>
      <Suspense fallback={<CommunityQuestionsFallback />}>
        <CommunityQuestions />
      </Suspense>
      <Suspense fallback={<BlogHighlightsFallback />}>
        <BlogHighlights />
      </Suspense>
    </>
  )
}
