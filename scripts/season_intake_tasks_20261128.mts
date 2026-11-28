// Kyle 2026-11-28: the season intake order. Roll Over Roster is the last step of ending a season (offseason
// dashboard, after the End of Season report, before archiving), not the first of the next. Preseason: School Data
// Review → Complete Transfers → Roster Import → … → schedule import rounds 1 (11/28) and 2 (12/7); in season,
// rounds 3 (12/21) and 4 (1/10/2027, the Sunday nearest 1/7). Boys and girls each get their own rows.
// Backup first; nothing is deleted (the Roll Over Roster rows are moved, completion kept).
//   node --env-file=.env.local scripts/season_intake_tasks_20261128.mts [--apply]
import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'fs'
const APPLY = process.argv.includes('--apply')
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const { data: all, error } = await db.from('admin_tasks').select('*').order('order_index')
if (error) throw error
if (APPLY) writeFileSync('docs/migrations/backups/20261128_admin_tasks_before_intake_order.json', JSON.stringify(all, null, 1))

type T = { dashboard: string; title: string; description: string; process_key: string; workspace_tool: string | null; order_index: number; due_date: string | null }
const add: T[] = [
  { dashboard: 'offseason', title: 'Save the End of Season Report', description: 'Past Seasons → End of Season: save the season report', process_key: 'end_of_season_report', workspace_tool: null, order_index: 1, due_date: null },
  { dashboard: 'offseason', title: 'Archive the Season', description: 'Seasons & Roster: set the season to Archived (locks its directory) after the rollover', process_key: 'archive_season', workspace_tool: null, order_index: 3, due_date: null },
  { dashboard: 'preseason', title: 'School Data Review', description: "Track's Teams page: match every team to our school, confirm district and region, add new schools", process_key: 'school_data_review', workspace_tool: 'school_data_review', order_index: 1, due_date: null },
  { dashboard: 'preseason', title: 'Roster Import', description: "This season's Track rosters checked against last season's rollover", process_key: 'roster_import', workspace_tool: 'roster_import', order_index: 3, due_date: null },
  { dashboard: 'preseason', title: 'Import Schedules — Round 2', description: 'Second schedule import: additions and changes since round 1', process_key: 'schedule_import_2', workspace_tool: 'schedule_import', order_index: 7, due_date: '2026-12-07' },
  { dashboard: 'season', title: 'Import Schedules — Round 3', description: 'Third schedule import: additions and changes', process_key: 'schedule_import_3', workspace_tool: 'schedule_import', order_index: 1, due_date: '2026-12-21' },
  { dashboard: 'season', title: 'Import Schedules — Round 4', description: 'Fourth schedule import: additions and changes', process_key: 'schedule_import_4', workspace_tool: 'schedule_import', order_index: 2, due_date: '2027-01-10' },
]
// existing rows: new place in the order
const move: Record<string, Partial<T>> = {
  roster_rollover: { dashboard: 'offseason', order_index: 2, description: 'Last step of a season: advance wrestler grades (after the End of Season report, before archiving)' },
  transfers: { order_index: 2 },
  tournament_schedule: { order_index: 4 },
  coaches_import: { order_index: 5 },
  schedule_import: { title: 'Import Schedules — Round 1', order_index: 6, due_date: '2026-11-28', description: "First schedule import: every school's Track schedule, matched and reviewed, then pushed to the master schedule" },
}
for (const g of ['M', 'F']) {
  for (const [key, patch] of Object.entries(move)) {
    const rows = all.filter(t => t.gender === g && t.process_key === key)
    console.log(g, key, rows.length, '→', patch)
    if (APPLY) for (const r of rows) { const { error: e } = await db.from('admin_tasks').update(patch).eq('id', r.id); if (e) throw e }
  }
  for (const t of add) {
    if (all.some(x => x.gender === g && x.process_key === t.process_key)) { console.log(g, t.process_key, 'already there'); continue }
    console.log(g, 'add', t.dashboard, t.title)
    if (APPLY) { const { error: e } = await db.from('admin_tasks').insert({ ...t, gender: g, group_type: 'process' }); if (e) throw e }
  }
}
if (APPLY) { const { data } = await db.from('admin_tasks').select('gender, dashboard, order_index, title, completed_at').order('dashboard').order('order_index'); console.table(data) }
