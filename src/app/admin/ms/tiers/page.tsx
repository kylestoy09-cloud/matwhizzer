import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import { MsTiersClient } from './MsTiersClient'

export const dynamic = 'force-dynamic'

export default async function MsTiersPage() {
  const sb = await createSupabaseServer()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/admin/login')

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="mb-8">
        <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold mb-1">Middle School Prospects</p>
        <h1 className="text-lg font-bold text-slate-900">Tournament Tiers</h1>
        <p className="text-sm text-slate-500 mt-1">
          Define tiers for MS tournaments and set the postseason credit each placement earns.
          Credits are on the same 0–50 scale as the hammer score postseason component.
        </p>
      </div>
      <MsTiersClient />
    </div>
  )
}
