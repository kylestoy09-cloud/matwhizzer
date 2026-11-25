// Tournament history review (admin Tournament Hub → History → Review): the teams and NJ wrestlers the history import
// couldn't settle (written by scripts/tournament_history_dryrun_20261120.mts into history_import_review).
//   GET  ?gender=M|F                           the items + the NJ schools to search
//   POST { id, decision }                      save one decision (null = undo)
//   POST { gender, acceptSuggestions: true }   every undecided wrestler with a suggestion takes it
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/service'
import { isAdminUser } from '@/lib/auth/isAdminUser'

export const dynamic = 'force-dynamic'

async function admin() {
  const sb = await createSupabaseServer()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  if (!(await isAdminUser(user.id))) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  return { user }
}

export async function GET(req: NextRequest) {
  const a = await admin(); if (a.error) return a.error
  const g = req.nextUrl.searchParams.get('gender') === 'F' ? 'F' : 'M'
  const db = createSupabaseAdmin()
  const items: Record<string, unknown>[] = []
  for (let f = 0; ; f += 1000) {
    const { data, error } = await db.from('history_import_review').select('id, kind, key, item, decision, decided_by, decided_at').eq('gender', g).order('id').range(f, f + 999)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    items.push(...(data ?? []))
    if (!data || data.length < 1000) break
  }
  const { data: schools } = await db.from('schools').select('id, display_name').eq('is_nj', true).order('display_name')
  return NextResponse.json({ items, schools: (schools ?? []).map(s => ({ id: s.id, name: s.display_name })) })
}

export async function POST(req: NextRequest) {
  const a = await admin(); if (a.error) return a.error
  const body = await req.json()
  const db = createSupabaseAdmin()
  const by = a.user!.email ?? a.user!.id
  const now = new Date().toISOString()
  if (body?.acceptTeamSuggestions) {
    // every undecided team with the matcher's suggested school takes it
    const g = body.gender === 'F' ? 'F' : 'M'
    const { data, error } = await db.from('history_import_review').select('id, item').eq('gender', g).eq('kind', 'team').is('decision', null)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    let n = 0
    for (const r of data ?? []) {
      const it = r.item as { guessId?: number | null; stateGuess?: string | null }
      const decision = it.guessId ? { schoolId: it.guessId } : it.stateGuess ? { state: it.stateGuess } : null
      if (!decision) continue
      const { error: e } = await db.from('history_import_review').update({ decision, decided_by: `${by} (suggestion)`, decided_at: now }).eq('id', r.id)
      if (e) return NextResponse.json({ error: e.message }, { status: 500 })
      n++
    }
    return NextResponse.json({ ok: true, accepted: n })
  }
  if (body?.acceptSuggestions) {
    const g = body.gender === 'F' ? 'F' : 'M'
    const { data, error } = await db.from('history_import_review').select('id, item').eq('gender', g).eq('kind', 'wrestler').is('decision', null)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    let n = 0
    for (const r of data ?? []) {
      const it = r.item as { suggestion?: string; candidates?: { id: string }[] }
      const decision = it.suggestion?.startsWith('same') && it.candidates?.[0] ? { wrestlerId: it.candidates[0].id }
        : it.suggestion?.startsWith('new') ? { new: true } : null
      if (!decision) continue
      const { error: e } = await db.from('history_import_review').update({ decision, decided_by: `${by} (suggestion)`, decided_at: now }).eq('id', r.id)
      if (e) return NextResponse.json({ error: e.message }, { status: 500 })
      n++
    }
    return NextResponse.json({ ok: true, accepted: n })
  }
  if (typeof body?.id !== 'number') return NextResponse.json({ error: 'id required' }, { status: 400 })
  const d = body.decision
  const valid = d === null || (typeof d === 'object' && (typeof d.njSchoolId === 'number' || typeof d.schoolId === 'number' || /^[A-Z]{2}$/.test(d.state ?? '') || typeof d.wrestlerId === 'string' || d.new === true))
  if (!valid) return NextResponse.json({ error: 'decision: { njSchoolId } | { schoolId } | { state } | { wrestlerId } | { new: true } | null' }, { status: 400 })
  const { error } = await db.from('history_import_review').update(d === null ? { decision: null, decided_by: null, decided_at: null } : { decision: d, decided_by: by, decided_at: now }).eq('id', body.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
