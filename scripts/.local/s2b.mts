import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function all(q: (f: number, t: number) => any) { const out: any[] = []; for (let i = 0; ; i += 1000) { const { data, error } = await q(i, i + 999); if (error) throw new Error(error.message); out.push(...data); if (data.length < 1000) break } return out }
const linked = new Set((await all((f, t) => db.from('wrestler_name_aliases').select('wrestler_id').order('id').range(f, t))).map((a: any) => a.wrestler_id))
const ws = await all((f, t) => db.from('wrestlers').select('id, gender, is_active, is_oos, first_name').eq('is_active', true).eq('is_oos', false).neq('first_name', 'Unknown').order('id').range(f, t))
const cand = new Set(ws.filter((w: any) => !linked.has(w.id)).map((w: any) => w.id))
const seasons = new Map<string, Set<string>>()
const mark = (w: string | null, s: string) => { if (w && cand.has(w)) (seasons.get(w) ?? seasons.set(w, new Set()).get(w)!).add(s) }
const istSeason = new Map<string, string>(); for (const t of ['in_season_tournaments', 'in_season_tournaments_girls']) for (const x of (await db.from(t).select('id, season')).data!) istSeason.set(x.id, x.season)
for (const t of ['tournament_bouts', 'tournament_bouts_girls']) for (const b of await all((f, tt) => db.from(t).select('in_season_tournament_id, wrestler1_id, wrestler2_id').order('id').range(f, tt))) { const s = istSeason.get(b.in_season_tournament_id) ?? '?'; mark(b.wrestler1_id, `tourn ${s}`); mark(b.wrestler2_id, `tourn ${s}`) }
const dmSeason = new Map<string, number>(); for (const t of ['dual_meets', 'dual_meets_girls']) for (const m of await all((f, tt) => db.from(t).select('id, season_id').order('id').range(f, tt))) dmSeason.set(m.id, m.season_id)
for (const t of ['dual_meet_matches', 'dual_meet_matches_girls']) for (const b of await all((f, tt) => db.from(t).select('dual_meet_id, wrestler_a_id, wrestler_b_id').order('id').range(f, tt))) { const s = dmSeason.get(b.dual_meet_id); mark(b.wrestler_a_id, `dual ${s}`); mark(b.wrestler_b_id, `dual ${s}`) }
const tSeason = new Map((await db.from('tournaments').select('id, season_id')).data!.map((t: any) => [t.id, t.season_id]))
for (const e of await all((f, tt) => db.from('tournament_entries').select('tournament_id, wrestler_id').order('id').range(f, tt))) mark(e.wrestler_id, `post ${tSeason.get(e.tournament_id)}`)
const tally: Record<string, number> = {}
for (const [, s] of seasons) { const has26 = [...s].some(x => /2025-26|2026/.test(x)); const k = has26 ? 'has 2025-26 records' : `only older: ${[...s].sort().join(' + ')}`; tally[k] = (tally[k] ?? 0) + 1 }
console.log(JSON.stringify(Object.entries(tally).sort((a: any, b: any) => b[1] - a[1]), null, 1))
