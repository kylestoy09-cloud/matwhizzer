import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import { AdminBackButton } from '@/app/admin/AdminBackButton'
import { TeamRankingsClientBoys } from './TeamRankingsClientBoys'
import { RATING_SHORT } from '@/lib/rating'

export const dynamic = 'force-dynamic'

export default async function TeamRankingsPage() {
  const sb = await createSupabaseServer()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/admin/login')

  return (
    <div className="max-w-5xl mx-auto px-4 pt-4 pb-16">
      <AdminBackButton />
      <h1 className="text-xl font-bold text-slate-900 mt-4 mb-1">Team Rankings — Boys</h1>
      <p className="text-sm text-slate-500 mb-8">
        Select a scope to view computed variants, edit the team ranked list, and publish.
        Seed from live Power Points or from Returning {RATING_SHORT} Strength (non-seniors only).
      </p>
      <TeamRankingsClientBoys />
    </div>
  )
}
