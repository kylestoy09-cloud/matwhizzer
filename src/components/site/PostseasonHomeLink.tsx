// Back to the year's playoff page (Kyle 2026-11-14: "when we go into a season and then pull up a region, we need a link
// to go back to that season's post season home page"). /postseason/individual/<side> shows the same season (the
// season pick is remembered), so the link names it: "← 2016-17 Boys Post Season".
import Link from 'next/link'

export function PostseasonHomeLink({ side, season, options }: { side: 'boys' | 'girls'; season: number; options: { id: number; label: string }[] }) {
  const label = options.find(o => o.id === season)?.label ?? ''
  return (
    <Link href={`/postseason/individual/${side}`} className="inline-flex items-center text-sm text-slate-500 hover:text-slate-800 mb-4 transition-colors">
      ← {label} {side === 'boys' ? 'Boys' : 'Girls'} Post Season
    </Link>
  )
}
