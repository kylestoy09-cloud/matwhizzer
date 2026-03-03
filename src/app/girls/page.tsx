import { supabase } from '@/lib/supabase'
import Link from 'next/link'

type WrestlerRow = { id: string; first_name: string; last_name: string }

export default async function GirlsSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q: raw } = await searchParams
  const q = raw?.trim() ?? ''

  let wrestlers: WrestlerRow[] = []

  if (q.length >= 2) {
    const { data } = await supabase
      .from('wrestlers')
      .select('id, first_name, last_name')
      .eq('gender', 'F')
      .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%`)
      .order('last_name')
      .order('first_name')
      .limit(30)
    wrestlers = (data ?? []) as WrestlerRow[]
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-rose-800 mb-6">Girls Wrestler Search</h1>

      <form method="GET" className="mb-8">
        <div className="flex gap-2">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Search by first or last name…"
            autoComplete="off"
            autoFocus
            className="flex-1 border border-slate-300 rounded-lg px-4 py-2.5 text-base
                       shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
          />
          <button
            type="submit"
            className="bg-rose-800 text-white px-5 py-2.5 rounded-lg font-medium
                       hover:bg-rose-700 transition-colors"
          >
            Search
          </button>
        </div>
      </form>

      {q.length > 0 && q.length < 2 && (
        <p className="text-slate-500 text-sm">Enter at least 2 characters.</p>
      )}

      {q.length >= 2 && wrestlers.length === 0 && (
        <p className="text-slate-500 text-sm">
          No girls wrestlers found for <strong>&ldquo;{q}&rdquo;</strong>.
        </p>
      )}

      {wrestlers.length > 0 && (
        <ul className="divide-y divide-slate-200 border border-slate-200 rounded-lg
                        overflow-hidden shadow-sm bg-white">
          {wrestlers.map(w => (
            <li key={w.id}>
              <Link
                href={`/wrestler/${w.id}`}
                className="flex items-center px-4 py-3 hover:bg-rose-50 transition-colors"
              >
                <span className="font-medium text-slate-800">
                  {w.first_name} {w.last_name}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
