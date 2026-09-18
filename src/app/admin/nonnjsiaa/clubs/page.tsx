import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import { ClubsClient } from './ClubsClient'

export const dynamic = 'force-dynamic'

export default async function ClubsPage() {
  const sb = await createSupabaseServer()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/admin/login')

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="mb-8">
        <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold mb-1">Non-NJSIAA Tracking</p>
        <h1 className="text-lg font-bold text-slate-900">Club Profiles</h1>
        <p className="text-sm text-slate-500 mt-1">
          Club programs that appear in MS and HS off-season results. Clubs are matched during
          import so all results for a program link to one profile.
        </p>
      </div>
      <ClubsClient />
    </div>
  )
}
