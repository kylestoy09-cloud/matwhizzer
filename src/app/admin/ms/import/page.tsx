import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import { MsImportClient } from './MsImportClient'

export const dynamic = 'force-dynamic'

export default async function MsImportPage({
  searchParams,
}: {
  searchParams: Promise<{ tournament_id?: string }>
}) {
  const sb = await createSupabaseServer()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/admin/login')

  const { tournament_id } = await searchParams
  const preselectedId = tournament_id ? parseInt(tournament_id, 10) : null

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="mb-8">
        <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold mb-1">Middle School Prospects</p>
        <h1 className="text-lg font-bold text-slate-900">Import Results</h1>
        <p className="text-sm text-slate-500 mt-1">
          Paste tournament placement text. The parser extracts podium finishes (places 1–8) by weight class.
          Review and edit before saving.
        </p>
      </div>
      <MsImportClient preselectedTournamentId={preselectedId} />
    </div>
  )
}
