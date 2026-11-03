// Link in-season bracket slots ("J. Appello") with no wrestler id to the wrestler, so the bracket
// view never shows imported text. 2026-11-02.
//   npx tsx --tsconfig tsconfig.json scripts/resolve_unlinked_bracket_slots.mts [--apply]
// A slot name links only when exactly one wrestler in that tournament's bouts at that weight
// matches it: the full name, or first initial + last name. The school comes from his bouts there.
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const APPLY = process.argv.includes('--apply')
const chk = (r: any, w: string) => { if (r.error) throw new Error(`${w}: ${r.error.message}`); return r.data as any[] }
const norm = (s: string) => (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[`'’]/g, '').replace(/-/g, ' ').replace(/\s+/g, ' ').trim()
const keys = (full: string) => { const n = norm(full).replace(/\./g, ''); const p = n.split(' '); return p.length > 1 ? [n, `${p[0][0]} ${p.slice(1).join(' ')}`, `${p[0][0]} ${p[p.length - 1]}`] : [n] }
const slots = chk(await db.from('tournament_bracket_slots').select('*'), 'slots')
const need = slots.filter(s => (!s.top_wrestler_id && s.top_name_raw?.trim()) || (!s.bottom_wrestler_id && s.bottom_name_raw?.trim()))
const tids = [...new Set(need.map(s => s.in_season_tournament_id))]
const side = new Map<string, { wid: string; sid: number | null; k: Set<string> }[]>()
for (const t of ['tournament_bouts', 'tournament_bouts_girls']) {
  const rows = chk(await db.from(t).select('in_season_tournament_id, weight_class, wrestler1_id, wrestler1_name_raw, wrestler1_school_id, wrestler2_id, wrestler2_name_raw, wrestler2_school_id, w1:wrestlers!wrestler1_id(first_name,last_name), w2:wrestlers!wrestler2_id(first_name,last_name)').in('in_season_tournament_id', tids), t)
  for (const r of rows) for (const n of [1, 2]) {
    const wid = r[`wrestler${n}_id`]; if (!wid) continue
    const key = `${r.in_season_tournament_id}|${r.weight_class}`; const list = side.get(key) ?? []; side.set(key, list)
    let s = list.find(x => x.wid === wid); if (!s) { s = { wid, sid: r[`wrestler${n}_school_id`], k: new Set() }; list.push(s) }
    s.sid ??= r[`wrestler${n}_school_id`]
    const prof = r[`w${n}`]; for (const k of [...keys(r[`wrestler${n}_name_raw`]), ...(prof ? keys(`${prof.first_name} ${prof.last_name}`) : [])]) s.k.add(k)
  }
}
// fallback for a misspelled or mis-initialled slot name: the one wrestler in that bracket whose
// last name is within 2 letters (e.g. "J. Sgrulletta" = Jaxson Sgurletta, "D. Adell" = Andrew Adell)
const lev = (a: string, b: string) => { const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]); for (let j = 1; j <= b.length; j++) d[0][j] = j; for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[a.length][b.length] }
const last = (k: string) => k.split(' ').slice(1).join(' ')
const plan: { id: string; upd: Record<string, any> }[] = []; const left: string[] = []; const fuzzy: string[] = []
for (const s of need) {
  const upd: Record<string, any> = {}
  for (const pos of ['top', 'bottom']) {
    const name = s[`${pos}_name_raw`]; if (s[`${pos}_wrestler_id`] || !name?.trim()) continue
    const k = norm(name).replace(/\./g, '')
    const pool = side.get(`${s.in_season_tournament_id}|${s.weight_class}`) ?? []
    let c = pool.filter(x => x.k.has(k))
    if (c.length === 0 && last(k)) {
      c = pool.filter(x => [...x.k].some(q => last(q) && lev(last(q), last(k)) <= 2))
      if (c.length === 1) fuzzy.push(`${name} (${s.weight_class}) → ${[...c[0].k].find(q => q.split(' ')[0].length > 1)}`)
    }
    if (c.length !== 1) { left.push(`${name} (${s.weight_class}): ${c.length} matches`); continue }
    upd[`${pos}_wrestler_id`] = c[0].wid
    if (s[`${pos}_school_id`] == null && c[0].sid != null) upd[`${pos}_school_id`] = c[0].sid
  }
  if (Object.keys(upd).length) plan.push({ id: s.id, upd })
}
const linkedSides = plan.reduce((a, p) => a + Object.keys(p.upd).filter(k => k.endsWith('wrestler_id')).length, 0)
console.log(`${need.length} slots need a link; ${linkedSides} names linked in ${plan.length} slots; ${left.length} left`)
console.log([...new Set(left)].join('\n')); console.log('close-spelling links:\n' + [...new Set(fuzzy)].join('\n'))
if (!APPLY) { console.log('DRY RUN'); process.exit(0) }
fs.writeFileSync('docs/migrations/backups/20261102_bracket_slots_before.json', JSON.stringify(need, null, 1))
for (const p of plan) chk(await db.from('tournament_bracket_slots').update(p.upd).eq('id', p.id).select('id'), 'update')
console.log('APPLIED')
