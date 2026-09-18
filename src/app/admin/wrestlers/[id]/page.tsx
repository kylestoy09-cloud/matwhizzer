import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { AdminBackButton } from '../../AdminBackButton'
import { WrestlerProfileClient } from './WrestlerProfileClient'

export const dynamic = 'force-dynamic'

function db() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL  ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  )
}

type Params = { params: Promise<{ id: string }> }

export default async function WrestlerProfilePage({ params }: Params) {
  const { id } = await params
  const supabase = db()

  const enrollmentCheck = await supabase.from('wrestlers').select('grade').limit(1)
  const enrollmentReady = !enrollmentCheck.error || !(enrollmentCheck.error.code === '42703')

  const selectCols = enrollmentReady
    ? 'id, first_name, last_name, gender, main_weight, is_oos, grade, grade_confirmed_at, grade_confirmed_source, projected_weight_class, confirmed_weight_class, is_active'
    : 'id, first_name, last_name, gender, main_weight, is_oos'

  const { data: wrestler, error } = await supabase
    .from('wrestlers')
    .select(selectCols)
    .eq('id', id)
    .single()

  if (error || !wrestler) notFound()

  // Current school from history
  let currentSchool: { id: number; display_name: string } | null = null
  let schoolHistory: unknown[] = []

  const { data: hist, error: histErr } = await supabase
    .from('wrestler_school_history')
    .select('id, school_id, start_date, end_date, is_confirmed_transfer, created_via, schools(id, display_name)')
    .eq('wrestler_id', id)
    .order('start_date', { ascending: false })
    .limit(10)

  if (!histErr && hist) {
    schoolHistory = hist as unknown[]
    const openRow = (hist as unknown as { end_date: string | null; schools: { id: number; display_name: string } }[])
      .find(r => !r.end_date)
    if (openRow?.schools) currentSchool = openRow.schools
  }

  if (!currentSchool) {
    const { data: entries } = await supabase
      .from('tournament_entries')
      .select('school_id, schools(id, display_name)')
      .eq('wrestler_id', id)
      .not('school_id', 'is', null)
      .limit(200)

    if (entries?.length) {
      const freq = new Map<number, { id: number; display_name: string; count: number }>()
      for (const e of entries as unknown as { school_id: number; schools: { id: number; display_name: string } }[]) {
        const ex = freq.get(e.school_id)
        if (ex) ex.count++; else freq.set(e.school_id, { ...e.schools, count: 1 })
      }
      const best = [...freq.values()].sort((a, b) => b.count - a.count)[0]
      if (best) currentSchool = { id: best.id, display_name: best.display_name }
    }
  }

  // All NJ schools for the school selector
  const { data: allSchoolsData } = await supabase
    .from('schools')
    .select('id, display_name')
    .eq('is_nj', true)
    .order('display_name')
    .limit(600)

  const allSchools = (allSchoolsData ?? []) as { id: number; display_name: string }[]
  const w = wrestler as unknown as { id: string; first_name: string; last_name: string; gender: string }

  return (
    <div className="max-w-3xl mx-auto px-4 pt-4 pb-16">
      <AdminBackButton href="/admin/wrestlers" label="← Wrestlers" />
      <div className="flex items-baseline gap-3 mt-4 mb-6">
        <h1 className="text-xl font-bold text-slate-900">
          {w.first_name} {w.last_name}
        </h1>
        <span className={`text-xs px-2 py-0.5 rounded font-semibold ${
          w.gender === 'F' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'
        }`}>
          {w.gender === 'F' ? 'Girls' : 'Boys'}
        </span>
        {currentSchool && (
          <span className="text-sm text-slate-500">{currentSchool.display_name}</span>
        )}
      </div>
      <WrestlerProfileClient
        wrestler={wrestler as unknown as Parameters<typeof WrestlerProfileClient>[0]['wrestler']}
        currentSchool={currentSchool}
        schoolHistory={schoolHistory as Parameters<typeof WrestlerProfileClient>[0]['schoolHistory']}
        enrollmentReady={enrollmentReady}
        allSchools={allSchools}
      />
    </div>
  )
}
