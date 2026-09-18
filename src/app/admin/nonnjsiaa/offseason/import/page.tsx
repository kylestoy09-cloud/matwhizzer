import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import { HsOffseasonImportClient } from './HsOffseasonImportClient'

export const dynamic = 'force-dynamic'

export default async function HsOffseasonImportPage({
  searchParams,
}: {
  searchParams: { tournament?: string }
}) {
  const sb = await createSupabaseServer()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/admin/login')

  const preselectedId = searchParams.tournament ? Number(searchParams.tournament) : null

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="mb-8">
        <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold mb-1">Non-NJSIAA · HS Off-Season</p>
        <h1 className="text-lg font-bold text-slate-900">Import Results</h1>
        <p className="text-sm text-slate-500 mt-1">
          Paste podium results text, review placements, then match wrestlers and clubs. Results are reference-only — no hammer score impact.
        </p>
      </div>
      <HsOffseasonImportClient preselectedTournamentId={preselectedId} />
    </div>
  )
}
