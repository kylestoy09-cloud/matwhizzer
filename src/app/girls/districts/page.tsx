import Link from 'next/link'

export default function GirlsDistrictsPage() {
  const districts = Array.from({ length: 12 }, (_, i) => i + 1)

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <Link
        href="/girls"
        className="inline-flex items-center text-sm text-slate-500 hover:text-slate-800 mb-6 transition-colors"
      >
        ← Girls Search
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-rose-900">Girls District Brackets</h1>
        <p className="text-slate-500 text-sm mt-1">NJSIAA 2025–26 · Select a district</p>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
        {districts.map(d => (
          <Link
            key={d}
            href={`/girls/districts/${d}`}
            className="flex flex-col items-center justify-center aspect-square rounded-lg border border-rose-200 bg-white hover:bg-rose-50 hover:border-rose-400 transition-colors shadow-sm"
          >
            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wide leading-none mb-0.5">Dist.</span>
            <span className="text-xl font-bold text-slate-800">{d}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
