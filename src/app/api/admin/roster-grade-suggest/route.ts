import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/service'
import { suggestRosterGrades } from '@/lib/rosterGradeSuggest'

export const dynamic = 'force-dynamic'

// POST { gender, wrestlers: [{ name, schoolId }] } → { suggestions: { "<name>|<schoolId>": { exact, options } } }
export async function POST(req: NextRequest) {
  const userSb = await createSupabaseServer()
  const { data: { user } } = await userSb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: appUser } = await userSb.from('app_users').select('role').eq('id', user.id).single()
  if (!appUser || appUser.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { gender, wrestlers } = await req.json() as { gender: 'M' | 'F'; wrestlers: { name: string; schoolId: number | null }[] }
  if (!Array.isArray(wrestlers)) return NextResponse.json({ suggestions: {} })
  try {
    return NextResponse.json({ suggestions: await suggestRosterGrades(createSupabaseAdmin(), gender === 'F' ? 'F' : 'M', wrestlers) })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
