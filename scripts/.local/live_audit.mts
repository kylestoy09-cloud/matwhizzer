import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const raw = new Set<string>()
for (let f = 0; ; f += 1000) { const { data } = await db.from('tournament_entries').select('school_context_raw').not('school_context_raw', 'is', null).order('id').range(f, f + 999); data!.forEach(r => raw.add(r.school_context_raw.trim())); if (data!.length < 1000) break }
const names = new Set<string>()
const { data: s } = await db.from('schools').select('display_name'); s!.forEach(x => names.add(x.display_name))
const { data: ss } = await db.from('school_season_names').select('display_name'); ss!.forEach(x => names.add(x.display_name))
const rawOnly = [...raw].filter(r => r.length >= 6 && ![...names].some(n => n.includes(r)))
console.log('raw strings that are not school names:', rawOnly.length)
const BW = [106,113,120,126,132,138,144,150,157,165,175,190,215,285], GW = [100,107,114,120,126,132,138,145,152,165,185,235]
const urls: string[] = []
for (let d = 1; d <= 32; d++) urls.push(`/boys/districts/${d}`)
for (let d = 1; d <= 12; d++) urls.push(`/girls/districts/${d}`)
for (let r = 1; r <= 8; r++) { urls.push(`/boys/regions/${r}`); for (const w of BW) urls.push(`/boys/regions/${r}/${w}`) }
for (let r = 1; r <= 4; r++) { urls.push(`/girls/regions/${r}`); for (const w of GW) urls.push(`/girls/regions/${r}/${w}`) }
for (const w of BW) urls.push(`/boys/state/${w}`); for (const w of GW) urls.push(`/girls/state/${w}`)
for (const d of [1, 9, 17, 25]) for (const w of BW) urls.push(`/boys/districts/${d}/${w}`)
for (const d of [1, 6, 12]) for (const w of GW) urls.push(`/girls/districts/${d}/${w}`)
urls.push('/boys', '/girls', '/ghost-champions', '/postseason/individual/boys', '/postseason/individual/girls', '/boys/state', '/girls/state')
let bad = 0, imgs = 0, tbd = 0, notOk = 0
const hits = new Map<string, string[]>()
const q = [...urls]
async function worker() { for (;;) { const u = q.shift(); if (!u) return
  const res = await fetch(`https://matwhizzer.com${u}`); if (res.status !== 200) { if (res.status !== 404) { notOk++; console.log(res.status, u) } continue }
  const html = await res.text()
  const text = html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, '\n')
  imgs += (html.match(/<img[^>]+supabase[^>]+>/g) ?? []).length
  tbd += (text.match(/\nTBD\n/g) ?? []).length
  const lines = new Set(text.split('\n').map(x => x.trim()).filter(Boolean))
  const t = (text.match(/\nTBD\n/g) ?? []).length; if (t) console.log("TBD", t, u)
  for (const r of rawOnly) if (lines.has(r)) { bad++; hits.set(u, [...(hits.get(u) ?? []), r]) }
} }
await Promise.all(Array.from({ length: 8 }, worker))
console.log(`pages ${urls.length}, non-200/404 ${notOk}, logo images ${imgs}, TBD cells ${tbd}, raw-name hits ${bad}`)
for (const [u, r] of [...hits].slice(0, 15)) console.log(u, r.slice(0, 4))
