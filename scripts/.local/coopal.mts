import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const names = ['Jefferson-Sparta', 'Ramsey/Northern Highlands', 'Newton/Kittatinny', 'Cherry Hill East/Cherry Hill West', 'Buena Regional/Vineland', 'Morris Hills-Morris Knolls', 'Mount Olive/Randolph', 'Parsippany Hills/Parsippany', 'Northern Valley Regional-Demarest/Old Tappan', 'Lenape Valley/Hopatcong', 'Becton Regional/Wood-Ridge', 'Lyndhurst/North Arlington', 'Leonia/Palisades Park', 'Cherry Hill West', 'Kittatinny', 'Kittatinny Regional Jr/Sr']
const { data: a } = await db.from('school_aliases').select('school_id, alias, notes').in('alias', names)
const { data: n } = await db.from('school_names').select('school_name, school_id').in('school_name', names)
for (const x of names) console.log(x.padEnd(46), 'alias →', JSON.stringify(a!.filter(r => r.alias === x).map(r => `${r.school_id}${r.notes ? ' (' + r.notes + ')' : ''}`)), '| school_names →', JSON.stringify(n!.filter(r => r.school_name === x).map(r => r.school_id)))
