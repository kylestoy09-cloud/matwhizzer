import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import { MsWrestlersClient } from './MsWrestlersClient'

export const dynamic = 'force-dynamic'

export default async function MsWrestlersPage() {
  const sb = await createSupabaseServer()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/admin/login')

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="mb-8">
        <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold mb-1">Middle School Prospects</p>
        <h1 className="text-lg font-bold text-slate-900">Wrestler Profiles</h1>
        <p className="text-sm text-slate-500 mt-1">
          All wrestlers who have podium finishes in the MS database. Link a profile to a HS wrestler record
          to apply the postseason credit to their hammer score.
        </p>
      </div>
      <MsWrestlersClient />
    </div>
  )
}
