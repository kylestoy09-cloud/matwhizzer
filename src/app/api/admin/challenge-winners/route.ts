// Daily Challenge winners (admin): each decided week's two winners and their prize claims (shirt size,
// mailing address), and marking a prize mailed. ?sandbox=1 for the sandbox's.
import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/auth/isAdminUser'
import { createSupabaseAdmin } from '@/lib/supabase/service'
import { playerNames, type Db } from '@/lib/challenge'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (!(await getAdminUser())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const sandbox = req.nextUrl.searchParams.get('sandbox') === '1'
  const db = createSupabaseAdmin()
  const [{ data: weeks }, { data: claims }] = await Promise.all([
    db.from('daily_challenge_weeks').select('*').eq('sandbox', sandbox).order('week_start', { ascending: false }),
    db.from('daily_challenge_claims').select('*').eq('sandbox', sandbox).order('week_start', { ascending: false }),
  ])
  const ids = [...new Set((claims ?? []).map(c => c.user_id).filter(Boolean))] as string[]
  const names = await playerNames(db as unknown as Db, ids)
  const emails = new Map<string, string>()
  for (const id of ids) { const { data } = await db.auth.admin.getUserById(id); if (data?.user?.email) emails.set(id, data.user.email) }
  return NextResponse.json({
    weeks: weeks ?? [],
    claims: (claims ?? []).map(c => ({ ...c, name: c.player.startsWith('sandbox:') ? c.player.slice(8) : names.get(c.user_id) ?? 'Player', email: c.user_id ? emails.get(c.user_id) ?? null : null })),
  })
}

export async function PATCH(req: NextRequest) {
  if (!(await getAdminUser())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const b = await req.json().catch(() => null)
  if (!Number(b?.id)) return NextResponse.json({ error: 'id is required' }, { status: 400 })
  const { error } = await createSupabaseAdmin().from('daily_challenge_claims').update({ mailed_at: b.mailed ? new Date().toISOString() : null }).eq('id', Number(b.id))
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
