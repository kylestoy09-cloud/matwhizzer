import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const B = (f: string) => JSON.parse(fs.readFileSync(`docs/migrations/backups/${f}`, 'utf8'))
const rows = async (t: string, q: (x: any) => any) => (await q(db.from(t).select('*'))).data ?? []
const say = (ok: boolean, what: string, ev: string) => console.log(`${ok ? 'PASS' : 'FAIL'}  ${what} | ${ev}`)

// Scratch placeholder
{ const b = B('20261104_scratch_placeholder_before.json'); const id = b.wrestler[0].id, bout = b.bouts[0].id
  const w = await rows('wrestlers', q => q.eq('id', id)); const bt = (await rows('tournament_bouts_girls', q => q.eq('id', bout)))[0]
  say(w.length === 0 && bt && bt.wrestler2_id === null && bt.winner === 1 && bt.wrestler1_id === b.bouts[0].wrestler1_id,
    'Scratch Scratch removed, Lea keeps forfeit win', `profile rows ${w.length}; bout wrestler2 ${bt?.wrestler2_id}, winner ${bt?.winner}, wrestler1 unchanged ${bt?.wrestler1_id === b.bouts[0].wrestler1_id}`) }

// Lily Oh
{ const b = B('20261104_lily_oh_riverside_va_before.json'); const id = b.wrestler[0].id
  const w = (await rows('wrestlers', q => q.eq('id', id)))[0]; const s = (await rows('schools', q => q.eq('display_name', 'Riverside, VA')))[0]
  const bouts = await rows('tournament_bouts_girls', q => q.or(`wrestler1_id.eq.${id},wrestler2_id.eq.${id}`))
  const onVA = bouts.filter((x: any) => (x.wrestler1_id === id ? x.wrestler1_school_id : x.wrestler2_school_id) === s?.id).length
  const al = await rows('wrestler_name_aliases', q => q.eq('wrestler_id', id)); const r = await rows('wrestler_hammer_scores', q => q.eq('wrestler_id', id))
  say(w?.is_oos === true && s?.is_nj === false && onVA === 4 && al.every((a: any) => a.school_id === s.id) && r.length === 0,
    'Lily Oh on Riverside, VA, out of state, unrated', `is_oos ${w?.is_oos}; school ${s?.id} is_nj ${s?.is_nj}; bouts on it ${onVA}/${bouts.length}; aliases ${al.map((a: any) => a.school_id)}; rating rows ${r.length}`) }

// Gabriel Grant (girls) + five inactive
{ const b = B('20261104_girls_inactive_and_gabriel_before.json'); const id = b.wrestler[0].id
  const w = await rows('wrestlers', q => q.eq('id', id))
  const bouts = await Promise.all(b.bouts.map(async (x: any) => (await rows('dual_meet_matches_girls', q => q.eq('id', x.id)))[0]))
  const ok = bouts.every((x: any, i: number) => x && x.wrestler_a_id !== id && x.wrestler_b_id !== id && x.winner_id === b.bouts[i].winner_id)
  say(w.length === 0 && ok, 'girls Gabriel Grant removed, opponents keep wins', `profile rows ${w.length}; bouts unlinked and winners unchanged: ${ok}`)
  const ina = await rows('inactive_school_seasons', q => q.eq('gender', 'F').eq('season_id', 2026).in('school_id', [13, 297, 253, 43, 191]))
  say(ina.length === 5, 'five girls programs inactive 2025-26', `rows ${ina.length}: ${ina.map((r: any) => r.school_id)}`)
  const boys = (await rows('wrestlers', q => q.eq('first_name', 'Gabriel').eq('last_name', 'Grant')))
  say(boys.length === 1 && boys[0].gender === 'M', 'boys Gabriel Grant untouched', `profiles ${boys.map((x: any) => x.gender)}`) }

// Girls programs fix (56/78 co-ops, 87/64 inactive, 8 programs added, Ratz)
{ const gs = await rows('girls_schools', q => q.in('school_id', [56, 78, 13, 297, 253, 191, 26, 35, 268, 294]))
  const comb = gs.filter((r: any) => [56, 78].includes(r.school_id) && r.is_combined).length
  const ina = await rows('inactive_school_seasons', q => q.eq('gender', 'F').eq('season_id', 2026).in('school_id', [87, 64]))
  say(comb === 2 && gs.length === 10, 'girls co-ops 56/78 flagged, 8 programs added', `combined ${comb}/2; program rows ${gs.length}/10`)
  say(ina.length === 2 && ina.every((r: any) => r.merged_into_school_id === (r.school_id === 87 ? 56 : 78)), 'Randolph/Parsippany inactive, merged into 56/78', JSON.stringify(ina.map((r: any) => [r.school_id, r.merged_into_school_id])))
  const r = (await rows('wrestlers', q => q.eq('id', 'b5140db1-94b9-4257-8396-d040f8f242c7')))[0]
  say(r?.first_name === 'William Jayden' && r?.last_name === 'Ratz', 'Ratz name', `${r?.first_name} | ${r?.last_name}`) }

// Nutley roster links + grades (Izzabella Sr, Ihori So, Walpola So)
{ const g = async (id: string) => (await rows('wrestlers', q => q.eq('id', id)))[0]?.grade
  const ro = async (id: string) => (await rows('roster_grade_import', q => q.eq('id', id)))[0]?.wrestler_id
  const iz = await g('63f2f295-c752-4317-8f52-4456328bd1db'), ih = await g('59b0f8c5-1ad9-4390-ab3e-e720b3130a63'), wa = await g('39a811d5-2995-47bc-a36c-8a70970fa59e')
  const jan = await ro('9e9122f1-1b54-4757-8f5c-3e25b1a35565')
  say(iz === 'Sr' && ih === 'So' && wa === 'So' && jan === 'af9d4501-4668-4626-9cc4-427ce1d86a84', 'grades and Nutley roster link', `Izzabella ${iz}, Ihori ${ih}, Walpola ${wa}; Janizza's roster row → ${jan?.slice(0, 8)}`) }

// Roster grade complete table, phase dates, index
{ const c = await rows('roster_grade_school_complete', q => q.eq('season_id', 2026))
  say(c.length > 0, 'roster_grade_school_complete readable', `rows: boys ${c.filter((r: any) => r.gender === 'M').length}, girls ${c.filter((r: any) => r.gender === 'F').length}`)
  const p = await rows('admin_phase_dates', q => q)
  say(p.length === 1 && p[0].gender === 'M' && p[0].season_id === 2027, 'admin_phase_dates seeded (boys 2026-27)', JSON.stringify(p.map((r: any) => [r.season_id, r.gender, r.preseason_start, r.season_start, r.postseason_start, r.postseason_end])))
  const t = Date.now(); await db.from('wrestler_match_score_log').select('*', { count: 'exact', head: true }).eq('opponent_wrestler_id', '00000000-0000-0000-0000-000000000000')
  const ms = Date.now() - t; say(ms < 3000, 'opponent index in use', `lookup ${ms} ms (was 7,400 ms)`) }
