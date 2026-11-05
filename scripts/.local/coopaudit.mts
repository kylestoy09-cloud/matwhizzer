import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const sch = new Map((await db.from('schools').select('id, display_name, is_nj')).data!.map(s => [s.id, s]))
const find = (re: RegExp) => [...sch.values()].filter(s => re.test(s.display_name)).map(s => `${s.id} ${s.display_name}`)
for (const n of [/^Hopatcong/, /^Lenape Valley/, /^Wood-Ridge/, /^Becton/, /^Palisades Park/, /^Leonia/, /^North Arlington/, /^Lyndhurst/, /^Dayton/, /^Brearley/, /^Dunellen/, /^Middlesex/, /^Park Ridge/, /^Emerson/, /^Randolph/, /^Mount Olive|^Mt\. Olive/, /^Parsippany/, /^Kittatinny/, /^Newton/, /^Morris Knolls/, /^Morris Hills/, /^Northern Highlands/, /^Ramsey/, /^Sparta/, /^Jefferson/, /^Vineland/, /^Buena/, /^Cherry Hill/, /^Old Tappan/, /^Demarest/, /^Ridgefield Memorial/, /^Cliffside/]) console.log(n.source.padEnd(22), JSON.stringify(find(n)))
