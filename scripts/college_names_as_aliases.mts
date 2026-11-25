// Kyle 2026-11-18: every college's own name is also a spelling the files may print ("Coe", "NYU") — add it as an alias
// where it isn't one yet. Dry run unless --apply.
import { createClient } from '@supabase/supabase-js'
const APPLY = process.argv.includes('--apply')
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const { data: cols } = await db.from('colleges').select('id, name')
const { data: have } = await db.from('college_aliases').select('alias, college_id')
const taken = new Map((have ?? []).map(a => [a.alias.toLowerCase(), a.college_id as number]))
const add = (cols ?? []).filter(c => !taken.has(c.name.toLowerCase())).map(c => ({ alias: c.name.toLowerCase(), college_id: c.id }))
const clash = (cols ?? []).filter(c => taken.has(c.name.toLowerCase()) && taken.get(c.name.toLowerCase()) !== c.id).map(c => `${c.name} is an alias of college ${taken.get(c.name.toLowerCase())}`)
console.log({ add: add.length, sample: add.slice(0, 8).map(a => a.alias), clash })
if (APPLY && add.length) { const { error } = await db.from('college_aliases').insert(add); if (error) throw new Error(error.message); console.log('added') }
