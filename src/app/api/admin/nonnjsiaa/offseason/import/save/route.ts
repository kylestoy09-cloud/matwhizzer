import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServer } from '@/lib/supabase/server'
import type { HsWrestlerOverride, OffseasonClubOverride } from '../match/route'

export const dynamic = 'force-dynamic'

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  )
}

function normalizeName(s: string): string {
  const STOP = new Set(['jr', 'sr', 'ii', 'iii', 'iv', 'the', 'van', 'de', 'del'])
  return s.toLowerCase().replace(/[^a-z ]/g, ' ')
    .split(/\s+/).filter(t => t.length >= 2 && !STOP.has(t)).join(' ').trim()
}

type IncomingPlacement = {
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
  let placements: IncomingPlacement[]
  let replace: boolean
  let wrestler_overrides: Record<string, HsWrestlerOverride>
  let club_overrides: Record<string, OffseasonClubOverride>
  try {
    const body = await req.json()
    tournament_id      = Number(body.tournament_id)
    placements         = body.placements ?? []
    replace            = body.replace ?? false
    wrestler_overrides = body.wrestler_overrides ?? {}
    club_overrides     = body.club_overrides ?? {}
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  if (!tournament_id || isNaN(tournament_id)) return NextResponse.json({ error: 'tournament_id required' }, { status: 400 })
  if (!placements.length) return NextResponse.json({ error: 'No placements' }, { status: 400 })

  for (const p of placements) {
    if (!p.weight_class || !p.place || !p.wrestler_name?.trim())
      return NextResponse.json({ error: 'Each placement needs weight_class, place, and wrestler_name' }, { status: 400 })
    if (p.place < 1)
      return NextResponse.json({ error: `Invalid place ${p.place}` }, { status: 400 })
  }

  const client = serviceClient()

  const { data: tournament } = await client
    .from('hs_offseason_tournaments')
    .select('id, name')
    .eq('id', tournament_id)
    .single()
  if (!tournament) return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })

  // ── Resolve club_id for each unique school_name ────────────────────────────
  const clubIdByRaw = new Map<string, number | null>()
  const uniqueClubs = new Set<string>()
  for (const p of placements) {
    if (p.school_name?.trim()) uniqueClubs.add(p.school_name.trim())
  }

  for (const raw of uniqueClubs) {
    const ov = club_overrides[raw]
    if (ov?.type === 'skip') {
      clubIdByRaw.set(raw, null)
    } else if (ov?.type === 'existing') {
      clubIdByRaw.set(raw, ov.club_id)
    } else if (ov?.type === 'create') {
      const { data: newC } = await client
        .from('nonnjsiaa_clubs')
        .insert({ name: ov.name.trim() })
        .select('id')
        .single()
      clubIdByRaw.set(raw, newC?.id as number ?? null)
    } else {
      clubIdByRaw.set(raw, null)
    }
  }

  // ── Resolve hs_wrestler_id per unique normalized name ─────────────────────
  const wrestlerIdByKey = new Map<string, string | null>()
  const uniqueKeys = new Set<string>()
  for (const p of placements) {
    const key = normalizeName(p.wrestler_name)
    if (key) uniqueKeys.add(key)
  }

  for (const key of uniqueKeys) {
    const ov = wrestler_overrides[key]
    if (ov?.type === 'existing') {
      wrestlerIdByKey.set(key, ov.wrestler_id)
    } else {
      wrestlerIdByKey.set(key, null)
    }
  }

  // ── Write placements ──────────────────────────────────────────────────────
  if (replace) {
    const { error: delErr } = await client
      .from('hs_offseason_placements')
      .delete()
      .eq('tournament_id', tournament_id)
    if (delErr) return NextResponse.json({ error: `Delete failed: ${delErr.message}` }, { status: 500 })
  }

  const rows = placements.map(p => {
    const key = normalizeName(p.wrestler_name)
    return {
      tournament_id,
      weight_class:   p.weight_class,
      place:          p.place,
      wrestler_name:  p.wrestler_name.trim(),
      school_name:    p.school_name?.trim() || null,
      hs_wrestler_id: key ? (wrestlerIdByKey.get(key) ?? null) : null,
      club_id:        p.school_name?.trim() ? (clubIdByRaw.get(p.school_name.trim()) ?? null) : null,
    }
  })

  const { data: inserted, error: insErr } = await client
    .from('hs_offseason_placements')
    .insert(rows)
    .select('id')
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })

  return NextResponse.json({ inserted: inserted?.length ?? 0, tournament_name: (tournament as { name: string }).name })
}
