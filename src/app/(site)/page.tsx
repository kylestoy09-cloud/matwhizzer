import { FlipbookHero } from '@/components/FlipbookHero'

// Header height = 57px (row 1) + 41px (row 2) + 41px (row 3) = 139px.
// dvh (not vh) so mobile browser chrome doesn't cause overflow.
const HEADER_H = 139

export default function RootPage() {
  return (
    <div
      className="flex items-center justify-center"
      style={{ minHeight: `calc(100dvh - ${HEADER_H}px)` }}
    >
      {/* Preload sprite so it's in cache before FlipbookHero mounts.
          type="image/avif" lets non-AVIF browsers skip this download entirely.
          fetchPriority="high" is correct: this is the LCP element for supporting browsers. */}
      <link rel="preload" as="image" href="/flipbook.avif" type="image/avif" fetchPriority="high" />
      <FlipbookHero />
    </div>
  )
}
