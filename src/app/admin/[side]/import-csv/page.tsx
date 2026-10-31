import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import { AdminBackButton } from '@/app/admin/AdminBackButton'
import { CsvImportClient } from './CsvImportClient'

export const dynamic = 'force-dynamic'

export default async function ImportCsvPage() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="mb-2">
        <AdminBackButton />
      </div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">CSV Tournament Import</h1>
        <p className="text-sm text-slate-500 mt-1">
          Upload a TournamentWrestling CSV export. Wrestlers are matched by first initial + last name + school.
          Review flags, then import bouts and seeds.
        </p>
        <p className="text-xs text-slate-400 font-mono mt-1">
          Expected columns: weight, match, round, result, seed1, name1, team1, score1, seed2, name2, team2, score2
        </p>
      </div>
      <CsvImportClient />
    </div>
  )
}
