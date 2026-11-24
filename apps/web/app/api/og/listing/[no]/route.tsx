import { renderShareImage } from "@/features/share-image/render"
import { getListing } from "@/lib/listings"
import { shareImageQuerySchema } from "@/lib/share-image"

/**
 * İlan paylaşım görseli (PNG): /api/og/listing/{ilanNo}?t=şablon&f=post|story&o=0|1&l=tr|en.
 * Yalnızca yayındaki ilan için üretilir (değilse 404); telefon numarası görselde yer almaz.
 */
export async function GET(request: Request, { params }: RouteContext<"/api/og/listing/[no]">) {
  const { no } = await params
  const url = new URL(request.url)
  const query = shareImageQuerySchema.safeParse(Object.fromEntries(url.searchParams))
  if (!/^\d{1,9}$/.test(no) || !query.success) return new Response("Bad request", { status: 400 })

  const listing = await getListing(Number(no), query.data.l)
  if (!listing) return new Response("Not found", { status: 404 })

  return renderShareImage(listing, {
    template: query.data.t,
    format: query.data.f,
    features: query.data.o,
    locale: query.data.l,
    origin: url.origin,
  })
}
