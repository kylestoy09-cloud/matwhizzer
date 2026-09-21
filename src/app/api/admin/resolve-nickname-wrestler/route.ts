import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServer } from '@/lib/supabase/server'
import { matchSchoolNames } from '@/lib/matchSchools'
import { clearWrestlerCache } from '@/lib/matchWrestlers'
import { getWorkingSeason, parseGender } from '@/lib/season-context'

export const dynamic = 'force-dynamic'

// Greedy parse: last (School) is always the school
const GREEDY_RE = /^(.+)\s+\(([^()]+)\)$/
// Nickname pattern: "First (Nick) Last"
const NICK_RE   = /^(.+?)\s+\((.+?)\)\s+(.+)$/

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function POST(req: NextRequest) {
  const auth = await createSupabaseServer()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { reconstructed, gender = 'M' } = body as { reconstructed?: string; gender?: string }
  if (!reconstructed?.trim()) {
    return NextResponse.json({ error: 'reconstructed is required' }, { status: 400 })
  }

  // ── Step 1: Greedy parse ───────────────────────────────────────────────────────
  const greedyM = reconstructed.trim().match(GREEDY_RE)
  if (!greedyM) {
    return NextResponse.json({ error: 'Could not split wrestler and school from line' }, { status: 422 })
  }
  const wrestlerFullName = greedyM[1].trim()  // "Jason (Liam) McSorley"
  const schoolRawName    = greedyM[2].trim()  // "Shawnee"

  // ── Step 2: Parse nickname ─────────────────────────────────────────────────────
  const nickM = wrestlerFullName.match(NICK_RE)
  if (!nickM) {
    return NextResponse.json({ error: 'No nickname pattern found — expected "First (Nick) Last"' }, { status: 422 })
  }
  const firstName  = nickM[1].trim()  // "Jason"
  const nickname   = nickM[2].trim()  // "Liam"
  const lastName   = nickM[3].trim()  // "McSorley"
  const displayName = `${nickname} ${lastName}`  // "Liam McSorley"

  // ── Step 3: Match school ───────────────────────────────────────────────────────
  // Current-season program, so a co-op member name resolves to the co-op
  const matchGender = parseGender(gender)
  const schoolMatch = await matchSchoolNames(schoolRawName, { gender: matchGender, seasonId: (await getWorkingSeason(matchGender)).id })
  const schoolId    = schoolMatch.schoolId

  // ── Step 4: Find existing wrestler ────────────────────────────────────────────
  // Search by (nickname, last) first, then (official first, last)
  const supabase = getClient()

  let wrestlerId:      string | null = null
  let foundDisplayName: string | null = null
  let created = false

  for (const [first, last] of [[nickname, lastName], [firstName, lastName]]) {
    const { data } = await supabase
      .from('wrestlers')
      .select('id, first_name, last_name, suffix')
      .ilike('first_name', first)
      .ilike('last_name', last)
      .limit(1)
    if (data && data.length > 0) {
      const w = data[0]
      wrestlerId       = w.id
      foundDisplayName = `${w.first_name} ${w.last_name}${w.suffix ? ' ' + w.suffix : ''}`
      break
    }
  }

  // ── Step 5: Create wrestler if not found ──────────────────────────────────────
  if (!wrestlerId) {
    const { data: newW, error: insertErr } = await supabase
      .from('wrestlers')
      .insert({ first_name: nickname, last_name: lastName, gender })
      .select('id, first_name, last_name')
      .single()
    if (insertErr || !newW) {
      console.error('[resolve-nickname-wrestler] insert error:', insertErr?.message)
      return NextResponse.json(
        { error: insertErr?.message ?? 'Failed to create wrestler' },
        { status: 500 },
      )
    }
    wrestlerId       = newW.id
    foundDisplayName = `${newW.first_name} ${newW.last_name}`
    created = true
  }

  // ── Step 6: Create aliases ────────────────────────────────────────────────────
  const aliasesAdded: string[] = []

  if (schoolId) {
    const variants = [
      firstName,                                  // "Jason"          — the lazy-parsed name
      `${firstName} ${lastName}`,                 // "Jason McSorley" — official full name
      `${firstName} (${nickname}) ${lastName}`,   // "Jason (Liam) McSorley" — full TW form
    ]
    for (const rawName of variants) {
      const { error } = await supabase
        .from('wrestler_name_aliases')
        .insert({ raw_name: rawName, school_id: schoolId, wrestler_id: wrestlerId })
      if (!error || error.code === '23505') aliasesAdded.push(rawName)
      else console.warn('[resolve-nickname-wrestler] alias insert error:', error.code, error.message)
    }
    clearWrestlerCache()
  }

  return NextResponse.json({
    wrestler:    { id: wrestlerId, displayName: foundDisplayName },
    school:      { id: schoolId, displayName: schoolMatch.displayName, confidence: schoolMatch.confidence },
    created,
    aliasesAdded,
    parsed:      { firstName, nickname, lastName, displayName },
  })
}
