import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { matchSchoolNames } from '@/lib/matchSchools'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  let user
  try {
    const userSupabase = await createSupabaseServer()
    const { data } = await userSupabase.auth.getUser()
    user = data.user
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[match-schools] auth error:', message)
    return NextResponse.json({ error: `Auth error: ${message}` }, { status: 500 })
  }
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const names: unknown = body?.names

  if (!Array.isArray(names) || names.length === 0) {
    return NextResponse.json({ results: [] })
  }

  const unique = [...new Set(
    names
      .filter((n): n is string => typeof n === 'string')
      .map(n => n.trim())
      .filter(Boolean)
  )]

  try {
    const results = await Promise.all(unique.map(name => matchSchoolNames(name)))
    return NextResponse.json({ results })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[match-schools]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
