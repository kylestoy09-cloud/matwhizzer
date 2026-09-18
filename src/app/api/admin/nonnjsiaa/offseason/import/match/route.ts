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

const STOP = new Set(['jr', 'sr', 'ii', 'iii', 'iv', 'the', 'van', 'de', 'del'])

function normalizeName(s: string): string {
  return s.toLowerCase().replace(/[^a-z ]/g, ' ')
    .split(/\s+/).filter(t => t.length >= 2 && !STOP.has(t)).join(' ').trim()
}

function scoreNames(query: string, candidate: string): number {
  const h = normalizeName(query)
  const m = normalizeName(candidate)
  if (!h || !m) return 0
  if (h === m) return 100
  const hToks = h.split(' ')
  const mToks = m.split(' ')
  const hLast = hToks[hToks.length - 1]
  const mLast = mToks[mToks.length - 1]
  if (!hLast || !mLast || hLast !== mLast) return 0
  const hSet = new Set(hToks)
  const mSet = new Set(mToks)
  let inter = 0
  for (const t of hSet) if (mSet.has(t)) inter++
  const union = new Set([...hSet, ...mSet]).size
  const jaccard = inter / union
  const hFirst = hToks[0]
  const mFirst = mToks[0]
  const firstBoost  = hFirst && mFirst && hFirst === mFirst ? 15 : 0
  const initialBoost = hFirst && mFirst && hFirst.length === 1 && mFirst[0] === hFirst[0] ? 8 : 0
  return Math.min(99, Math.round(jaccard * 70) + firstBoost + initialBoost)
}

const CLUB_SKIP = new Set(['wc', 'wrestling', 'club', 'academy', 'athletic', 'athletics', 'team', 'the', 'wr'])
function normalizeClub(s: string): Set<string> {
  return new Set(s.toLowerCase().replace(/[^a-z ]/g, ' ').split(/\s+/).filter(t => t.length >= 2 && !CLUB_SKIP.has(t)))
}
function scoreClubNames(raw: string, clubName: string): number {
  const a = normalizeClub(raw)
  const b = normalizeClub(clubName)
  if (!a.size || !b.size) return 0
  if (normalizeName(raw) === normalizeName(clubName)) return 100
  let inter = 0
  for (const t of a) if (b.has(t)) inter++
  const union = new Set([...a, ...b]).size
  return Math.round((inter / union) * 80)
}

export type HsWrestlerFlag = {
  key: string              // normalizeName(wrestler_name) — grouping key
  raw_names: string[]
  weight_classes: number[]
  confidence: 'exact' | 'high' | 'low' | 'none'
  wrestler_id: string | null
  display_name: string | null
  school_name_match: string | null
  alternates: { wrestler_id: string; display_name: string; score: number }[]
}

export type HsWrestlerOverride =
  | { type: 'existing'; wrestler_id: string; display_name: string }
  | { type: 'skip' }

export type OffseasonClubFlag = {
  raw: string
  confidence: 'exact' | 'high' | 'low' | 'none'
  club_id: number | null
  club_name: string | null
  alternates: { club_id: number; name: string; score: number }[]
  placement_count: number
}

export type OffseasonClubOverride =
  | { type: 'existing'; club_id: number; club_name: string }
  | { type: 'create';   name: string }
  | { type: 'skip' }

type ParsedPlacement = {
  weight_class: number
  place: number
  wrestler_name: string
  school_name: string | null
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let tournament_id: number
  let placements: ParsedPlacement[]
  let gender: string
  try {
    const body = await req.json()
    tournament_id = Number(body.tournament_id)
    placements    = body.placements ?? []
    gender        = body.gender ?? 'M'
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  if (!placements.length) return NextResponse.json({ wrestler_flags: [], club_flags: [] })

  const client = serviceClient()

  // Load tournament info (for gender context if not explicitly passed)
  const { data: tourney } = await client
    .from('hs_offseason_tournaments')
    .select('gender')
    .eq('id', tournament_id)
    .maybeSingle()
  const effectiveGender = (tourney as { gender: string } | null)?.gender ?? gender

  // Load all wrestlers for the current season (both genders if combined)
  const genderFilter = effectiveGender === 'MF' ? ['M', 'F'] : [effectiveGender === 'F' ? 'F' : 'M']
  const { data: wrestlerRows } = await client
    .from('wrestlers')
    .select(`
      id,
      first_name,
      last_name,
      gender,
      school:schools ( name )
    `)
    .in('gender', genderFilter)

  type WrestlerRec = { id: string; display_name: string; gender: string; school_name: string | null }
  const wrestlers: WrestlerRec[] = (wrestlerRows ?? []).map((w: Record<string, unknown>) => ({
    id: w.id as string,
    display_name: `${w.first_name} ${w.last_name}`.trim(),
    gender: w.gender as string,
    school_name: (w.school as { name: string } | null)?.name ?? null,
  }))

  // Load all clubs
  const { data: clubs } = await client.from('nonnjsiaa_clubs').select('id, name')
  const clubList = (clubs ?? []) as { id: number; name: string }[]

  // ── Group placements by normalized wrestler name ──────────────────────────────
  type Group = { raw_names: string[]; weight_classes: number[] }
  const groups = new Map<string, Group>()
  for (const p of placements) {
    const key = normalizeName(p.wrestler_name)
    if (!key) continue
    if (!groups.has(key)) groups.set(key, { raw_names: [], weight_classes: [] })
    const g = groups.get(key)!
    if (!g.raw_names.includes(p.wrestler_name)) g.raw_names.push(p.wrestler_name)
    if (!g.weight_classes.includes(p.weight_class)) g.weight_classes.push(p.weight_class)
  }

  // ── Match each group against HS wrestlers ─────────────────────────────────────
  const wrestler_flags: HsWrestlerFlag[] = []

  for (const [key, group] of groups) {
    const repName = group.raw_names[0]

    type Scored = { wrestler_id: string; display_name: string; score: number; school_name: string | null }
    const scored: Scored[] = []

    for (const w of wrestlers) {
      const score = scoreNames(repName, w.display_name)
      if (score < 55) continue
      scored.push({ wrestler_id: w.id, display_name: w.display_name, score, school_name: w.school_name })
    }

    scored.sort((a, b) => b.score - a.score)
    const best = scored[0] ?? null

    let confidence: HsWrestlerFlag['confidence'] = 'none'
    if (best) {
      if (best.score >= 90) confidence = 'exact'
      else if (best.score >= 70) confidence = 'high'
      else confidence = 'low'
    }

    wrestler_flags.push({
      key,
      raw_names: group.raw_names,
      weight_classes: group.weight_classes,
      confidence,
      wrestler_id: best?.wrestler_id ?? null,
      display_name: best?.display_name ?? null,
      school_name_match: best?.school_name ?? null,
      alternates: scored.slice(1, 4).map(s => ({ wrestler_id: s.wrestler_id, display_name: s.display_name, score: s.score })),
    })
  }

  // ── Match school_names against clubs ──────────────────────────────────────────
  const rawClubCounts = new Map<string, number>()
  for (const p of placements) {
    if (!p.school_name?.trim()) continue
    const raw = p.school_name.trim()
    rawClubCounts.set(raw, (rawClubCounts.get(raw) ?? 0) + 1)
  }

  const club_flags: OffseasonClubFlag[] = []

  for (const [raw, count] of rawClubCounts) {
    const scored = clubList
      .map(c => ({ club_id: c.id, name: c.name, score: scoreClubNames(raw, c.name) }))
      .filter(c => c.score >= 50)
      .sort((a, b) => b.score - a.score)

    const best = scored[0] ?? null
    let confidence: OffseasonClubFlag['confidence'] = 'none'
    if (best) {
      if (best.score >= 90) confidence = 'exact'
      else if (best.score >= 70) confidence = 'high'
      else confidence = 'low'
    }

    club_flags.push({
      raw,
      confidence,
      club_id: best?.club_id ?? null,
      club_name: best?.name ?? null,
      alternates: scored.slice(1, 4).map(s => ({ club_id: s.club_id, name: s.name, score: s.score })),
      placement_count: count,
    })
  }

  return NextResponse.json({ wrestler_flags, club_flags })
}
