// 2026-11-11 — the 2026-27 season calendar from the NJSIAA documents ("NJSIAA Docs/Boys 2026-27/Boys Dates.rtf",
// "Girls 2026-27/Girls Dates.rtf" and the team/individual regulations posted 11/9/26). Before this it held boys
// and shared rows only, with the boys region seeding on the girls dates. Each side's About page reads shared rows
// (gender null) plus its own. Event types follow the 2025-26 vocabulary (project memory: season_calendar).
//   npx tsx --tsconfig tsconfig.json scripts/season_calendar_2026_27_20261111.mts [--apply]
import fs from 'fs'
import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const APPLY = process.argv.includes('--apply')
const SEASON = 2027, LABEL = '2026-27'
type Row = { event_date: string; event_date_end?: string | null; event_category: string; event_type?: string | null; gender: 'M' | 'F' | null; label: string; notes?: string | null }

const UPDATES: { id: number; set: Partial<Row> }[] = [
  { id: 123, set: { label: 'Competition May Begin', notes: 'Once the 6-days-practice / 1-day-rest requirement is satisfied' } },
  { id: 131, set: { event_date: '2027-02-15', event_date_end: '2027-02-16' } },          // boys region seeding (was the girls dates)
  { id: 132, set: { gender: 'M' } },                                                      // individual state seeding: one row per side
  { id: 136, set: { notes: 'Phillipsburg High School' } },
  { id: 139, set: { notes: 'Phillipsburg High School' } },
  { id: 140, set: { notes: '32 sites statewide' } },
  { id: 141, set: { notes: '8 sites statewide' } },
  { id: 142, set: { notes: 'Boardwalk Hall, Atlantic City' } },
]
const ADD: Row[] = [
  // shared
  { event_date: '2026-12-03', event_date_end: '2026-12-05', event_category: 'preseason', gender: null, label: 'Allowable Scrimmage Date', notes: 'One scrimmage date, once the 6-days-practice / 1-day-rest requirement is satisfied; practices during tryouts count toward it' },
  { event_date: '2026-12-26', event_category: 'weight', gender: null, label: 'One-Pound Weight Allowance' },
  { event_date: '2027-01-02', event_category: 'weight', gender: null, label: 'One-Pound Weight Allowance', notes: 'A 1-lb allowance also applies every Monday of the regular season and the Monday of the team tournament' },
  { event_date: '2026-12-26', event_category: 'team_entry', gender: null, label: 'First Power Points Calculation (approx.)' },
  { event_date: '2027-01-05', event_date_end: '2027-01-15', event_category: 'team_entry', gender: null, label: 'Tournament Entry Period (Team)' },
  { event_date: '2027-01-15', event_category: 'team_entry', gender: null, label: 'Conflict of Interest Form' },
  // girls
  { event_date: '2026-12-15', event_category: 'preseason', gender: 'F', label: 'Dual-Meet Status — Declaration Deadline', notes: 'Schools that declare dual-meet status are classified and included in Power Points' },
  { event_date: '2027-02-02', event_category: 'team_girls', event_type: 'team_playoff_r12_girls', gender: 'F', label: 'Girls Team Playoff — Rounds 1 & 2', notes: 'Higher seed hosts' },
  { event_date: '2027-02-04', event_category: 'team_girls', event_type: 'team_playoff_sectional_final_girls', gender: 'F', label: 'Girls Team Playoff — Sectional Semifinals & Finals', notes: 'Higher seed hosts' },
  { event_date: '2027-02-07', event_category: 'team_girls', event_type: 'team_playoff_state_final_girls', gender: 'F', label: 'Girls Team Playoff — State Finals', notes: 'Phillipsburg High School' },
  { event_date: '2027-02-11', event_category: 'individual_girls', gender: 'F', label: 'District Seeding' },
  { event_date: '2027-02-14', event_category: 'individual_girls', event_type: 'individual_district_girls', gender: 'F', label: 'Individual Post Season — Districts', notes: '12 sites statewide' },
  { event_date: '2027-02-16', event_date_end: '2027-02-17', event_category: 'individual_girls', gender: 'F', label: 'Region Seeding' },
  { event_date: '2027-02-21', event_category: 'individual_girls', event_type: 'individual_region_girls', gender: 'F', label: 'Individual Post Season — Regions', notes: '4 sites statewide' },
  { event_date: '2027-02-23', event_category: 'individual_girls', gender: 'F', label: 'Individual State Seeding' },
  { event_date: '2027-02-25', event_date_end: '2027-02-27', event_category: 'individual_girls', event_type: 'individual_state_girls', gender: 'F', label: 'Individual Post Season — State Championships', notes: 'Boardwalk Hall, Atlantic City' },
]
const { data: before } = await db.from('season_calendar').select('*').eq('season_id', SEASON).order('id')
for (const u of UPDATES) if (!before!.some(r => r.id === u.id)) throw new Error(`row ${u.id} not found`)
for (const a of ADD) if (before!.some(r => r.event_date === a.event_date && r.label === a.label && r.gender === a.gender)) throw new Error(`already there: ${a.label}`)
console.log('rows now', before!.length, 'updates', UPDATES.length, 'adds', ADD.length)
if (!APPLY) process.exit(0)
fs.writeFileSync('docs/migrations/backups/20261111_season_calendar_2026_27.json', JSON.stringify({ before }, null, 1))
for (const u of UPDATES) { const r = await db.from('season_calendar').update(u.set).eq('id', u.id); if (r.error) throw r.error }
const ins = await db.from('season_calendar').insert(ADD.map(a => ({ season_id: SEASON, season_label: LABEL, event_date_end: null, event_type: null, notes: null, ...a }))).select('id')
if (ins.error) throw ins.error
fs.writeFileSync('docs/migrations/backups/20261111_season_calendar_2026_27.json', JSON.stringify({ before, added: ins.data.map(r => r.id) }, null, 1))
const { count } = await db.from('season_calendar').select('*', { count: 'exact', head: true }).eq('season_id', SEASON)
console.log('applied; 2026-27 rows', count)
