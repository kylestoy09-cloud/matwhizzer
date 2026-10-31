import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/service'
import { AdminBackButton } from '@/app/admin/AdminBackButton'
import { SchoolDirectoryLink } from './SchoolDirectoryLink'
import { SchoolEnrollmentPanel } from './SchoolEnrollmentPanel'

export const dynamic = 'force-dynamic'

export default async function SchoolsPage() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const db = createSupabaseAdmin()

  const [{ data: schoolsData }, { data: seasons }] = await Promise.all([
    db.from('schools').select('id, display_name, short_name').eq('is_nj', true).order('display_name'),
    db.from('seasons').select('id, year_label').order('id', { ascending: false }).limit(5),
  ])

  const schools = (schoolsData ?? []) as Array<{ id: number; display_name: string; short_name: string | null }>
  const currentSeason = seasons?.[0]

  return (
    <div className="max-w-5xl mx-auto px-4 pt-4 pb-16 space-y-8">
      <AdminBackButton />

      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-slate-700">School Profiles</h2>
          <div className="flex gap-2">
            <a href="/admin/schools/mascots" className="text-xs text-slate-600 hover:text-slate-900 border border-slate-300 rounded px-3 py-1.5">Mascots &amp; Logo Direction</a>
            <a href="/admin/schools/bulk-upload" className="text-xs text-slate-500 hover:text-slate-800 border border-slate-200 rounded px-3 py-1.5">Bulk Upload</a>
            <a href="/admin/schools/bulk-coach-upload" className="text-xs text-slate-500 hover:text-slate-800 border border-slate-200 rounded px-3 py-1.5">Bulk Coach Upload</a>
          </div>
        </div>
        <SchoolDirectoryLink schools={schools} />
      </div>

      {currentSeason && (
        <div>
          <h2 className="text-sm font-semibold text-slate-700 mb-2">Season Enrollment</h2>
          <SchoolEnrollmentPanel
            seasonId={currentSeason.id}
            seasonLabel={currentSeason.year_label ?? String(currentSeason.id)}
          />
        </div>
      )}
    </div>
  )
}
