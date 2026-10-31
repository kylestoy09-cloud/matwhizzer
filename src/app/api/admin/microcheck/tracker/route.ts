import { NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase/service'
import { requireMicrocheckAdmin } from '../_auth'
import { loadWorkload, openCounts, typeGenderLabel, type CellStatus } from '../_workload'

export const dynamic = 'force-dynamic'

const CODE: Record<CellStatus, string> = { done: 'd', completed: 'c', cant_find: 'x', flagged: 'f', missing: 'm', na: '-' }

// GET — the Missing Data grid: every active program school × every school-data check.
// Each school's row is a string of one-letter codes, one per column (see CODE).
export async function GET() {
  if (!await requireMicrocheckAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const w = await loadWorkload(createSupabaseAdmin())
    const counts = openCounts(w)
    const focused = new Set(w.focus.map(f => `${f.task_key}|${f.school_id}`))
    const columns = w.types.filter(t => t.source === 'school_field')
    return NextResponse.json({
      columns: columns.map(t => ({ key: t.key, label: t.label, gender: t.gender, group_label: typeGenderLabel(t.gender), enabled: t.enabled, ...counts.get(t.key) })),
      queues:  w.types.filter(t => t.source === 'queue').map(t => ({ key: t.key, label: `${typeGenderLabel(t.gender)} · ${t.label}`, open: counts.get(t.key)?.open ?? 0 })),
      schools: w.schools.map(s => ({
        id: s.id, name: s.name, boys: s.boys, girls: s.girls,
        cells: columns.map(t => CODE[w.status(t.key, s.id)]).join(''),
        focus: columns.map(t => focused.has(`${t.key}|${s.id}`) ? '1' : '0').join(''),
      })),
    })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
