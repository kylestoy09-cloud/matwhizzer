import Link from 'next/link'

export default function PostSeasonPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Post Season</h1>
      <p className="text-slate-500 text-sm mb-10">Select a category to explore post-season results.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/postseason/individual/boys"
          className="group block border border-black bg-white hover:bg-slate-50 transition-colors p-8"
        >
          <div className="text-3xl mb-3">🏅</div>
          <h2 className="text-lg font-bold text-slate-900 mb-1">Individual</h2>
          <p className="text-sm text-slate-500">State champions, podium finishes, rankings, and tournament brackets.</p>
          <p className="text-xs text-slate-400 mt-3 group-hover:text-slate-600 transition-colors">Boys →</p>
        </Link>

        <Link
          href="/postseason/team"
          className="group block border border-black bg-white hover:bg-slate-50 transition-colors p-8"
        >
          <div className="text-3xl mb-3">🏆</div>
          <h2 className="text-lg font-bold text-slate-900 mb-1">Team</h2>
          <p className="text-sm text-slate-500">Post-season team results and standings.</p>
          <p className="text-xs text-slate-400 mt-3 group-hover:text-slate-600 transition-colors">Coming soon →</p>
        </Link>
      </div>

      <div className="mt-6 flex gap-3">
        <Link
          href="/postseason/individual/boys"
          className="text-sm text-slate-600 hover:text-slate-900 underline underline-offset-2"
        >
          Individual — Boys
        </Link>
        <span className="text-slate-300">·</span>
        <Link
          href="/postseason/individual/girls"
          className="text-sm text-slate-600 hover:text-slate-900 underline underline-offset-2"
        >
          Individual — Girls
        </Link>
      </div>
    </div>
  )
}
