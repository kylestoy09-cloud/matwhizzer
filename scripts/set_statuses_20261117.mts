// Kyle 2026-11-17: Jackson Weller (Delran) out for the 2026-27 season; Chase Sudano (St. Augustine) passed away —
// deceased (inactive) with the note "Gone too early, Chase's energy will be missed." Same as the admin Status
// section does (incl. pullFromBoards). Backup first.
import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'fs'
import { pullFromBoards } from '../src/lib/whizRank'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const WELLER = '99e17c7c-0775-43fc-a545-a45324c48cff', SUDANO = '3bea329a-4a6c-44f3-a208-30f258f0de12'
const { data: before } = await db.from('wrestlers').select('*').in('id', [WELLER, SUDANO])
writeFileSync('docs/migrations/backups/20261117_weller_sudano_status.json', JSON.stringify(before, null, 1))
const now = new Date().toISOString(), by = 'kyle.stoy09@gmail.com (via Claude)'
const a = await db.from('wrestlers').update({ status: 'out_for_season', status_season_id: 2027, status_note: null, status_set_at: now, status_set_by: by }).eq('id', WELLER)
const b = await db.from('wrestlers').update({ status: 'deceased', status_season_id: null, is_active: false, status_note: "Gone too early, Chase's energy will be missed.", status_set_at: now, status_set_by: by }).eq('id', SUDANO)
if (a.error || b.error) throw a.error ?? b.error
console.log('pulled', await pullFromBoards(db as never, 'M', 2027, WELLER, 'out for the season', null), await pullFromBoards(db as never, 'M', 2027, SUDANO, 'deceased', null))
const { data: after } = await db.from('wrestlers').select('first_name, last_name, status, status_season_id, is_active, status_note').in('id', [WELLER, SUDANO]); console.log(after)
