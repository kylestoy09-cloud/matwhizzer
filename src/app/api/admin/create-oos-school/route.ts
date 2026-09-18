import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const auth = await createSupabaseServer()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { display_name, alias } = await req.json().catch(() => ({}))
  if (!display_name?.trim()) return NextResponse.json({ error: 'display_name required' }, { status: 400 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Reuse existing OOS school if display_name already exists
  const { data: existing } = await supabase
    .from('schools')
    .select('id, display_name')
    .eq('display_name', display_name.trim())
    .eq('is_nj', false)
    .maybeSingle()

  let school: { id: number; display_name: string }
  if (existing) {
    school = existing as { id: number; display_name: string }
  } else {
    const { data: created, error } = await supabase
      .from('schools')
      .insert({ display_name: display_name.trim(), is_nj: false })
      .select('id, display_name')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    school = created as { id: number; display_name: string }
  }

  // Save alias mapping raw name → this OOS school (school_id stored in notes)
  if (alias?.trim() && alias.trim() !== display_name.trim()) {
    await supabase.from('school_aliases').insert({
      school_id: null,
      alias: alias.trim(),
      alias_type: 'oos',
      notes: String(school.id),
    })
    // Ignore duplicate alias errors — alias already points somewhere, which is fine
  }

  return NextResponse.json({ school })
}
