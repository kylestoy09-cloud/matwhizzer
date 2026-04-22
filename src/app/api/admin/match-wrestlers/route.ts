import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { matchWrestler } from '@/lib/matchWrestlers'
import type { WrestlerMatch } from '@/lib/matchWrestlers'

export const dynamic = 'force-dynamic'

type WrestlerRequest = {
  name:        string
  schoolId:    number | null
  weightClass: number
}

const NULL_MATCH = (name: string, weightClass: number): WrestlerMatch => ({
  rawName:     name,
  schoolId:    0,
  weightClass,
  wrestlerId:  null,
  displayName: null,
  confidence:  'none',
  isNew:       true,
  alternates:  [],
})

export async function POST(req: NextRequest) {
  const userSupabase = await createSupabaseServer()
  const { data: { user } } = await userSupabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const wrestlers: unknown = body?.wrestlers

  if (!Array.isArray(wrestlers) || wrestlers.length === 0) {
    return NextResponse.json({ results: [] })
  }

  const results: WrestlerMatch[] = await Promise.all(
    wrestlers.map((w: WrestlerRequest) => {
      const name        = String(w.name ?? '').trim()
      const weightClass = Number(w.weightClass) || 0
      if (!name || w.schoolId === null) return NULL_MATCH(name, weightClass)
      return matchWrestler(name, w.schoolId, weightClass, 'M')
    })
  )

  return NextResponse.json({ results })
}
