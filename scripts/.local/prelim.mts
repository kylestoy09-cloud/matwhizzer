import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
for (const y of [2026, 2018]) {
  const { data: ts } = await db.from('tournaments').select('id, name').eq('season_id', y).eq('gender', 'M').eq('tournament_type', 'districts')
  const rounds = new Map<string, number>()
  let big = ''
  for (const t of (ts ?? []).slice(0, 32)) {
    const { data: m } = await db.from('matches').select('round, bracket_side, weight_class_id, win_type').eq('tournament_id', t.id)
    for (const x of m ?? []) rounds.set(`${x.bracket_side}:${x.round}${x.win_type === 'BYE' ? '(bye)' : ''}`, (rounds.get(`${x.bracket_side}:${x.round}${x.win_type === 'BYE' ? '(bye)' : ''}`) ?? 0) + 1)
    const { data: e } = await db.from('tournament_entries').select('weight_class_id').eq('tournament_id', t.id)
    const per = new Map<number, number>(); for (const r of e ?? []) per.set(r.weight_class_id, (per.get(r.weight_class_id) ?? 0) + 1)
    const mx = Math.max(...per.values()); if (!big && mx > 8) big = `${t.name} max ${mx}`
  }
  console.log(y, big, [...rounds].sort().map(([k, v]) => `${k}=${v}`).join(' '))
}
