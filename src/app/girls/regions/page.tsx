import Link from 'next/link'

const REGIONS = [
  { slug: 'central', label: 'Central' },
  { slug: 'north-1', label: 'North 1' },
  { slug: 'north-2', label: 'North 2' },
  { slug: 'south',   label: 'South' },
]

export default function GirlsRegionsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <Link
        href="/girls"
        className="inline-flex items-center text-sm text-slate-500 hover:text-slate-800 mb-6 transition-colors"
      >
        ← Girls Search
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-rose-900">Girls Region Brackets</h1>
        <p className="text-slate-500 text-sm mt-1">NJSIAA 2024–25 · Select a region</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {REGIONS.map(r => (
          <Link
            key={r.slug}
            href={`/girls/regions/${r.slug}`}
            className="flex flex-col items-center justify-center py-8 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-300 transition-colors shadow-sm"
          >
            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wide leading-none mb-1">Region</span>
            <span className="text-xl font-bold text-slate-800">{r.label}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
