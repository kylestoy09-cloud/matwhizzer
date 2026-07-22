import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import { AdminBackButton } from '../AdminBackButton'
import { TournamentImportClient } from './TournamentImportClient'

export const dynamic = 'force-dynamic'

export default async function ImportTournamentPage() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="mb-2">
        <AdminBackButton />
      </div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Tournament Bout Import</h1>
        <p className="text-sm text-slate-500 mt-1">
          Upload a JSON file produced by{' '}
          <code className="font-mono text-xs bg-slate-100 px-1 py-0.5 rounded">
            python scripts/import_pipe_csv.py --json-out out.json &lt;csv&gt;
          </code>
          {' '}to review and import bouts.
        </p>
      </div>
      <TournamentImportClient />
    </div>
  )
}
