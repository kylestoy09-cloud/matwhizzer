// Release srobs's Stream Account microchecks (Kyle 2026-11-20: "srobs did a bunch of microchecks yesterday sorting
// streaming sites. all of them were wrong. can you reverse them and release them back into the pool"). Every boys /
// girls streaming pick made by srobsmail@yahoo.com goes back to no pick (the site shows both links again, as before any
// check), and his matching microcheck_task_log entries are removed, so the queue deals those schools again. Other
// people's picks are untouched. Rows backed up first. Dry run unless --apply.
//   npx tsx scripts/release_srobs_stream_checks_20261120.mts [--apply]
import { writeFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
const APPLY = process.argv.includes('--apply')
const EMAIL = 'srobsmail@yahoo.com'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const backup: Record<string, unknown[]> = {}
for (const [g, t] of [['M', 'boys_streaming_links'], ['F', 'girls_streaming_links']] as const) {
  const { data: picks, error } = await db.from(t).select('*').eq('choice_by', EMAIL)
  if (error) throw new Error(error.message)
  backup[t] = picks ?? []
  const schools = (picks ?? []).map(p => p.school_id)
  // his log entries for those schools: the admin whose stream answers they are
  const { data: logs } = schools.length ? await db.from('microcheck_task_log').select('*').eq('field', 'stream_choice').eq('gender', g).in('school_id', schools) : { data: [] }
  const admins = new Map<string, number>(); for (const l of logs ?? []) admins.set(l.admin_id, (admins.get(l.admin_id) ?? 0) + 1)
  if (admins.size > 1) throw new Error(`${g}: those schools' log entries belong to ${admins.size} admins — check by hand: ${JSON.stringify(Object.fromEntries(admins))}`)
  backup[`microcheck_task_log ${g}`] = logs ?? []
  const counts = new Map<string, number>(); for (const p of picks ?? []) counts.set(p.choice, (counts.get(p.choice) ?? 0) + 1)
  console.log(`${t}: ${picks?.length ?? 0} picks by ${EMAIL} (${[...counts].map(([c, n]) => `${c} ${n}`).join(', ')}); log entries ${logs?.length ?? 0} (admin ${[...admins.keys()].join(', ') || '—'})`)
  if (!APPLY || !schools.length) continue
  const { error: e1 } = await db.from(t).update({ choice: null, choice_at: null, choice_by: null }).eq('choice_by', EMAIL)
  if (e1) throw new Error(e1.message)
  const { error: e2 } = await db.from('microcheck_task_log').delete().in('id', (logs ?? []).map(l => l.id))
  if (e2) throw new Error(e2.message)
}
if (APPLY) writeFileSync('docs/migrations/backups/20261120_srobs_stream_checks.json', JSON.stringify(backup, null, 1))
console.log(APPLY ? 'released (backup: docs/migrations/backups/20261120_srobs_stream_checks.json)' : 'dry run')
