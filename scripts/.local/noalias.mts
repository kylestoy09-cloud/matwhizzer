// active wrestlers with 2025-26 bouts/entries for a school but no name alias at that school
import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function all(q: (f: number, t: number) => any) { const out: any[] = []; for (let i = 0; ; i += 1000) { const { data, error } = await q(i, i + 999); if (error) throw new Error(error.message); out.push(...data); if (data.length < 1000) break } return out }
for (const g of ['F'] as const) {
  const pairs = new Map<string, Set<string>>()   // wrestler → schools
  const add = (w: string | null, s: number | null, src: string) => { if (!w || !s) return; const k = `${w}|${s}`; (pairs.get(k) ?? pairs.set(k, new Set()).get(k)!).add(src) }
  const istT = g === 'F' ? 'in_season_tournaments_girls' : 'in_season_tournaments'
  const ist = new Set((await db.from(istT).select('id').eq('season', '2025-26')).data!.map((x: any) => x.id))
  const tb = await all((f, t) => db.from(g === 'F' ? 'tournament_bouts_girls' : 'tournament_bouts').select('in_season_tournament_id, wrestler1_id, wrestler2_id, wrestler1_school_id, wrestler2_school_id').order('id').range(f, t))
  for (const b of tb) if (ist.has(b.in_season_tournament_id)) { add(b.wrestler1_id, b.wrestler1_school_id, 'tourn'); add(b.wrestler2_id, b.wrestler2_school_id, 'tourn') }
  const meetIds = new Set((await all((f, t) => { let q = db.from(g === 'F' ? 'dual_meets_girls' : 'dual_meets').select('id').eq('season_id', 2026); if (g === 'M') q = q.eq('gender', 'M'); return q.order('id').range(f, t) })).map((m: any) => m.id))
  const dm = await all((f, t) => db.from(g === 'F' ? 'dual_meet_matches_girls' : 'dual_meet_matches').select('dual_meet_id, wrestler_a_id, wrestler_b_id, school_a_id, school_b_id').order('id').range(f, t))
  for (const b of dm) if (meetIds.has(b.dual_meet_id)) { add(b.wrestler_a_id, b.school_a_id, 'dual'); add(b.wrestler_b_id, b.school_b_id, 'dual') }
  const tours = new Set((await db.from('tournaments').select('id').eq('gender', g).eq('season_id', 2026)).data!.map((t: any) => t.id))
  const te = await all((f, t) => db.from('tournament_entries').select('tournament_id, wrestler_id, school_id').order('id').range(f, t))
  for (const e of te) if (tours.has(e.tournament_id)) add(e.wrestler_id, e.school_id, 'post')
  const al = new Set((await all((f, t) => db.from('wrestler_name_aliases').select('wrestler_id, school_id').order('id').range(f, t))).map((a: any) => `${a.wrestler_id}|${a.school_id}`))
  const missing = [...pairs.keys()].filter(k => !al.has(k))
  const wids = [...new Set(missing.map(k => k.split('|')[0]))]
  const info = new Map<string, any>()
  for (let i = 0; i < wids.length; i += 200) for (const w of (await db.from('wrestlers').select('id, first_name, last_name, is_active, is_oos, gender').in('id', wids.slice(i, i + 200))).data ?? []) info.set(w.id, w)
  const real = missing.filter(k => { const w = info.get(k.split('|')[0]); return w && w.is_active && !w.is_oos && w.first_name !== 'Unknown' && w.gender === g })
  const njSchools = new Set((await db.from('schools').select('id').eq('is_nj', true)).data!.map((s: any) => s.id))
  const nj = real.filter(k => njSchools.has(Number(k.split('|')[1])))
  console.log(`${g}: ${pairs.size} wrestler-school pairs in 2025-26 | no alias ${missing.length} | active NJ wrestler at NJ school, no alias: ${nj.length} (${new Set(nj.map(k => k.split('|')[0])).size} wrestlers, ${new Set(nj.map(k => k.split('|')[1])).size} schools)`)
  const names = new Map((await db.from('schools').select('id, display_name')).data!.map((r: any) => [r.id, r.display_name]))
  const alias = await all((f, t) => db.from('wrestler_name_aliases').select('wrestler_id, school_id, raw_name').in('wrestler_id', [...new Set(nj.map(k => k.split('|')[0]))]).order('id').range(f, t))
  const roster = await all((f, t) => db.from('roster_grade_import').select('wrestler_id, school_id, first_name_raw, last_name_raw, status').eq('gender', g).eq('season_id', 2026).order('id').range(f, t))
  for (const k of nj) {
    const [w, s] = k.split('|'); const x = info.get(w)
    const elsewhere = alias.filter((a: any) => a.wrestler_id === w).map((a: any) => `${a.raw_name}@${names.get(a.school_id)}`)
    const onRoster = roster.filter((r: any) => r.school_id === Number(s) && `${r.first_name_raw} ${r.last_name_raw}`.toLowerCase().replace(/[^a-z]/g, '') === `${x.first_name} ${x.last_name}`.toLowerCase().replace(/[^a-z]/g, ''))
    console.log(`${elsewhere.length ? 'ELSEWHERE' : 'NONE     '} ${x.first_name} ${x.last_name} @ ${names.get(Number(s))} (${[...pairs.get(k)!].join('/')}) | other aliases: ${elsewhere.join(', ') || '-'} | Track roster here: ${onRoster.map((r: any) => r.status + (r.wrestler_id ? (r.wrestler_id === w ? ' (her)' : ' (someone else)') : '')).join(', ') || 'no'}`)
  }
  console.log('   e.g.', nj.slice(0, 8).map(k => { const [w, s] = k.split('|'); const x = info.get(w); return `${x.first_name} ${x.last_name}@${s} (${[...pairs.get(k)!].join('/')})` }).join('; '))
}
