import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const since = '2026-11-02T20:30:00Z'
const { data: w } = await db.from('wrestlers').select('id, first_name, last_name, gender, is_oos, created_at').gte('created_at', since)
const { data: al } = await db.from('wrestler_name_aliases').select('*').in('wrestler_id', w!.map(x => x.id))
fs.writeFileSync('docs/migrations/backups/20261102_unlinked_bouts_resolved.json', JSON.stringify({
  note: 'scripts/resolve_unlinked_bouts.mts --apply, 2026-11-02 ~20:39 UTC. Before: every changed side had wrestler id NULL (or school id NULL for "school only"). 137 sides linked, 48 profiles created, 1 split (Sebastian Soto: Hopewell Valley off Roxbury e6235560), 44 school ids set. Stale aliases moved to the new profiles: 14581 (Anthony Rodriguez, Lakeland, was 77d4fde3), 16672 (Anthony Flores, Pemberton, was 541f9509), 27505 (Christian Ramirez, Lakeland, was 69cab96d), 12030 (Aiden Brown, Scotch Plains-Fanwood, was 11ad2328), 18689 (Aiden Gonzalez, Somerville, was 234246be), 14942 (Youssef Adam, Raritan, was d5aa105b), 16615 (Cristian Garcia, Penns Grove, was 70900188), 25307 (Kevin Hernandez, Lyndhurst-North Arlington, was ae0c487d). Burlington County Tournament: 5 bouts had "Name (BCIT | Westampton)" split on the pipe (round = "Name (BCIT", name = "Westampton)"); now round UNK, name fixed, school Westampton Tech 256.',
  profiles_created: w, aliases: al,
}, null, 1))
console.log(w!.length, 'profiles', al!.length, 'aliases recorded')
