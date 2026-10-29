// Usage: node --env-file=.env.local scripts/sched.mts <school_id>
// Prints one girls school's 2025-26 schedule from dual_meets_girls (counted + uncounted)
import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const sid = Number(process.argv[2])
const { data: ms } = await db.from('dual_meets_girls').select('id,meet_date,team1_school_id,team2_school_id,team1_school_name_raw,team2_school_name_raw,team1_score,team2_score,meet_kind,counts_toward_record,is_playoff').eq('season_id', 2026).or(`team1_school_id.eq.${sid},team2_school_id.eq.${sid}`).order('meet_date')
const ids = ms!.map(m => m.id); const bc = new Map<string, number>()
for (let i = 0; i < ids.length; i += 200) { const { data } = await db.from('dual_meet_matches_girls').select('dual_meet_id,is_double_forfeit').in('dual_meet_id', ids.slice(i, i + 200)); for (const b of data!) if (!b.is_double_forfeit) bc.set(b.dual_meet_id, (bc.get(b.dual_meet_id) ?? 0) + 1) }
let w = 0, l = 0, t = 0
const rows = ms!.map(m => { const a = m.team1_school_id === sid; const [me, op] = a ? [m.team1_score, m.team2_score] : [m.team2_score, m.team1_score]; const r = me > op ? 'W' : me < op ? 'L' : 'T'; const c = m.counts_toward_record && m.meet_kind !== 'jamboree'; if (c) { if (r === 'W') w++; else if (r === 'L') l++; else t++ } return `| ${m.meet_date.slice(5)} | ${a ? m.team2_school_name_raw : m.team1_school_name_raw} | ${r} ${me}-${op} | ${m.is_playoff ? 'playoff' : m.meet_kind} | ${bc.get(m.id) ?? 0} | ${c ? `**${w}-${l}${t ? '-' + t : ''}**` : '—'} |` })
console.log('| Date | Opponent | Result | Type | Bouts | Counted record |\n|---|---|---|---|---|---|\n' + rows.join('\n'))
