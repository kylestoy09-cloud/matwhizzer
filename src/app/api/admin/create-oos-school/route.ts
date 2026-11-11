import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { isAdminUser } from '@/lib/auth/isAdminUser'
import { addOosAlias, createOosSchool, isState, needsStateMessage } from '@/lib/oosSchool'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const auth = await createSupabaseServer()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await isAdminUser(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { display_name, alias, state } = await req.json().catch(() => ({}))
  if (!display_name?.trim()) return NextResponse.json({ error: 'display_name required' }, { status: 400 })
  if (!isState(state)) return NextResponse.json({ error: needsStateMessage([display_name.trim()]) }, { status: 400 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Reuse or create "Name (ST)"; the typed name and the raw import name are saved as aliases
  try {
    const school = await createOosSchool(supabase, display_name.trim(), state)
    if (alias?.trim()) await addOosAlias(supabase, alias.trim(), school.id, school.display_name)
    return NextResponse.json({ school })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
