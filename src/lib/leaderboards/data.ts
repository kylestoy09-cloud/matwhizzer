// Leaderboard reads. Each function returns one table's rows (n + 1, so the page knows whether
// there are more) sorted and filtered in the database. Regular season and postseason read the
// lb_rs_* / lb_ps_* tables (rebuilt by lb_rs_refresh / lb_ps_refresh after each rating run);
// analytics call the lb_an_* functions. Every row carries its school's id and logo.

import { supabase } from '@/lib/supabase/public-cached'
import {
  MIN_DUALS, MIN_PS_MATCHES, MIN_PS_TEAM_MATCHES, MIN_RS_MATCHES, MIN_RS_TEAM_CONTESTED,
  analyticsLevel, poolFor, type Gender, type Params,
} from './config'

export type School = { id: number; display_name: string; logo_url: string | null; header_background: string | null }
export type WrestlerRow = {
  wrestler_id: string; wrestler_name: string; weight: number | null; school: School | null
  pins: number; fastest_pin: number | null; pin_avg: number | null
  techs: number; fastest_tf: number | null; tf_avg: number | null; pins_techs: number
  bonus_wins: number; matches: number; bonus_pct: number | null
  // regular season
  fastest_pin_wt?: number | null; fastest_tf_wt?: number | null; wrr?: number | null
  // postseason
  fastest_pin_ctx?: string | null; fastest_tf_ctx?: string | null; wins?: number; points?: number | null
  mat_time?: number | null; mat_wins?: number | null
}
export type TeamRow = {
  school: School | null; pins: number; techs: number; bonus_wins: number; matches: number; bonus_pct: number | null
  // regular season
  dual_pins?: number; tourn_pins?: number; dual_techs?: number; tourn_techs?: number; contested?: number
  pin_pct?: number | null; tf_pct?: number | null; duals?: number; dual_points?: number
  points_per_dual?: number | null; team_wrr?: number | null
  // postseason
  team_points?: number | null
}

const SCHOOL = 'id, display_name, logo_url, header_background'
// !inner when filtering by conference / section / group (the filter applies to the school)
const schoolEmbed = (inner: boolean) => `school:schools${inner ? '!inner' : ''}(${SCHOOL}, athletic_conference, section, classification)`
const DESC = { ascending: false }
const LAST = { ascending: true, nullsFirst: false }

// Selects are built at runtime, which the client's type parser can't follow
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Q = any

function withSchoolFilters(q: Q, p: Params): Q {
  if (p.conf.length) q = q.in('school.athletic_conference', p.conf)
  if (p.sec.length)  q = q.in('school.section', p.sec)
  if (p.grp.length)  q = q.in('school.classification', p.grp)
  return q
}

async function run<T>(q: Q, n: number): Promise<{ rows: T[]; more: boolean; error: string | null }> {
  const { data, error } = await q.range(0, n)
  const rows = (data ?? []) as T[]
  return { rows: rows.slice(0, n), more: rows.length > n, error: error?.message ?? null }
}

/** Shared individual sorting for regular season and postseason */
function individualOrder(q: Q, p: Params, minMatches: number): Q {
  switch (p.cat) {
    case 'quickest':
      return p.sort === 'tech'
        ? q.not('fastest_tf', 'is', null).order('fastest_tf').order('fastest_pin', LAST)
        : q.not('fastest_pin', 'is', null).order('fastest_pin').order('fastest_tf', LAST)
    case 'most': {
      const col = p.sort === 'pins' ? 'pins' : p.sort === 'techs' ? 'techs' : 'pins_techs'
      return q.gt(col, 0).order(col, DESC).order('pins_techs', DESC).order('pins', DESC)
    }
    case 'bonus':
      return q.gte('matches', minMatches).not('bonus_pct', 'is', null).order('bonus_pct', DESC).order('bonus_wins', DESC)
    case 'wrr':
      return q.gt('wrr', 0).order('wrr', DESC)
    case 'points':
      return q.not('points', 'is', null).order('points', DESC).order('wins', DESC)
    case 'mattime':
      return q.not('mat_time', 'is', null).order('mat_time').order('mat_wins', DESC)
    default:
      return q
  }
}

export async function rsIndividual(gender: Gender, season: number, p: Params) {
  const filtered = p.conf.length + p.sec.length + p.grp.length > 0
  let q = supabase.from('lb_rs_wrestler')
    .select(`wrestler_id, wrestler_name, weight, pins, fastest_pin, fastest_pin_wt, pin_avg, techs, fastest_tf, fastest_tf_wt, tf_avg, pins_techs, bonus_wins, matches, bonus_pct, wrr, ${schoolEmbed(filtered)}`)
    .eq('gender', gender).eq('season_id', season)
  if (p.wt) q = q.eq('weight', p.wt)
  q = individualOrder(withSchoolFilters(q, p), p, MIN_RS_MATCHES).order('wrestler_id')
  return run<WrestlerRow>(q, p.n)
}

export async function rsTeam(gender: Gender, season: number, p: Params) {
  const filtered = p.conf.length + p.sec.length + p.grp.length > 0
  let q = withSchoolFilters(supabase.from('lb_rs_team')
    .select(`pins, dual_pins, tourn_pins, techs, dual_techs, tourn_techs, bonus_wins, matches, contested, pin_pct, tf_pct, bonus_pct, duals, dual_points, points_per_dual, team_wrr, ${schoolEmbed(filtered)}`)
    .eq('gender', gender).eq('season_id', season), p)
  switch (p.cat) {
    case 'pins': case 'techs': {
      const base = p.cat
      const col = p.sort === 'dual' ? `dual_${base}` : p.sort === 'tourn' ? `tourn_${base}` : p.sort === 'pct' ? (base === 'pins' ? 'pin_pct' : 'tf_pct') : base
      q = q.gte('contested', MIN_RS_TEAM_CONTESTED).gt(base, 0).order(col, DESC).order(base, DESC); break
    }
    case 'bonus': q = q.gte('contested', MIN_RS_TEAM_CONTESTED).not('bonus_pct', 'is', null).order('bonus_pct', DESC); break
    case 'wrr':   q = q.gt('team_wrr', 0).order('team_wrr', DESC); break
    case 'ppd':   q = q.gte('duals', MIN_DUALS).not('points_per_dual', 'is', null).order('points_per_dual', DESC); break
  }
  return run<TeamRow>(q.order('school_id'), p.n)
}

export async function psIndividual(gender: Gender, season: number, p: Params) {
  let q = supabase.from('lb_ps_wrestler')
    .select(`wrestler_id, wrestler_name, weight, pins, fastest_pin, fastest_pin_ctx, pin_avg, techs, fastest_tf, fastest_tf_ctx, tf_avg, pins_techs, bonus_wins, matches, bonus_pct, wins, points, mat_time, mat_wins, ${schoolEmbed(false)}`)
    .eq('gender', gender).eq('season_id', season).eq('pool', poolFor(p.level, p.scope))
  if (p.wt) q = q.eq('weight', p.wt)
  q = individualOrder(q, p, MIN_PS_MATCHES).order('wrestler_id')
  return run<WrestlerRow>(q, p.n)
}

export async function psTeam(gender: Gender, season: number, p: Params) {
  let q = supabase.from('lb_ps_team')
    .select(`team_points, pins, techs, bonus_wins, matches, bonus_pct, ${schoolEmbed(false)}`)
    .eq('gender', gender).eq('season_id', season).eq('pool', poolFor(p.level, p.scope))
  switch (p.cat) {
    case 'points': q = q.not('team_points', 'is', null).order('team_points', DESC); break
    case 'pins':   q = q.gt('pins', 0).order('pins', DESC).order('matches'); break
    case 'techs':  q = q.gt('techs', 0).order('techs', DESC).order('matches'); break
    case 'bonus':  q = q.gte('matches', MIN_PS_TEAM_MATCHES).not('bonus_pct', 'is', null).order('bonus_pct', DESC); break
  }
  return run<TeamRow>(q.order('school_id'), p.n)
}

// ── Analytics ─────────────────────────────────────────────────────────────────────────

/** Every school's name and logo by id (analytics rows carry only school ids) */
export async function schoolsById(): Promise<Map<number, School>> {
  const { data } = await supabase.from('schools').select(SCHOOL).order('id')
  return new Map(((data ?? []) as School[]).map(s => [s.id, s]))
}

export type AnalyticsRow = Record<string, string | number | null>

export async function analytics(gender: Gender, season: number, p: Params) {
  const lvl = analyticsLevel(p.alevel)
  const base = { p_gender: gender, p_season: season }
  const call = async (fn: string, args: Record<string, unknown>, limited = true) => {
    const { data, error } = await supabase.rpc(fn, limited ? { ...args, p_limit: p.n + 1 } : args)
    const rows = (data ?? []) as AnalyticsRow[]
    return { rows: rows.slice(0, p.n), more: rows.length > p.n, error: error?.message ?? null }
  }
  switch (p.cat) {
    case 'buster':      return call('lb_an_bracket_buster', { ...base, p_level: lvl })
    case 'backside':    return call('lb_an_comebacks', { ...base, p_level: lvl })
    case 'techmasters': return call('lb_an_technical_masters', { ...base, p_level: lvl })
    case 'margins':     return call('lb_an_margins', { ...base, p_level: lvl }, false)
    case 'cinderella':  return call('lb_an_cinderella', base)
    case 'revenge':     return call('lb_revenge_matches', base, false)
    case 'districts':   return call('lb_district_strength', base, false)
    case 'depth':       return call('lb_school_depth', base, false)
    default:            return { rows: [], more: false, error: null }
  }
}
