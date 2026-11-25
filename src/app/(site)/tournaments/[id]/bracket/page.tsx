import { supabase } from '@/lib/supabase/public-cached'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { loadTournamentBrackets } from '@/lib/tournamentBrackets'
import { getSiteLook } from '@/lib/siteLookServer'
import { TournamentBracketClient } from './TournamentBracketClient'
import { NjIcon } from '@/components/site/NjIcon'

export const revalidate = 60

// The bracket from the tournament's bouts (Kyle 2026-11-20: finished tournaments showed "TBD" — the old slot table was
// filled for one tournament, half-way). Every tournament with bouts, every year, gets one (src/lib/boutBracket.ts).
export default async function BracketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await loadTournamentBrackets(supabase as never, id)
  if (!data) notFound()
  const { tournament, weights, brackets, mixed } = data
  const look = (await getSiteLook()).bracket
  const backHref = `/tournaments/${id}`
  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <Link href={backHref} className="text-sm text-slate-500 hover:text-slate-700 hover:underline mb-6 inline-block">← {tournament.name}</Link>
      {weights.length === 0 ? (
        <div className="border border-dashed border-slate-300 py-16 text-center">
          <p className="text-sm text-slate-400">No bouts have been entered for this tournament yet.</p>
        </div>
      ) : (
        <>
        {mixed && (
          <p className="mb-3 flex items-center gap-1.5 text-xs text-slate-500"><NjIcon /> NJSIAA wrestler</p>
        )}
        <TournamentBracketClient tournamentName={`${tournament.name} ${tournament.season ?? ''}`.trim()} weights={weights} brackets={brackets} look={look} mixed={mixed} />
        </>
      )}
    </div>
  )
}
