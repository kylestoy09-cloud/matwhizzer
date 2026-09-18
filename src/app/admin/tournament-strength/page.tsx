import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServer } from '@/lib/supabase/server'
import { TournamentStrengthClient } from './TournamentStrengthClient'

export const dynamic = 'force-dynamic'

export default async function TournamentStrengthPage() {
  const sb = await createSupabaseServer()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/admin/login')

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/admin" className="text-xs text-slate-400 hover:text-slate-700 transition-colors">← Admin</Link>
        <span className="text-slate-200">/</span>
        <h1 className="text-lg font-bold text-slate-900">Tournament Strength Report</h1>
      </div>

      <div className="mb-6">
        <p className="text-sm text-slate-600">
          For each in-season tournament: assign a point value for Hammer Score calculation, then see how many wrestlers competed who were district champions, region top-4 finishers, or state qualifiers in the prior postseason.
        </p>
        <p className="text-xs text-slate-400 mt-1">
          Bracket column shows which placement rounds have data: <span className="font-mono">F</span> = Finals (1st/2nd) · <span className="font-mono">3rd</span> = 3rd Place match · <span className="font-mono">5th</span> · <span className="font-mono">7th</span> · Green = data exists · Red = needed but missing
        </p>
      </div>

      <TournamentStrengthClient />
    </div>
  )
}
