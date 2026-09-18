import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServer } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  )
}

async function authCheck() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function GET() {
  const user = await authCheck()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const client = serviceClient()
  const { data: tiers, error } = await client
    .from('ms_tournament_tiers')
    .select('*, ms_tournaments(count)')
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Flatten the tournament count out of the join
  const result = (tiers ?? []).map(t => ({
    ...t,
    tournament_count: (t.ms_tournaments as { count: number }[])?.[0]?.count ?? 0,
    ms_tournaments: undefined,
  }))

  return NextResponse.json({ tiers: result })
}

export async function POST(req: NextRequest) {
  const user = await authCheck()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }) }

  const { name, description, credit_1, credit_2, credit_3, credit_4, credit_5, credit_6, credit_7, credit_8 } = body

  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }

  const client = serviceClient()
  const { data, error } = await client
    .from('ms_tournament_tiers')
    .insert({
      name: (name as string).trim(),
      description: description ?? null,
      credit_1: credit_1 ?? null,
      credit_2: credit_2 ?? null,
      credit_3: credit_3 ?? null,
      credit_4: credit_4 ?? null,
      credit_5: credit_5 ?? null,
      credit_6: credit_6 ?? null,
      credit_7: credit_7 ?? null,
      credit_8: credit_8 ?? null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ tier: data }, { status: 201 })
}
