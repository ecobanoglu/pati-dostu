/** İlan listesi yüklenirken: başlık bandı ve kart iskeletleri (yerleşim kaymasın diye aynı ölçülerde). */
export function ListingsFallback() {
  return (
    <div aria-hidden="true">
      <div className="bg-smoke">
        <div className="mx-auto max-w-site px-4 py-5 lg:px-6 lg:py-8">
          <div className="h-4 w-40 rounded bg-background/70" />
          <div className="mt-3 h-10 w-64 rounded bg-background/70" />
        </div>
      </div>
      <div className="mx-auto grid max-w-site gap-6 px-4 py-5 lg:grid-cols-[300px_minmax(0,1fr)] lg:px-6 lg:py-8">
        <div className="hidden h-[600px] rounded-card bg-smoke-2 lg:block" />
        <ul className="grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <li key={i} className="overflow-hidden rounded-card border border-border">
              <div className="aspect-[4/3] animate-pulse bg-smoke-2" />
              <div className="space-y-2 p-4">
                <div className="h-4 w-3/4 rounded bg-smoke-2" />
                <div className="h-3 w-1/2 rounded bg-smoke-2" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
