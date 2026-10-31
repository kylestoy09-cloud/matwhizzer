import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import { MsTournamentsClient } from './MsTournamentsClient'

export const dynamic = 'force-dynamic'

export default async function MsTournamentsPage() {
  const sb = await createSupabaseServer()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/admin/login')

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="mb-8">
        <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold mb-1">Middle School Prospects</p>
        <h1 className="text-lg font-bold text-slate-900">Tournaments</h1>
        <p className="text-sm text-slate-500 mt-1">
          Create MS tournament events and assign them a tier. Each event stores its placements separately — the same tournament name recurs across seasons as separate records.
        </p>
      </div>
      <MsTournamentsClient />
    </div>
  )
}
