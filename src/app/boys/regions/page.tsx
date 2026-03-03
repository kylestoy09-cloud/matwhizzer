import Link from 'next/link'

export default function BoysRegionsPage() {
  const regions = Array.from({ length: 8 }, (_, i) => i + 1)

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <Link
        href="/boys"
        className="inline-flex items-center text-sm text-slate-500 hover:text-slate-800 mb-6 transition-colors"
      >
        ← Boys Search
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Boys Region Brackets</h1>
        <p className="text-slate-500 text-sm mt-1">NJSIAA 2024–25 · Select a region</p>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
        {regions.map(r => (
          <Link
            key={r}
            href={`/boys/regions/${r}`}
            className="flex flex-col items-center justify-center aspect-square rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-400 transition-colors shadow-sm"
          >
            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wide leading-none mb-0.5">Reg.</span>
            <span className="text-xl font-bold text-slate-800">{r}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
