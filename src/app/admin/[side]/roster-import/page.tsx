import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import { AdminBackButton } from '@/app/admin/AdminBackButton'
import { RosterImportClient } from './RosterImportClient'

export const dynamic = 'force-dynamic'

// Preseason step 3 (Kyle 2026-11-28). Boys and girls each load their own Track rosters into their own tables.
export default async function RosterImportPage({ params }: { params: Promise<{ side: string }> }) {
  const { side } = await params
  const girls = side === 'girls'
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')
  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-2"><AdminBackButton /></div>
      <h1 className="text-2xl font-bold text-slate-900">Roster Import — {girls ? 'Girls' : 'Boys'}</h1>
      <p className="mb-6 mt-1 text-sm text-slate-500">
        Preseason step 3. Each school’s Track roster is checked against what last season’s rollover expects there: the same
        names in the next grade. Exact matches are confirmed; close spellings, grade differences, possible transfers and new
        names (not freshmen) come here to review. School pages show the confirmed wrestlers who wrestled varsity last season;
        the rest are stored until their first varsity match.
      </p>
      <RosterImportClient side={girls ? 'girls' : 'boys'} />
    </div>
  )
}
