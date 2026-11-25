// A Daily Challenge winner's prize: GET their open claims; POST { id, full_name, shirt_size, address1,
// address2, city, state, zip } to send where to mail it. Sandbox: { sandbox, asOf, player } (admin).
import { NextRequest, NextResponse } from 'next/server'
import { challengeContext } from '@/lib/challengeServer'

export const dynamic = 'force-dynamic'
const SIZES = ['YS', 'YM', 'YL', 'S', 'M', 'L', 'XL', '2XL', '3XL']

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const ctx = await challengeContext({ sandbox: sp.get('sandbox'), asOf: sp.get('asOf'), player: sp.get('player') })
  if (!ctx) return NextResponse.json({ signedIn: false, claims: [] })
  const { data, error } = await ctx.db.from('daily_challenge_claims').select('id, week_start, kind, submitted_at, shirt_size').eq('sandbox', ctx.sandbox).eq('player', ctx.player).order('week_start', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ signedIn: true, sizes: SIZES, claims: data ?? [] })
}

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}))
  const ctx = await challengeContext(b)
  if (!ctx) return NextResponse.json({ error: 'Sign in first' }, { status: 401 })
  const f = (k: string) => String(b[k] ?? '').trim()
  if (!f('full_name') || !f('address1') || !f('city') || !f('state') || !f('zip')) return NextResponse.json({ error: 'Fill in your name and full mailing address' }, { status: 400 })
  if (!SIZES.includes(f('shirt_size'))) return NextResponse.json({ error: 'Pick a shirt size' }, { status: 400 })
  if (!/^\d{5}(-\d{4})?$/.test(f('zip'))) return NextResponse.json({ error: 'ZIP code should be 5 digits' }, { status: 400 })
  const { data, error } = await ctx.db.from('daily_challenge_claims').update({
    full_name: f('full_name'), shirt_size: f('shirt_size'), address1: f('address1'), address2: f('address2') || null,
    city: f('city'), state: f('state').toUpperCase().slice(0, 2), zip: f('zip'), submitted_at: new Date().toISOString(),
  }).eq('id', Number(b.id)).eq('player', ctx.player).eq('sandbox', ctx.sandbox).is('mailed_at', null).select('id').maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'That prize was not found' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
