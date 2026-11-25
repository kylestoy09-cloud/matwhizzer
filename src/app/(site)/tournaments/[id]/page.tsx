import { supabase } from '@/lib/supabase/public-cached'
import { createSupabaseServer } from '@/lib/supabase/server'
import { isAdminUser } from '@/lib/auth/isAdminUser'
import Link from 'next/link'
import { fullBracket } from '@/lib/boutBracket'
import { notFound } from 'next/navigation'
import { TournamentPageClient } from './TournamentPageClient'
import { personLabel } from '@/lib/personName'

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
  // edit links only for admins: fans have accounts too
  const isAdmin = await isAdminUser(user?.id)

  const BOUT_SELECT = `
    id, weight_class, round, winner,
    result_type, result_detail, fall_time_seconds, result_time_estimated,
    winner_score, loser_score,
    wrestler1_id, wrestler1_name_raw, wrestler2_id, wrestler2_name_raw,
    w1:wrestlers!wrestler1_id(first_name, last_name),
    w2:wrestlers!wrestler2_id(first_name, last_name),
    wrestler1_school:schools!wrestler1_school_id(id, display_name, is_nj, logo_url, header_background),
    wrestler2_school:schools!wrestler2_school_id(id, display_name, is_nj, logo_url, header_background)
  `
  const TOURN_SELECT = 'id, name, start_date, end_date, location, source_format, tournament_type, podium_depth, is_oos'
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
  // the page's stream link (20261118_meet_stream_and_details.sql) — read apart, so the page works before the column exists
  let streamUrl: string | null = null
  if (tournBase) {
    const { data: st, error: stErr } = await supabase.from(istTable).select('stream_url').eq('id', id).maybeSingle()
    if (!stErr) streamUrl = (st as { stream_url: string | null } | null)?.stream_url ?? null
  }

  // the edition before / after (Kyle 2026-11-19: "previous year and next year buttons"): linked by prior_id, which the
  // Tournament Registry fills as each season's slate is matched — read apart, so the page works without it
  let prevEdition: { id: string; season: string | null } | null = null, nextEdition: { id: string; season: string | null } | null = null
  if (tournBase) {
    const [{ data: me }, { data: after }] = await Promise.all([
      supabase.from(istTable).select('prior_id').eq('id', id).maybeSingle(),
      supabase.from(istTable).select('id, season, start_date').eq('prior_id', id).order('start_date', { ascending: false }).limit(1),
    ])
    const priorId = (me as { prior_id: string | null } | null)?.prior_id ?? null
    if (priorId) {
      const { data: p } = await supabase.from(istTable).select('id, season').eq('id', priorId).maybeSingle()
      if (p) prevEdition = p as { id: string; season: string | null }
    }
    if (after?.[0]) nextEdition = after[0] as { id: string; season: string | null }
  }

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
        weight_class, place, wrestler_name_raw, school_id, wrestler_id,
        wrestler:wrestlers!wrestler_id(first_name, last_name),
        school:schools!school_id(id, display_name, is_nj, logo_url, header_background)
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
      .select('place, school_id, score, school:schools!school_id(id, is_nj, display_name, logo_url, header_background)')
      .eq('tournament_id', id)
      .order('place'),
  ])

  const tournData = { ...tournBase, ...(venueData ?? {}) }

  // Names come from the wrestler's profile and schools from the school id; the imported text
  // never reaches the page. A side with no wrestler is a forfeit slot or an unknown opponent.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bouts = (boutsData ?? []).map(({ wrestler1_name_raw, wrestler2_name_raw, w1, w2, ...b }: any) => ({
    ...b, wrestler1_name: personLabel(w1, wrestler1_name_raw), wrestler2_name: personLabel(w2, wrestler2_name_raw),
  }))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const placements = (placementsData ?? []).map(({ wrestler_name_raw, wrestler, ...p }: any) => ({
    ...p, wrestler_name: personLabel(wrestler, wrestler_name_raw),
  }))

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
      <div className="flex items-center justify-between gap-3 mb-4">
        <Link
          href={isGirls ? '/girls/tournaments' : '/boys/tournaments'}
          className="text-sm text-slate-500 hover:text-slate-700 hover:underline inline-block"
        >
          ← All Tournaments
        </Link>
        {(prevEdition || nextEdition) && (
          <div className="flex items-center gap-1 text-sm">
            <Link href={`/tournaments/${id}/history`} className="px-2 py-0.5 border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 mr-1">History</Link>
            {prevEdition && <Link href={`/tournaments/${prevEdition.id}`} title="This tournament the season before" className="px-2 py-0.5 border border-amber-300 bg-amber-50 text-amber-800 font-semibold hover:bg-amber-100">‹ {prevEdition.season ?? 'Previous year'}</Link>}
            {nextEdition && <Link href={`/tournaments/${nextEdition.id}`} title="This tournament the season after" className="px-2 py-0.5 border border-amber-300 bg-amber-50 text-amber-800 font-semibold hover:bg-amber-100">{nextEdition.season ?? 'Next year'} ›</Link>}
          </div>
        )}
      </div>
      <TournamentPageClient
        tournament={tournData as any}
        allBouts={bouts as any}
        placements={placements as any}
        teamScores={(teamScoresData ?? []) as any}
        bannerBg={bannerBg}
        bannerFg={bannerFg}
        isAdmin={isAdmin}
        // the bracket is built from the bouts (src/lib/boutBracket.ts): only when they make full brackets — an event
        // loaded from NJ teams' results holds only our wrestlers' bouts (Kyle 2026-11-21)
        hasBracket={fullBracket(bouts as never, !!(tournData as { is_oos?: boolean | null } | null)?.is_oos || (tournData as { tournament_type?: string | null } | null)?.tournament_type === 'outside')}
        streamUrl={streamUrl}
        tournamentGender={isGirls ? 'F' : 'M'}
      />
    </div>
  )
}
