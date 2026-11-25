// Past Seasons tabs (Kyle 2026-11-12): one season, one side. ?tab=schools|wrestlers|coaches|tournaments|
// leaderboards|playoffs&seasonId=2026&gender=M|F. Read-only lists built from that season's own data
// (the season's program names, coaches, ratings, leaderboards and postseason brackets).
import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/auth/isAdminUser'
import { createSupabaseAdmin } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

type Db = ReturnType<typeof createSupabaseAdmin>

async function pageAll<T>(q: (from: number, to: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<T[]> {
  const all: T[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await q(from, from + 999)
    if (error) throw new Error(error.message)
    const rows = (data ?? []) as T[]
    all.push(...rows)
    if (rows.length < 1000) return all
  }
}

/** Program names as they were that season: the season's own name, else the side's current name. */
async function programNames(db: Db, gender: 'M' | 'F', seasonId: number): Promise<Map<number, string>> {
  const [{ data: programs }, { data: seasonNames }] = await Promise.all([
    db.from(gender === 'F' ? 'girls_schools' : 'boys_schools').select('school_id, display_name'),
    db.from('school_season_names').select('school_id, display_name').eq('season_id', seasonId).eq('gender', gender),
  ])
  const m = new Map((programs ?? []).map(p => [p.school_id as number, p.display_name as string]))
  for (const n of seasonNames ?? []) m.set(n.school_id as number, n.display_name as string)
  return m
}

async function schoolNames(db: Db, gender: 'M' | 'F', seasonId: number, ids: number[]): Promise<Map<number, string>> {
  const names = await programNames(db, gender, seasonId)
  const missing = [...new Set(ids)].filter(id => id && !names.has(id))
  for (let i = 0; i < missing.length; i += 200) {
    const { data } = await db.from('schools').select('id, display_name').in('id', missing.slice(i, i + 200))
    for (const s of data ?? []) names.set(s.id as number, s.display_name as string)
  }
  return names
}

export async function GET(req: NextRequest) {
  if (!(await getAdminUser())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const sp = req.nextUrl.searchParams
  const gender = sp.get('gender') === 'F' ? 'F' : sp.get('gender') === 'M' ? 'M' : null
  const seasonId = Number(sp.get('seasonId'))
  if (!gender || !seasonId) return NextResponse.json({ error: 'gender and seasonId are required' }, { status: 400 })
  const db = createSupabaseAdmin()
  const g = gender === 'F' ? 'girls' : 'boys'
  const { data: season } = await db.from('seasons').select('id, year_label').eq('id', seasonId).maybeSingle()
  if (!season) return NextResponse.json({ error: 'Unknown season' }, { status: 404 })
  const seasonLabel = season.year_label as string

  try {
    switch (sp.get('tab')) {
      case 'schools': {
        const [names, inactive, pp, districts, regions, details, districtNames, regionNames] = await Promise.all([
          programNames(db, gender, seasonId),
          db.from('inactive_school_seasons').select('school_id').eq('season_id', seasonId).eq('gender', gender),
          db.from('power_points').select('school_id, overall_wins, overall_losses, overall_ties, power_points, pp_group').eq('season_id', seasonId).eq('gender', gender),
          db.from(`${g}_school_districts`).select('school_id, district_id').eq('season_id', seasonId),
          db.from(`${g}_school_regions`).select('school_id, region_id').eq('season_id', seasonId),
          db.from(`${g}_school_season_details`).select('school_id, section, classification').eq('season_id', seasonId),
          db.from(`${g}_districts`).select('id, name'),
          db.from(`${g}_regions`).select('id, name'),
        ])
        const off = new Set((inactive.data ?? []).map(r => r.school_id))
        const ppMap = new Map((pp.data ?? []).map(r => [r.school_id, r]))
        const dMap = new Map((districts.data ?? []).map(r => [r.school_id, r.district_id])), rMap = new Map((regions.data ?? []).map(r => [r.school_id, r.region_id]))
        const detMap = new Map((details.data ?? []).map(r => [r.school_id, r]))
        const dn = new Map((districtNames.data ?? []).map(r => [r.id, r.name])), rn = new Map((regionNames.data ?? []).map(r => [r.id, r.name]))
        const rows = [...names].map(([id, name]) => {
          const p = ppMap.get(id), det = detMap.get(id)
          return {
            school_id: id, name, active: !off.has(id),
            wins: p?.overall_wins ?? null, losses: p?.overall_losses ?? null, ties: p?.overall_ties ?? null, power_points: p?.power_points ?? null, pp_group: p?.pp_group ?? null,
            district: dn.get(dMap.get(id)) ?? null, region: rn.get(rMap.get(id)) ?? null,
            section: det?.section ?? null, group: det?.classification ?? null,
          }
        }).filter(r => r.active || r.wins != null).sort((a, b) => a.name.localeCompare(b.name))
        return NextResponse.json({ rows })
      }

      case 'wrestlers': {
        const lb = await pageAll<{ wrestler_id: string; school_id: number | null; wrestler_name: string; weight: number | null; matches: number; pins: number; techs: number; bonus_wins: number; bonus_pct: number | null; wrr: number | null }>(
          (f, t) => db.from('lb_rs_wrestler').select('wrestler_id, school_id, wrestler_name, weight, matches, pins, techs, bonus_wins, bonus_pct, wrr').eq('season_id', seasonId).eq('gender', gender).order('wrestler_id').range(f, t))
        const wr = await pageAll<{ wrestler_id: string; hammer_score: number; weight_class: string | null; school_id: number | null }>(
          (f, t) => db.from('wrestler_hammer_scores').select('wrestler_id, hammer_score, weight_class, school_id').eq('season', seasonLabel).eq('gender', gender).order('wrestler_id').range(f, t))
        const wrMap = new Map(wr.map(r => [r.wrestler_id, r]))
        const names = await schoolNames(db, gender, seasonId, [...lb.map(r => r.school_id ?? 0), ...wr.map(r => r.school_id ?? 0)])
        const rows = lb.map(r => {
          const w = wrMap.get(r.wrestler_id)
          const sid = r.school_id ?? w?.school_id ?? null
          return { wrestler_id: r.wrestler_id, name: r.wrestler_name, school: sid ? names.get(sid) ?? null : null, weight: w?.weight_class ?? (r.weight != null ? String(r.weight) : null),
            matches: r.matches, pins: r.pins, techs: r.techs, bonus_pct: r.bonus_pct, wrr: w ? Number(w.hammer_score) : null }
        }).sort((a, b) => (b.wrr ?? -999) - (a.wrr ?? -999))
        return NextResponse.json({ rows })
      }

      case 'coaches': {
        const [names, coaches] = await Promise.all([
          programNames(db, gender, seasonId),
          db.from(`${g}_coaches`).select('school_id, name, title, email, phone').eq('season_id', seasonId).eq('is_active', true),
        ])
        const rows = (coaches.data ?? []).map(c => ({ school_id: c.school_id, school: names.get(c.school_id) ?? `#${c.school_id}`, name: c.name, title: c.title, email: c.email, phone: c.phone }))
          .sort((a, b) => a.school.localeCompare(b.school))
        const withCoach = new Set(rows.map(r => r.school_id))
        return NextResponse.json({ rows, without: [...names].filter(([id]) => !withCoach.has(id)).map(([, n]) => n).sort() })
      }

      case 'tournaments': {
        const t = gender === 'F' ? 'in_season_tournaments_girls' : 'in_season_tournaments'
        const bt = gender === 'F' ? 'tournament_bouts_girls' : 'tournament_bouts'
        const { data: ts, error } = await db.from(t).select('id, name, start_date, point_value, tournament_type, is_oos, venue_name').eq('season', seasonLabel).order('start_date')
        if (error) throw new Error(error.message)
        const rows = await Promise.all((ts ?? []).map(async x => {
          const [b, p, s] = await Promise.all([
            db.from(bt).select('id', { count: 'exact', head: true }).eq('in_season_tournament_id', x.id),
            db.from('tournament_placements').select('id', { count: 'exact', head: true }).eq('in_season_tournament_id', x.id),
            db.from('in_season_tournament_team_scores').select('school_name, score').eq('tournament_id', x.id).order('score', { ascending: false }).limit(1),
          ])
          return { id: x.id, name: x.name, date: x.start_date, points: x.point_value, venue: x.venue_name, out_of_state: x.is_oos, bouts: b.count ?? 0, placements: p.count ?? 0,
            team_champion: s.data?.[0] ? `${s.data[0].school_name} (${s.data[0].score})` : null }
        }))
        return NextResponse.json({ rows })
      }

      case 'leaderboards': {
        const lb = await pageAll<{ wrestler_name: string; school_id: number | null; weight: number | null; matches: number; pins: number; techs: number; bonus_wins: number; bonus_pct: number | null; fastest_pin: number | null; wrr: number | null }>(
          (f, t) => db.from('lb_rs_wrestler').select('wrestler_name, school_id, weight, matches, pins, techs, bonus_wins, bonus_pct, fastest_pin, wrr').eq('season_id', seasonId).eq('gender', gender).order('wrestler_id').range(f, t))
        const teams = await pageAll<{ school_id: number; pins: number; techs: number; bonus_pct: number | null; duals: number; points_per_dual: number | null; team_wrr: number | null }>(
          (f, t) => db.from('lb_rs_team').select('school_id, pins, techs, bonus_pct, duals, points_per_dual, team_wrr').eq('season_id', seasonId).eq('gender', gender).order('school_id').range(f, t))
        const names = await schoolNames(db, gender, seasonId, [...lb.map(r => r.school_id ?? 0), ...teams.map(r => r.school_id)])
        const top = <T,>(rows: T[], val: (r: T) => number | null, n = 10, asc = false) =>
          rows.filter(r => val(r) != null).sort((a, b) => asc ? val(a)! - val(b)! : val(b)! - val(a)!).slice(0, n)
        const w = (r: typeof lb[number], v: number | string | null) => ({ name: r.wrestler_name, school: r.school_id ? names.get(r.school_id) ?? null : null, weight: r.weight, value: v })
        const t = (r: typeof teams[number], v: number | string | null) => ({ name: names.get(r.school_id) ?? `#${r.school_id}`, school: null, weight: null, value: v })
        const MIN = 15   // matches for a percentage list
        return NextResponse.json({ lists: [
          { title: 'Most pins', rows: top(lb, r => r.pins).map(r => w(r, r.pins)) },
          { title: 'Most tech falls', rows: top(lb, r => r.techs).map(r => w(r, r.techs)) },
          { title: 'Most bonus-point wins', rows: top(lb, r => r.bonus_wins).map(r => w(r, r.bonus_wins)) },
          { title: `Best bonus % (${MIN}+ matches)`, rows: top(lb.filter(r => r.matches >= MIN), r => r.bonus_pct).map(r => w(r, `${r.bonus_pct}%`)) },
          { title: 'Fastest pin (seconds)', rows: top(lb, r => r.fastest_pin, 10, true).map(r => w(r, r.fastest_pin)) },
          { title: 'Highest WRR', rows: top(lb, r => r.wrr).map(r => w(r, r.wrr)) },
          { title: 'Team pins', rows: top(teams, r => r.pins).map(r => t(r, r.pins)) },
          { title: 'Team bonus %', rows: top(teams.filter(r => r.duals >= 5), r => r.bonus_pct).map(r => t(r, `${r.bonus_pct}%`)) },
          { title: 'Team points per dual (5+ duals)', rows: top(teams.filter(r => r.duals >= 5), r => r.points_per_dual).map(r => t(r, r.points_per_dual)) },
          { title: 'Team WRR', rows: top(teams, r => r.team_wrr).map(r => t(r, r.team_wrr)) },
        ] })
      }

      case 'playoffs': {
        const stateT = gender === 'F' ? 'girls_state' : 'boys_state', regT = gender === 'F' ? 'girls_regions' : 'regions'
        const { data: ts } = await db.from('tournaments').select('id, tournament_type, district_id, region_id').eq('season_id', seasonId).eq('gender', gender).in('tournament_type', ['districts', regT, stateT])
        const [{ data: dn }, { data: rn }] = await Promise.all([db.from(`${g}_districts`).select('id, name'), db.from(`${g}_regions`).select('id, name')])
        const dName = new Map((dn ?? []).map(r => [r.id, r.name])), rName = new Map((rn ?? []).map(r => [r.id, r.name]))
        const tIds = (ts ?? []).map(t => t.id)
        const entries = await pageAll<{ id: string; wrestler_id: string; school_id: number | null; tournament_id: number; weight_classes: { weight: number } | null }>(
          (f, t) => db.from('tournament_entries').select('id, wrestler_id, school_id, tournament_id, weight_classes(weight)').in('tournament_id', tIds).order('id').range(f, t))
        const matches = await pageAll<{ round: string; winner_entry_id: string | null; loser_entry_id: string | null }>(
          (f, t) => db.from('matches').select('round, winner_entry_id, loser_entry_id').in('tournament_id', tIds).in('round', ['F', '3rd_Place', '5th_Place', '7th_Place']).eq('validated', true).order('id').range(f, t))
        const eMap = new Map(entries.map(e => [e.id, e]))
        const wIds = [...new Set(entries.map(e => e.wrestler_id))]
        const wn = new Map<string, string>()
        for (let i = 0; i < wIds.length; i += 300) {
          const { data } = await db.from('wrestlers').select('id, first_name, last_name').in('id', wIds.slice(i, i + 300))
          for (const w of data ?? []) wn.set(w.id, `${w.first_name} ${w.last_name}`)
        }
        const names = await schoolNames(db, gender, seasonId, entries.map(e => e.school_id ?? 0))
        const PLACE: Record<string, number> = { F: 1, '3rd_Place': 3, '5th_Place': 5, '7th_Place': 7 }
        const placed = new Map<number, { weight: number; place: number; name: string; school: string | null }[]>()
        for (const m of matches) {
          for (const [eid, place] of [[m.winner_entry_id, PLACE[m.round]], [m.loser_entry_id, PLACE[m.round] + 1]] as const) {
            const e = eid ? eMap.get(eid) : null
            if (!e) continue
            placed.set(e.tournament_id, [...(placed.get(e.tournament_id) ?? []), { weight: e.weight_classes?.weight ?? 0, place, name: wn.get(e.wrestler_id) ?? '?', school: e.school_id ? names.get(e.school_id) ?? null : null }])
          }
        }
        const label = (t: { tournament_type: string; district_id: number | null; region_id: number | null }) =>
          t.tournament_type === stateT ? 'State' : t.tournament_type === 'districts' ? dName.get(t.district_id) ?? `District ${t.district_id}` : rName.get(t.region_id) ?? `Region ${t.region_id}`
        const order = (t: { tournament_type: string }) => t.tournament_type === stateT ? 0 : t.tournament_type === regT ? 1 : 2
        const rows = (ts ?? []).map(t => ({ id: t.id, level: t.tournament_type === stateT ? 'state' : t.tournament_type === 'districts' ? 'district' : 'region', name: label(t), order: order(t),
          placers: (placed.get(t.id) ?? []).sort((a, b) => a.weight - b.weight || a.place - b.place) }))
          .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, undefined, { numeric: true }))
        return NextResponse.json({ rows })
      }
    }
    return NextResponse.json({ error: 'tab must be schools, wrestlers, coaches, tournaments, leaderboards or playoffs' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
