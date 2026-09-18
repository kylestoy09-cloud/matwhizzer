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

function creditForPlace(tier: Record<string, number | null>, place: number): number | null {
  return (tier[`credit_${place}`] as number | null) ?? null
}

export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const client = serviceClient()
  const q = req.nextUrl.searchParams.get('q')?.trim().toLowerCase() ?? ''
  const minimal = req.nextUrl.searchParams.get('minimal') === '1'

  if (minimal) {
    const { data, error } = await client
      .from('ms_wrestlers')
      .select('id, canonical_name')
      .order('canonical_name', { ascending: true })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ wrestlers: data ?? [] })
  }

  // Full profile load: ms_wrestlers + placements + tournament+tier
  const query = client
    .from('ms_wrestlers')
    .select(`
      id, canonical_name, hs_wrestler_id,
      hs_wrestler:wrestlers ( id, first_name, last_name ),
      ms_placements (
        id, wrestler_name, school_name, weight_class, place,
        ms_tournament:ms_tournaments (
          id, name, season, date,
          tier:ms_tournament_tiers (
            id, name,
            credit_1, credit_2, credit_3, credit_4,
            credit_5, credit_6, credit_7, credit_8
          )
        )
      )
    `)
    .order('canonical_name', { ascending: true })

  if (q) {
    query.ilike('canonical_name', `%${q}%`)
  }

  const { data: wrestlers, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profiles = (wrestlers ?? []).map((w: any) => {
    const placements = (w.ms_placements ?? []).map((p: any) => {
      const tier = p.ms_tournament?.tier ?? {}
      const credit = creditForPlace(tier, p.place)
      return {
        id: p.id,
        wrestler_name: p.wrestler_name,
        school_name: p.school_name ?? null,
        weight_class: p.weight_class,
        place: p.place,
        credit,
        tournament_id: p.ms_tournament?.id ?? null,
        tournament_name: p.ms_tournament?.name ?? '?',
        season: p.ms_tournament?.season ?? '?',
        date: p.ms_tournament?.date ?? null,
        tier_name: tier.name ?? '?',
      }
    })

    const raw_names = [...new Set<string>(placements.map((p: { wrestler_name: string }) => p.wrestler_name))]
    let best_credit = 0
    let total_computed_credit = 0
    for (const p of placements) {
      if (p.credit != null) {
        total_computed_credit += p.credit
        if (p.credit > best_credit) best_credit = p.credit
      }
    }

    const hsW = w.hs_wrestler
    const hs_wrestler_name = hsW ? `${hsW.first_name} ${hsW.last_name}` : null

    return {
      ms_wrestler_id: w.id as number,
      canonical_name: w.canonical_name as string,
      hs_wrestler_id: w.hs_wrestler_id as string | null,
      hs_wrestler_name,
      raw_names,
      placements,
      best_credit,
      total_computed_credit,
    }
  })

  // If search query also check hs_wrestler_name for linked wrestlers
  const filtered = q
    ? profiles.filter(p =>
        p.canonical_name.toLowerCase().includes(q) ||
        p.hs_wrestler_name?.toLowerCase().includes(q) ||
        p.raw_names.some((n: string) => n.toLowerCase().includes(q))
      )
    : profiles

  // Sort: linked first, then by best_credit desc, then name asc
  filtered.sort((a, b) => {
    if (a.hs_wrestler_id && !b.hs_wrestler_id) return -1
    if (!a.hs_wrestler_id && b.hs_wrestler_id) return 1
    if (b.best_credit !== a.best_credit) return b.best_credit - a.best_credit
    return a.canonical_name.localeCompare(b.canonical_name)
  })

  return NextResponse.json({ profiles: filtered })
}
