// Polls (Kyle 2026-11-12): one list for the site (topic boys/girls/general), a question with its answers (any number —
// Kyle 2026-11-18; at least one)
// and the date it runs; archived ones stay listed. ?sandbox=1 for the sandbox's own. Votes come from the
// site (/api/poll); here they're only counted.
import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/auth/isAdminUser'
import { createSupabaseAdmin } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'
const bad = (m: string, s = 400) => NextResponse.json({ error: m }, { status: s })

function fields(b: Record<string, unknown>): Record<string, unknown> | string {
  const out: Record<string, unknown> = {}
  if (b.question !== undefined) { const q = String(b.question ?? '').trim(); if (!q) return 'A question is required'; out.question = q }
  if (b.answers !== undefined) {
    const a = Array.isArray(b.answers) ? b.answers.map(x => String(x ?? '').trim()) : []
    if (!a.length) return 'Add at least one answer'
    if (a.some(x => !x)) return 'Fill in every answer, or remove the empty one'
    out.answers = a
  }
  if (b.topic !== undefined) out.topic = ['boys', 'girls', 'general'].includes(String(b.topic)) ? b.topic : 'boys'
  if (b.poll_date !== undefined) {
    if (b.poll_date && !(typeof b.poll_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(b.poll_date))) return 'Pick a date'
    out.poll_date = b.poll_date || null
  }
  if (b.archived !== undefined) out.archived = !!b.archived
  return out
}

export async function GET(req: NextRequest) {
  if (!(await getAdminUser())) return bad('Forbidden', 403)
  const sandbox = req.nextUrl.searchParams.get('sandbox') === '1'
  const db = createSupabaseAdmin()
  const { data, error } = await db.from('polls').select('*').eq('sandbox', sandbox).order('poll_date', { ascending: false, nullsFirst: true }).order('id', { ascending: false })
  if (error) return bad(error.message, 500)
  const ids = (data ?? []).map(p => p.id)
  const counts = new Map<number, number[]>()
  if (ids.length) {
    const { data: v } = await db.from('poll_votes').select('poll_id, choice').in('poll_id', ids)
    const size = new Map((data ?? []).map(p => [p.id as number, (p.answers as string[]).length]))
    for (const r of v ?? []) { const c = counts.get(r.poll_id) ?? Array(size.get(r.poll_id) ?? 0).fill(0); c[r.choice] = (c[r.choice] ?? 0) + 1; counts.set(r.poll_id, c) }
  }
  return NextResponse.json({ rows: (data ?? []).map(p => ({ ...p, votes: counts.get(p.id) ?? Array((p.answers as string[]).length).fill(0) })) })
}

export async function POST(req: NextRequest) {
  if (!(await getAdminUser())) return bad('Forbidden', 403)
  const b = await req.json().catch(() => null)
  const f = fields({ question: '', answers: [], ...b })
  if (typeof f === 'string') return bad(f)
  const { data, error } = await createSupabaseAdmin().from('polls').insert({ ...f, sandbox: b?.sandbox === true }).select('*').single()
  if (error) return bad(error.message, 500)
  return NextResponse.json({ row: data }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  if (!(await getAdminUser())) return bad('Forbidden', 403)
  const b = await req.json().catch(() => null)
  if (!Number(b?.id)) return bad('id is required')
  const f = fields(b)
  if (typeof f === 'string') return bad(f)
  // votes are kept by answer position: once a poll has votes, its answers can be added to or reworded, not removed
  if (Array.isArray(f.answers)) {
    const { data: votes } = await createSupabaseAdmin().from('poll_votes').select('choice').eq('poll_id', Number(b.id))
    const top = Math.max(-1, ...(votes ?? []).map(v => v.choice as number))
    if (top >= (f.answers as string[]).length) return bad('This poll has votes on those answers — add or reword answers, but don\'t remove them')
  }
  const { data, error } = await createSupabaseAdmin().from('polls').update({ ...f, updated_at: new Date().toISOString() }).eq('id', Number(b.id)).select('*').single()
  if (error) return bad(error.message, 500)
  return NextResponse.json({ row: data })
}
