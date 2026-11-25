import { supabase } from '@/lib/supabase/public-cached'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { SupabaseClient } from '@supabase/supabase-js'
import { seriesHistory } from '@/lib/tournamentSeriesHistory'
import { TournamentHistoryClient } from './TournamentHistoryClient'

export const revalidate = 300

// A tournament's history (Kyle 2026-11-20): every year we have, its podiums, multi-time champions and placers, and the
// most consolation wins (src/lib/tournamentSeriesHistory.ts)
export default async function TournamentHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [{ data: b }, { data: g }] = await Promise.all([
    supabase.from('in_season_tournaments').select('id, name').eq('id', id).maybeSingle(),
    supabase.from('in_season_tournaments_girls').select('id, name').eq('id', id).maybeSingle(),
  ])
  const t = b ?? g
  if (!t) notFound()
  const h = await seriesHistory(supabase as unknown as SupabaseClient, id, b ? 'M' : 'F')
  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <Link href={`/tournaments/${id}`} className="text-sm text-slate-500 hover:text-slate-700 hover:underline mb-6 inline-block">← {t.name}</Link>
      <h1 className="text-xl font-bold text-slate-900 mb-1">{t.name}</h1>
      <p className="text-xs text-slate-400 uppercase tracking-widest mb-6">History · {h.years.length} year{h.years.length === 1 ? '' : 's'} on file</p>
      <TournamentHistoryClient history={h} />
    </div>
  )
}
