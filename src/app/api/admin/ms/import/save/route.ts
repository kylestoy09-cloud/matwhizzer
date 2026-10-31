import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServer } from '@/lib/supabase/server'
import { normalizeMsName, type MsWrestlerOverride, type ClubOverride } from '@/app/admin/[side]/ms/import/msImportTypes'

export const dynamic = 'force-dynamic'

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  )
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
  let wrestler_overrides: Record<string, MsWrestlerOverride>
  let club_overrides: Record<string, ClubOverride>
  try {
    const body = await req.json()
    tournament_id    = Number(body.tournament_id)
    placements       = body.placements ?? []
    replace          = body.replace ?? false
    wrestler_overrides = body.wrestler_overrides ?? {}
    club_overrides   = body.club_overrides ?? {}
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  if (!tournament_id || isNaN(tournament_id)) return NextResponse.json({ error: 'tournament_id is required' }, { status: 400 })
  if (!placements.length) return NextResponse.json({ error: 'No placements provided' }, { status: 400 })

  for (const p of placements) {
    if (!p.weight_class || !p.place || !p.wrestler_name?.trim())
      return NextResponse.json({ error: 'Each placement needs weight_class, place, and wrestler_name' }, { status: 400 })
    if (p.place < 1 || p.place > 8)
      return NextResponse.json({ error: `Invalid place ${p.place} — must be 1–8` }, { status: 400 })
  }

  const client = serviceClient()

  const { data: tournament } = await client.from('ms_tournaments').select('id, name').eq('id', tournament_id).single()
  if (!tournament) return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })

  // ── Resolve ms_wrestler_id for each unique normalized name ─────────────────
  // Build a map: normalized_key → ms_wrestler_id
  const wrestlerIdByKey = new Map<string, number | null>()

  const uniqueKeys = new Set<string>()
  for (const p of placements) {
    const key = normalizeMsName(p.wrestler_name)
    if (key) uniqueKeys.add(key)
  }

  for (const key of uniqueKeys) {
    const ov = wrestler_overrides[key]
    if (ov?.type === 'existing') {
      wrestlerIdByKey.set(key, ov.ms_wrestler_id)
    } else if (ov?.type === 'create') {
      const { data: newW, error } = await client
        .from('ms_wrestlers')
        .insert({ canonical_name: ov.canonical_name.trim() })
        .select('id')
        .single()
      if (error) return NextResponse.json({ error: `Failed to create wrestler "${ov.canonical_name}": ${error.message}` }, { status: 500 })
      wrestlerIdByKey.set(key, newW.id as number)
    } else {
      // No override — create a new ms_wrestler using the raw name as canonical.
      // This handles the case where the match step was skipped or the wrestler
      // had exact/high confidence and the client sent no explicit override.
      // We still need an ms_wrestler_id, so create one.
      const firstRawName = placements.find(p => normalizeMsName(p.wrestler_name) === key)?.wrestler_name ?? key
      const { data: newW, error } = await client
        .from('ms_wrestlers')
        .insert({ canonical_name: firstRawName.trim() })
        .select('id')
        .single()
      if (!error && newW) {
        wrestlerIdByKey.set(key, newW.id as number)
      } else {
        wrestlerIdByKey.set(key, null)
      }
    }
  }

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
      const { data: newC, error } = await client
        .from('nonnjsiaa_clubs')
        .insert({ name: ov.name.trim() })
        .select('id')
        .single()
      clubIdByRaw.set(raw, error ? null : (newC?.id as number ?? null))
    } else {
      // No override — auto-create a new club using the raw name
      const { data: newC } = await client
        .from('nonnjsiaa_clubs')
        .insert({ name: raw.trim() })
        .select('id')
        .single()
      clubIdByRaw.set(raw, newC?.id as number ?? null)
    }
  }

  // ── Write placements ───────────────────────────────────────────────────────

  if (replace) {
    const { error: delErr } = await client.from('ms_placements').delete().eq('ms_tournament_id', tournament_id)
    if (delErr) return NextResponse.json({ error: `Delete failed: ${delErr.message}` }, { status: 500 })
  }

  const rows = placements.map(p => {
    const key = normalizeMsName(p.wrestler_name)
    return {
      ms_tournament_id: tournament_id,
      weight_class:     p.weight_class,
      place:            p.place,
      wrestler_name:    p.wrestler_name.trim(),
      school_name:      p.school_name?.trim() || null,
      ms_wrestler_id:   key ? (wrestlerIdByKey.get(key) ?? null) : null,
      club_id:          p.school_name?.trim() ? (clubIdByRaw.get(p.school_name.trim()) ?? null) : null,
    }
  })

  const { data: inserted, error: insErr } = await client.from('ms_placements').insert(rows).select('id')
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })

  return NextResponse.json({ inserted: inserted?.length ?? 0, tournament_name: tournament.name })
}
