// Girls 2026-01-06: Bloomfield vs Delaware Valley was imported into Mount Olive/Randolph vs
// Hunterdon Central (meet be84dd6d…), 6 of its bouts credited to Mount Olive / Hunterdon
// Central. Create the Bloomfield vs Delaware Valley dual, move the 6 bouts there with the
// right schools (Bloomfield as team 1 / side a), and add its 185 lb bout, missing entirely.
// Source: the Track pages pasted 2026-11-01. Backup of the 6 rows:
// docs/migrations/backups/20261101_mount_olive_hcr_extra_bouts.json
import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const BLOOMFIELD = 81, DELVAL = 141, MO_HCR = 'be84dd6d-1fdf-4e68-b89d-455a6daa22f3'
const MOVE = ['9ddcf101-deb8-4ad5-9815-b686d16d8c09', '070051ec-8105-4d70-abf4-a44b1ddd5e8a', '43ab3127-df2e-4e9b-8286-00c6379e46b2',
  'b9e8c837-d3a0-4177-8bde-654c2053bb8d', '1146663d-1582-45db-a030-a144395b8c41', 'e0fc29b2-d352-48db-8c6d-220e10c67c3f']
const POINTS: Record<string, number> = { Fall: 6, TF: 5, MD: 4, Dec: 3 }

const { data: existing } = await db.from('dual_meets_girls').select('id').eq('meet_date', '2026-01-06')
  .eq('team1_school_id', BLOOMFIELD).eq('team2_school_id', DELVAL)
if (existing?.length) throw new Error('Bloomfield vs Delaware Valley 2026-01-06 already exists')

const { data: bouts } = await db.from('dual_meet_matches_girls').select('*').in('id', MOVE).eq('dual_meet_id', MO_HCR)
if (bouts?.length !== 6) throw new Error(`expected 6 bouts still in the Mount Olive meet, found ${bouts?.length}`)
const { data: als } = await db.from('wrestler_name_aliases').select('wrestler_id, school_id')
  .in('wrestler_id', bouts.flatMap(b => [b.wrestler_a_id, b.wrestler_b_id])).in('school_id', [BLOOMFIELD, DELVAL])
const schoolOf = new Map(als!.map(a => [a.wrestler_id, a.school_id]))

const { data: meet, error: mErr } = await db.from('dual_meets_girls').insert({
  season_id: 2026, team1_school_id: BLOOMFIELD, team2_school_id: DELVAL,
  team1_school_name_raw: 'Bloomfield', team2_school_name_raw: 'Delaware Valley Regional',
  meet_date: '2026-01-06', team1_score: 12, team2_score: 29, status: 'final', is_playoff: false,
  meet_kind: 'dual', counts_toward_record: true,
}).select('id').single()
if (mErr) throw mErr
console.log('created meet', meet.id)

const order = [100, 107, 114, 120, 126, 132, 138, 145, 152, 165, 185, 235]
for (const b of bouts) {
  // Bloomfield on side a (team 1)
  const aIsBloom = schoolOf.get(b.wrestler_a_id) === BLOOMFIELD
  const [bl, dv] = aIsBloom ? ['a', 'b'] : ['b', 'a']
  if (schoolOf.get(b[`wrestler_${bl}_id`]) !== BLOOMFIELD || schoolOf.get(b[`wrestler_${dv}_id`]) !== DELVAL) throw new Error(`bout ${b.id}: schools not Bloomfield/Delaware Valley`)
  const pts = POINTS[b.result_type] ?? 0
  const bloomWon = b.winner_id === b[`wrestler_${bl}_id`]
  const { error } = await db.from('dual_meet_matches_girls').update({
    dual_meet_id: meet.id, order_index: order.indexOf(b.weight_class),
    wrestler_a_id: b[`wrestler_${bl}_id`], wrestler_a_name_raw: b[`wrestler_${bl}_name_raw`], school_a_id: BLOOMFIELD,
    wrestler_b_id: b[`wrestler_${dv}_id`], wrestler_b_name_raw: b[`wrestler_${dv}_name_raw`], school_b_id: DELVAL,
    team1_points: bloomWon ? pts : 0, team2_points: bloomWon ? 0 : pts,
  }).eq('id', b.id)
  if (error) throw error
  console.log(`moved ${b.weight_class}: ${b[`wrestler_${bl}_name_raw`]} (Bloomfield) vs ${b[`wrestler_${dv}_name_raw`]} (Delaware Valley), ${b.result_type}`)
}

const { error: iErr } = await db.from('dual_meet_matches_girls').insert({
  dual_meet_id: meet.id, weight_class: 185, order_index: order.indexOf(185),
  wrestler_a_id: 'b13538a8-0f24-4a86-be5e-d057cb23b855', wrestler_a_name_raw: 'Lesly Sanchez', school_a_id: BLOOMFIELD,
  wrestler_b_id: 'e2abd38d-5ead-46c7-8945-5ffd5a62c1a4', wrestler_b_name_raw: 'Emmy Rea Hotz', school_b_id: DELVAL,
  winner_id: 'e2abd38d-5ead-46c7-8945-5ffd5a62c1a4', result_type: 'Fall', fall_time_seconds: 156, result_time_estimated: false,
  team1_points: 0, team2_points: 6, is_double_forfeit: false, is_forfeit_win: false, validated: false,
})
if (iErr) throw iErr
console.log('added 185: Emmy Rea Hotz (Delaware Valley) over Lesly Sanchez (Bloomfield), Fall 2:36')

for (const id of [MO_HCR, meet.id]) {
  const { data: rows } = await db.from('dual_meet_matches_girls').select('team1_points, team2_points').eq('dual_meet_id', id)
  const t1 = rows!.reduce((a, r) => a + (r.team1_points ?? 0), 0), t2 = rows!.reduce((a, r) => a + (r.team2_points ?? 0), 0)
  console.log(`meet ${id}: ${rows!.length} bouts, bout points ${t1}-${t2}`)
}
