import { supabase } from '@/lib/supabase/public-cached'
import { createSupabaseServer } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { TournamentPageClient } from './TournamentPageClient'

export const dynamic = 'force-dynamic'

// ── Color helpers (duplicated from SchoolHeader to avoid cross-import) ─────────
function hexToRgb(hex: string): [number, number, number] | null {
  const clean = hex.replace('#', '')
  if (clean.length !== 6) return null
  const n = parseInt(clean, 16)
  if (isNaN(n)) return null
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff]
}
function relativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex)
  if (!rgb) return 0
  const [r, g, b] = rgb.map(c => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4) })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hex1); const l2 = relativeLuminance(hex2)
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
}
function pickTextColor(bg: string, candidates: (string | null | undefined)[]): string {
  const valid = candidates.filter((c): c is string => !!c && c.toLowerCase() !== bg.toLowerCase())
  let best = { color: '#FFFFFF', ratio: 0 }
  for (const c of valid) { const r = contrastRatio(bg, c); if (r > best.ratio) best = { color: c, ratio: r } }
  if (best.ratio >= 4.5) return best.color
  return contrastRatio(bg, '#FFFFFF') >= contrastRatio(bg, '#000000') ? '#FFFFFF' : '#000000'
}

export default async function TournamentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const authClient = await createSupabaseServer()
  const { data: { user } } = await authClient.auth.getUser()
  const isAdmin = !!user

  const BOUT_SELECT = `
    id, weight_class, round, winner,
    result_type, result_detail, fall_time_seconds, result_time_estimated,
    winner_score, loser_score,
    wrestler1_id, wrestler1_name_raw, wrestler1_school_raw,
    wrestler2_id, wrestler2_name_raw, wrestler2_school_raw,
    wrestler1_school:schools!wrestler1_school_id(id, display_name, is_nj),
    wrestler2_school:schools!wrestler2_school_id(id, display_name, is_nj)
  `
  const TOURN_SELECT = 'id, name, start_date, end_date, location, source_format, tournament_type, podium_depth'
  const PAGE = 1000

  // Try boys table first; fall back to girls table. IDs are globally unique UUIDs.
  const [{ data: boysTournBase }, { data: girlsTournBase }] = await Promise.all([
    supabase.from('in_season_tournaments').select(TOURN_SELECT).eq('id', id).maybeSingle(),
    supabase.from('in_season_tournaments_girls').select(TOURN_SELECT).eq('id', id).maybeSingle(),
  ])
  const isGirls  = !boysTournBase && !!girlsTournBase
  const boutTable  = isGirls ? 'tournament_bouts_girls'     : 'tournament_bouts'
  const istTable   = isGirls ? 'in_season_tournaments_girls' : 'in_season_tournaments'
  const tournBase  = boysTournBase ?? girlsTournBase

  const [
    { data: boutsPage0 },
    { data: boutsPage1 },
    { data: boutsPage2 },
    { data: placementsData },
    { count: bracketCount },
  ] = await Promise.all([
    supabase.from(boutTable).select(BOUT_SELECT)
      .eq('in_season_tournament_id', id).order('weight_class').order('round').range(0, PAGE - 1),
    supabase.from(boutTable).select(BOUT_SELECT)
      .eq('in_season_tournament_id', id).order('weight_class').order('round').range(PAGE, PAGE * 2 - 1),
    supabase.from(boutTable).select(BOUT_SELECT)
      .eq('in_season_tournament_id', id).order('weight_class').order('round').range(PAGE * 2, PAGE * 3 - 1),
    supabase
      .from('tournament_placements')
      .select(`
        weight_class, place, wrestler_name_raw, school_name_raw, school_id, wrestler_id,
        school:schools!school_id(display_name, is_nj)
      `)
      .eq('in_season_tournament_id', id)
      .lte('place', 8)
      .order('weight_class')
      .order('place'),
    supabase
      .from('tournament_bracket_slots')
      .select('*', { count: 'exact', head: true })
      .eq('in_season_tournament_id', id)
      .limit(1),
  ])
  const boutsData = [...(boutsPage0 ?? []), ...(boutsPage1 ?? []), ...(boutsPage2 ?? [])]

  if (!tournBase) notFound()

  // Try to fetch new venue/banner fields — gracefully no-op if migration not applied
  const [{ data: venueData }, { data: teamScoresData }] = await Promise.all([
    supabase
      .from(istTable)
      .select(`
        venue_name, venue_address, is_oos, banner_bg, banner_fg,
        location_school:schools!location_school_id(color_primary, color_secondary, color_tertiary, header_background)
      `)
      .eq('id', id)
      .single(),
    supabase
      .from('in_season_tournament_team_scores')
      .select('place, school_name, school_id, score, school:schools!school_id(is_nj, display_name)')
      .eq('tournament_id', id)
      .order('place')
      .order('school_name'),
  ])

  const tournData = { ...tournBase, ...(venueData ?? {}) }

  // Compute banner colors server-side
  const t = tournData as any
  let bannerBg = '#475569'
  let bannerFg = '#FFFFFF'
  if (t.banner_bg) {
    bannerBg = t.banner_bg
    bannerFg = t.banner_fg ?? pickTextColor(bannerBg, [])
  } else if (t.location_school) {
    const s = t.location_school as any
    bannerBg = s.header_background ?? s.color_secondary ?? '#475569'
    bannerFg = pickTextColor(bannerBg, [s.color_primary, s.color_secondary, s.color_tertiary])
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <Link
        href={isGirls ? '/girls/tournaments' : '/boys/tournaments'}
        className="text-sm text-slate-500 hover:text-slate-700 hover:underline mb-4 inline-block"
      >
        ← All Tournaments
      </Link>
      <TournamentPageClient
        tournament={tournData as any}
        allBouts={(boutsData ?? []) as any}
        placements={(placementsData ?? []) as any}
        teamScores={(teamScoresData ?? []) as any}
        bannerBg={bannerBg}
        bannerFg={bannerFg}
        isAdmin={isAdmin}
        hasBracket={(bracketCount ?? 0) > 0}
      />
    </div>
  )
}
