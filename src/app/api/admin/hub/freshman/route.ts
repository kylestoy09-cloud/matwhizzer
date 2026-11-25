// Middle School Hub: how a middle school tournament's placers did in their freshman postseason (Kyle 2026-11-13).
// A placer (1st–8th) at a tournament in middle school season S (March of S) who was an 8th grader graduates in
// S + 4 and was a freshman in season S + 1. They're matched to one of our wrestlers on this side by name AND that
// class year — the class year is what makes them the 8th grader. Their freshman district / region / state entries
// and places come from MatWhizzer's postseason. ?gender=M|F (the side), ?tournament= (a Middle School Hub
// tournament; default the NJ Kids Scholastic States).
import { NextRequest, NextResponse } from 'next/server'
import { hubAdmin, bad } from '../_auth'
import { hubTables } from '@/lib/hub'

export const dynamic = 'force-dynamic'

const DEFAULT_TOURNAMENT = 'USAW-NJ Scholastic State Championships (NJUSA)'
const norm = (s: string) => s.toLowerCase().replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim()
const level = (type: string) => (/state/.test(type) ? 'State' : /region/.test(type) ? 'Region' : 'District')

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const side = sp.get('gender')
  if (side !== 'M' && side !== 'F') return bad('gender must be M or F')
  const a = await hubAdmin('X')
  if (a.error) return a.error
  const { db } = a
  const T = hubTables('X')
  const page = async <R,>(q: (from: number, to: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>) => {
    const out: R[] = []
    for (let from = 0; ; from += 1000) {
      const { data, error } = await q(from, from + 999)
      if (error) throw new Error(error.message)
      out.push(...((data ?? []) as R[]))
      if (((data ?? []) as R[]).length < 1000) return out
    }
  }

  try {
    const { data: ts } = await db.from(T.tournaments).select('id, name').eq('hub', 'ms').order('name')
    const tId = Number(sp.get('tournament')) || (ts ?? []).find(t => t.name === DEFAULT_TOURNAMENT)?.id
    if (!tId) return NextResponse.json({ tournaments: ts ?? [], rows: [], seasons: [] })
    const { data: evs } = await db.from(T.events).select('id, season').eq('tournament_id', tId)
    const evSeason = new Map((evs ?? []).map(e => [e.id, e.season as number]))
    const placements = (evs ?? []).length ? await page<{ event_id: number; division: string | null; weight: string; place: number; place_to: number | null; name_listed: string; club_listed: string | null }>(
      (f, t) => db.from(T.placements).select('event_id, division, weight, place, place_to, name_listed, club_listed').in('event_id', [...evSeason.keys()]).lte('place', 8).is('place_to', null).order('id').range(f, t)) : []

    // our wrestlers of the class years in play, on this side
    const grads = [...new Set([...evSeason.values()].map(s => s + 4))]
    const ws = grads.length ? await page<{ id: string; first_name: string; last_name: string; graduation_year: number }>(
      (f, t) => db.from('wrestlers').select('id, first_name, last_name, graduation_year').eq('gender', side).in('graduation_year', grads).order('id').range(f, t)) : []
    const byName = new Map<string, typeof ws>()
    for (const w of ws) { const k = `${norm(`${w.first_name} ${w.last_name}`)}|${w.graduation_year}`; byName.set(k, [...(byName.get(k) ?? []), w]) }

    // freshman postseasons on file
    const seasons = [...new Set([...evSeason.values()].map(s => s + 1))]
    const pts = await page<{ id: number; season_id: number; tournament_type: string }>(
      (f, t) => db.from('tournaments').select('id, season_id, tournament_type').eq('gender', side).in('season_id', seasons).order('id').range(f, t))
    const tMap = new Map(pts.map(t => [t.id, t]))
    const withPostseason = new Set(pts.map(t => t.season_id))
    const matched = new Map<string, { id: string; season: number }>()
    for (const p of placements) {
      const s = evSeason.get(p.event_id)!
      const w = byName.get(`${norm(p.name_listed)}|${s + 4}`)
      if (w?.length === 1) matched.set(`${p.event_id}|${p.name_listed}`, { id: w[0].id, season: s + 1 })
    }
    const wIds = [...new Set([...matched.values()].map(m => m.id))]
    const entries: { id: number; wrestler_id: string; tournament_id: number; school_id: number | null }[] = []
    for (let i = 0; i < wIds.length; i += 200) {
      entries.push(...await page<{ id: number; wrestler_id: string; tournament_id: number; school_id: number | null }>(
        (f, t) => db.from('tournament_entries').select('id, wrestler_id, tournament_id, school_id').in('wrestler_id', wIds.slice(i, i + 200)).in('tournament_id', [...tMap.keys()]).order('id').range(f, t)))
    }
    const placeOf = new Map<number, number>()
    for (let i = 0; i < entries.length; i += 300) {
      const { data } = await db.from('placements').select('entry_id, place').in('entry_id', entries.slice(i, i + 300).map(e => e.id))
      for (const p of data ?? []) placeOf.set(p.entry_id, p.place)
    }
    const sIds = [...new Set(entries.map(e => e.school_id).filter(Boolean))] as number[]
    const school = new Map<number, string>()
    for (let i = 0; i < sIds.length; i += 300) {
      const { data } = await db.from('schools').select('id, display_name').in('id', sIds.slice(i, i + 300))
      for (const s of data ?? []) school.set(s.id, s.display_name)
    }

    const girlsDiv = (d: string | null) => /\b(girls?|women)\b/i.test(d ?? '')
    const rows = placements
      // this side: a matched wrestler is on it; an unmatched kid by the division (a girls division = girls)
      .filter(p => matched.has(`${p.event_id}|${p.name_listed}`) || (side === 'F') === girlsDiv(p.division))
      .map(p => {
        const ms = evSeason.get(p.event_id)!, m = matched.get(`${p.event_id}|${p.name_listed}`)
        const mine = m ? entries.filter(e => e.wrestler_id === m.id && tMap.get(e.tournament_id)?.season_id === m.season) : []
        const at = (lv: string) => mine.filter(e => level(tMap.get(e.tournament_id)!.tournament_type) === lv)
        const finish = (lv: string) => { const es = at(lv); if (!es.length) return null; const pl = es.map(e => placeOf.get(e.id)).filter((x): x is number => !!x); return pl.length ? Math.min(...pl) : 0 }   // 0 = entered, no place
        const furthest = !m ? null : !withPostseason.has(m.season) ? 'Not yet' : (['State', 'Region', 'District'] as const).find(lv => at(lv).length) ?? 'None'
        return {
          ms_season: ms, division: p.division, weight: p.weight, place: p.place, name: p.name_listed, club: p.club_listed,
          matched: !!m, wrestler_id: m?.id ?? null, hs_school: mine.map(e => school.get(e.school_id ?? 0)).find(Boolean) ?? null,
          freshman_season: m?.season ?? null, furthest, district: finish('District'), region: finish('Region'), state: finish('State'),
        }
      })
    return NextResponse.json({ tournaments: ts ?? [], tournament_id: tId, seasons: [...new Set([...evSeason.values()])].sort(), postseasons: [...withPostseason].sort(), rows })
  } catch (e) {
    return bad((e as Error).message, 500)
  }
}
