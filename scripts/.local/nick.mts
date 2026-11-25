import { writeFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function all(t: string, sel: string, f: (q: any) => any = q => q) { const out: any[] = []; for (let a = 0; ; a += 1000) { const { data, error } = await f(db.from(t).select(sel)).order('id').range(a, a + 999); if (error) throw error; out.push(...data); if (data.length < 1000) return out } }
const NICK: Record<string, string[]> = { zachary: ['zach', 'zack', 'zak'], zackary: ['zack', 'zach'], matthew: ['matt', 'matty'], michael: ['mike', 'mikey'], christopher: ['chris'], christian: ['chris'], nicholas: ['nick', 'nico'], nicolas: ['nick', 'nico'], anthony: ['tony', 'ant'], joseph: ['joe', 'joey'], jonathan: ['jon', 'jonny'], john: ['jack', 'johnny'], william: ['will', 'bill', 'billy', 'liam'], robert: ['rob', 'bobby', 'bob', 'robbie'], richard: ['rich', 'rick', 'richie'], thomas: ['tom', 'tommy'], daniel: ['dan', 'danny'], benjamin: ['ben', 'benny'], alexander: ['alex'], alexandra: ['alex', 'lexi'], andrew: ['andy', 'drew'], james: ['jim', 'jimmy', 'jamie'], edward: ['ed', 'eddie'], samuel: ['sam', 'sammy'], jacob: ['jake'], joshua: ['josh'], timothy: ['tim', 'timmy'], gabriel: ['gabe'], nathaniel: ['nate', 'nathan'], nathan: ['nate'], vincent: ['vinny', 'vince'], dominic: ['dom'], dominick: ['dom'], maxwell: ['max'], maximilian: ['max'], maximus: ['max'], jeremiah: ['jerry'], gregory: ['greg'], stephen: ['steve'], steven: ['steve'], patrick: ['pat'], charles: ['charlie', 'chuck'], frederick: ['fred'], kenneth: ['ken', 'kenny'], ronald: ['ron', 'ronnie'], peter: ['pete'], abigail: ['abby'], elizabeth: ['liz', 'lizzie', 'beth', 'eliza'], katherine: ['kate', 'katie', 'kat'], kathryn: ['kate', 'katie'], isabella: ['bella', 'izzy'], isabel: ['izzy'], gianna: ['gia'], olivia: ['liv'], jennifer: ['jen', 'jenny'], samantha: ['sam'], gabriella: ['gabby', 'gabi'], gabrielle: ['gabby', 'gabi'], victoria: ['tori'], madison: ['maddie'], madeline: ['maddie'], mackenzie: ['kenzie'], emily: ['em'], cameron: ['cam'], mathew: ['matt'] }
const forms = (first: string) => { const f = first.toLowerCase(); return new Set([f, ...(NICK[f] ?? []), ...Object.entries(NICK).filter(([, v]) => v.includes(f)).map(([k]) => k)]) }
const out: string[] = []
for (const [pool, g] of [['boys', 'M'], ['girls', 'F']] as const) {
  const ws = await all('wrestlers', 'id, first_name, last_name, graduation_year, is_oos', q => q.eq('gender', g).eq('is_oos', false))
  const byLast = new Map<string, any[]>(); for (const w of ws) { const k = w.last_name.toLowerCase(); byLast.set(k, [...(byLast.get(k) ?? []), w]) }
  const linked = new Set((await all(`${pool}_prospects`, 'wrestler_id', q => q.not('wrestler_id', 'is', null))).map(p => p.wrestler_id))
  const ps = await all(`${pool}_prospects`, 'id, first_name, last_name, state, club_listed, class_year', q => q.is('wrestler_id', null).eq('state', 'NJ'))
  for (const p of ps) {
    const cands = (byLast.get(p.last_name.toLowerCase()) ?? []).filter(w => !linked.has(w.id) && w.first_name.toLowerCase() !== p.first_name.toLowerCase() && forms(w.first_name).has(p.first_name.toLowerCase()))
    if (cands.length === 1) out.push(`${pool}\t${p.id}\t${p.first_name} ${p.last_name}\t${p.club_listed ?? ''}\t${p.class_year ?? ''}\t→\t${cands[0].first_name} ${cands[0].last_name}\t${cands[0].graduation_year ?? ''}\t${cands[0].id}`)
  }
}
writeFileSync('/private/tmp/claude-501/-Users-thebrain/a5d8edbf-83df-4831-93df-b8b0113fff98/scratchpad/nick.tsv', out.join('\n'))
console.log('NJ kids that look like a short form of one of our wrestlers:', out.length); console.log(out.slice(0, 25).join('\n'))
