import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import { AdminBackButton } from '@/app/admin/AdminBackButton'
import { TrackTeamsReview } from './TrackTeamsReview'

export const dynamic = 'force-dynamic'

// Preseason step 1 (Kyle 2026-11-28). Boys and girls each review their own Track list and their own tables.
export default async function SchoolDataReviewPage({ params }: { params: Promise<{ side: string }> }) {
  const { side } = await params
  const girls = side === 'girls'
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')
  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-2"><AdminBackButton /></div>
      <h1 className="text-2xl font-bold text-slate-900">School Data Review — {girls ? 'Girls' : 'Boys'}</h1>
      <p className="mb-6 mt-1 text-sm text-slate-500">
        Preseason step 1. Each team on TrackWrestling’s Teams page is matched to our school, its district and region checked
        against ours, and Track’s names and abbreviation saved so the roster and schedule imports match by them. A team we
        don’t have can be added as a new school.
      </p>
      <TrackTeamsReview side={girls ? 'girls' : 'boys'} />
    </div>
  )
}
