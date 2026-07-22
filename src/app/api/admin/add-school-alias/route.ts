import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const auth = await createSupabaseServer()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { school_id, alias, alias_type, notes } = body as {
    school_id: number | null
    alias: string
    alias_type?: string
    notes?: string
  }

  // OOS confirmations have school_id = null; NJ aliases require school_id.
  const isOOS = alias_type === 'oos'
  if (!isOOS && !school_id) {
    return NextResponse.json({ error: 'school_id is required for non-OOS aliases' }, { status: 400 })
  }
  if (!alias?.trim()) {
    return NextResponse.json({ error: 'alias is required' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { error } = await supabase.from('school_aliases').insert({
    school_id,
    alias: alias.trim(),
    alias_type: alias_type ?? 'abbreviation',
    notes: notes ?? null,
  })

  if (error) {
    // Treat duplicate alias as success — alias already exists pointing to some school
    if (error.code === '23505') return NextResponse.json({ ok: true, skipped: true })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
