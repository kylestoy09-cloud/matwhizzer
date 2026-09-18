import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServer } from '@/lib/supabase/server'
import { normalizeMsName, type MsWrestlerFlag, type ClubFlag } from '@/app/admin/ms/import/msImportTypes'

export const dynamic = 'force-dynamic'

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  )
}

type ParsedPlacement = {
  weight_class: number
  place: number
  wrestler_name: string
  school_name: string | null
}

// ── Name scoring ───────────────────────────────────────────────────────────────

function scoreNames(query: string, candidate: string): number {
  const h = normalizeMsName(query)
  const m = normalizeMsName(candidate)
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

// ── Weight plausibility ────────────────────────────────────────────────────────
// Growing kids gain ~3 lbs/month. We allow extra tolerance in either direction
// but require the change to be physically plausible given elapsed time.

function isWeightPlausible(
  newWeight: number,
  lastWeight: number,
  lastDate: string | null,
  tourneyDate: string | null,
): boolean {
  if (!lastDate || !tourneyDate) return true
  const days = Math.max(0, (new Date(tourneyDate).getTime() - new Date(lastDate).getTime()) / 86400000)
  const months = days / 30
  const maxGain = Math.max(15, months * 3)   // 3 lbs/month, floor 15 lbs
  const maxLoss = Math.max(10, months * 1.5) // 1.5 lbs/month, floor 10 lbs
  const delta = newWeight - lastWeight
  return delta <= maxGain && delta >= -maxLoss
}

// ── Club name scoring (simple token Jaccard) ───────────────────────────────────

function normalizeClub(s: string): Set<string> {
  const SKIP = new Set(['wc', 'wrestling', 'club', 'academy', 'athletic', 'athletics', 'team', 'the'])
  return new Set(
    s.toLowerCase().replace(/[^a-z ]/g, ' ').split(/\s+/).filter(t => t.length >= 2 && !SKIP.has(t))
  )
}

function scoreClubNames(raw: string, clubName: string): number {
  const a = normalizeClub(raw)
  const b = normalizeClub(clubName)
  if (!a.size || !b.size) return 0
  const norm = normalizeMsName(raw)
  const normC = normalizeMsName(clubName)
  if (norm === normC) return 100
  let inter = 0
  for (const t of a) if (b.has(t)) inter++
  const union = new Set([...a, ...b]).size
  return Math.round((inter / union) * 80)
}

// ── Main handler ───────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let tournament_id: number
  let placements: ParsedPlacement[]
  try {
    const body = await req.json()
    tournament_id = Number(body.tournament_id)
    placements = body.placements ?? []
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  if (!placements.length) return NextResponse.json({ wrestler_flags: [], club_flags: [] })

  const client = serviceClient()

  // Load tournament date for recency calculation
  const { data: tourney } = await client
    .from('ms_tournaments')
    .select('date')
    .eq('id', tournament_id)
    .maybeSingle()
  const tourneyDate: string | null = (tourney as { date: string | null } | null)?.date ?? null

  // Load all existing ms_wrestlers
  const { data: existingWrestlers } = await client
    .from('ms_wrestlers')
    .select('id, canonical_name')
  const wrestlers = (existingWrestlers ?? []) as { id: number; canonical_name: string }[]

  // Load all ms_placements with tournament dates to build last-seen info per wrestler
  const { data: allPlacements } = await client
    .from('ms_placements')
    .select('ms_wrestler_id, weight_class, ms_tournaments!inner(date)')
    .not('ms_wrestler_id', 'is', null)

  type LastInfo = { last_weight: number; last_date: string | null }
  const lastByWrestler = new Map<number, LastInfo>()
  for (const p of (allPlacements ?? []) as unknown as { ms_wrestler_id: number; weight_class: number; ms_tournaments: { date: string | null } }[]) {
    const wid = p.ms_wrestler_id
    const date = p.ms_tournaments?.date ?? null
    const cur = lastByWrestler.get(wid)
    if (!cur || (date && (!cur.last_date || date > cur.last_date))) {
      lastByWrestler.set(wid, { last_weight: p.weight_class, last_date: date })
    }
  }

  // Load all clubs for club matching
  const { data: clubs } = await client
    .from('nonnjsiaa_clubs')
    .select('id, name')
  const clubList = (clubs ?? []) as { id: number; name: string }[]

  // ── Group placements by normalized wrestler name ────────────────────────────

  type WrestlerGroup = { raw_names: string[]; weight_classes: number[] }
  const wrestlerGroups = new Map<string, WrestlerGroup>()

  for (const p of placements) {
    const key = normalizeMsName(p.wrestler_name)
    if (!key) continue
    if (!wrestlerGroups.has(key)) wrestlerGroups.set(key, { raw_names: [], weight_classes: [] })
    const g = wrestlerGroups.get(key)!
    if (!g.raw_names.includes(p.wrestler_name)) g.raw_names.push(p.wrestler_name)
    if (!g.weight_classes.includes(p.weight_class)) g.weight_classes.push(p.weight_class)
  }

  // ── Match each group against existing ms_wrestlers ─────────────────────────

  const wrestler_flags: MsWrestlerFlag[] = []

  for (const [key, group] of wrestlerGroups) {
    const repName = group.raw_names[0]  // representative name for this group
    const repWeight = group.weight_classes[0]

    type ScoredCandidate = {
      ms_wrestler_id: number
      canonical_name: string
      name_score: number
      weight_ok: boolean
      combined_score: number
    }

    const scored: ScoredCandidate[] = []

    for (const w of wrestlers) {
      const nameScore = scoreNames(repName, w.canonical_name)
      if (nameScore < 50) continue

      const last = lastByWrestler.get(w.id)
      const weightOk = last
        ? isWeightPlausible(repWeight, last.last_weight, last.last_date, tourneyDate)
        : true

      // Implausible weight with a weak name score → drop
      const combined = !weightOk && nameScore < 90 ? Math.round(nameScore * 0.5) : nameScore
      if (combined < 50) continue

      scored.push({ ms_wrestler_id: w.id, canonical_name: w.canonical_name, name_score: nameScore, weight_ok: weightOk, combined_score: combined })
    }

    scored.sort((a, b) => b.combined_score - a.combined_score)
    const best = scored[0] ?? null

    let confidence: MsWrestlerFlag['confidence'] = 'none'
    if (best) {
      if (best.combined_score >= 90) confidence = 'exact'
      else if (best.combined_score >= 70) confidence = 'high'
      else confidence = 'low'
    }

    const last = best ? lastByWrestler.get(best.ms_wrestler_id) : undefined

    wrestler_flags.push({
      key,
      raw_names: group.raw_names,
      weight_classes: group.weight_classes,
      confidence,
      is_new: !best,
      ms_wrestler_id: best?.ms_wrestler_id ?? null,
      canonical_name: best?.canonical_name ?? null,
      last_weight: last?.last_weight ?? null,
      last_date: last?.last_date ?? null,
      alternates: scored.slice(1, 4).map(s => ({
        ms_wrestler_id: s.ms_wrestler_id,
        canonical_name: s.canonical_name,
        score: s.combined_score,
      })),
    })
  }

  // ── Match unique school_names against clubs ─────────────────────────────────

  const rawClubCounts = new Map<string, number>()
  for (const p of placements) {
    if (!p.school_name?.trim()) continue
    const raw = p.school_name.trim()
    rawClubCounts.set(raw, (rawClubCounts.get(raw) ?? 0) + 1)
  }

  const club_flags: ClubFlag[] = []

  for (const [raw, count] of rawClubCounts) {
    const scored = clubList
      .map(c => ({ club_id: c.id, name: c.name, score: scoreClubNames(raw, c.name) }))
      .filter(c => c.score >= 50)
      .sort((a, b) => b.score - a.score)

    const best = scored[0] ?? null
    let confidence: ClubFlag['confidence'] = 'none'
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
