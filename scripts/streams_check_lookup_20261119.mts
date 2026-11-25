// Kyle 2026-11-19: "make sure the hudl and nfhs links include the correct name in the url and any that don't we need to
// retrieve the correct link … they should be able to find bergen catholic's link". For every program in the stream
// files (Whizzer Upload/Stream: boys Hudl, boys NFHS, girls both), each platform:
//   check   the link's address must name this school — every distinctive word of its name (so "Toms River North"
//           isn't "...-east"), and a Hudl link must be a wrestling team of the right side (boys / girls / coed)
//   lookup  a link that fails the check, or a missing one: Hudl's own search (www.hudl.com public GraphQL: fanSearch,
//           then teamHeadersForSchool → the varsity wrestling team), NFHS Network's search page (/schools/<slug>);
//           taken only when exactly one New Jersey high school fits the name (and its town, when ours is on file)
// Writes docs/reviews/streaming_links_checked.csv (program, platform, file link, result, link to load) and
// data/streams/streams_20261119.json (the links to load). Reads only; loads nothing.
//   npx tsx scripts/streams_check_lookup_20261119.mts
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const DIR = `${process.env.HOME}/Desktop/wrestling_brackets/Whizzer Upload/Stream`
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

function csv(file: string): Record<string, string>[] {
  const lines = readFileSync(`${DIR}/${file}`, 'utf8').replace(/^﻿/, '').trim().split(/\r?\n/)
  const head = lines[0].split(',')
  return lines.slice(1).map(l => {
    const cells: string[] = []; let cur = '', q = false
    for (const ch of l) { if (ch === '"') q = !q; else if (ch === ',' && !q) { cells.push(cur); cur = '' } else cur += ch }
    cells.push(cur)
    return Object.fromEntries(head.map((h, i) => [h, (cells[i] ?? '').trim()]))
  })
}

// ── the name check ──────────────────────────────────────────────────────────────────────────────────────────────
const GENERIC = new Set(['high', 'school', 'hs', 'regional', 'reg', 'the', 'of', 'and', 'at', 'academy', 'prep', 'preparatory', 'technical', 'vocational', 'township', 'twp', 'boro', 'borough', 'county', 'senior', 'jr', 'sr', 'public', 'schools', 'district', 'nj', 'charter', 'institute'])
const ALIAS: Record<string, string[]> = { st: ['st', 'saint', 'st.'], saint: ['saint', 'st'], mt: ['mt', 'mount'], mount: ['mount', 'mt'], ft: ['ft', 'fort'], so: ['south'], no: ['north'], wwp: ['west-windsor', 'windsor'] }
const words = (s: string) => s.toLowerCase().replace(/&/g, ' and ').replace(/['’.]/g, '').split(/[^a-z0-9]+/).filter(w => w && !GENERIC.has(w) && !/^\d+$/.test(w))
/** Does a link's address name this school? every distinctive word of one of its names is in the slug */
function namesSchool(slug: string, names: string[]): boolean {
  const s = slug.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  return names.some(n => { const w = words(n); return w.length > 0 && w.every(x => (ALIAS[x] ?? [x]).some(a => s.includes(a))) })
}
const hudlOrgSlug = (u: string) => u.match(/\/organization\/\d+\/([^/?#]+)/)?.[1] ?? ''
const hudlTeamSlug = (u: string) => u.match(/\/team\/\d+\/([^/?#]+)/)?.[1] ?? ''
const nfhsSlug = (u: string) => u.match(/nfhsnetwork\.com\/schools\/([^/?#]+)/)?.[1] ?? ''
const sideOk = (teamSlug: string, g: 'M' | 'F') => g === 'F' ? !/\b(boys|mens)\b/i.test(teamSlug.replace(/-/g, ' ')) || /girls|womens|coed/i.test(teamSlug) : !/^(girls|womens)/i.test(teamSlug.replace(/^-+/, ''))

// ── Hudl lookup ─────────────────────────────────────────────────────────────────────────────────────────────────
async function gql(query: string, variables: unknown) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch('https://www.hudl.com/api/public/graphql/query', { method: 'POST', headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' }, body: JSON.stringify({ query, variables }) })
      if (r.ok) return await r.json()
    } catch { /* retry */ }
    await sleep(1500)
  }
  return null
}
const norm = (s: string) => s.toLowerCase().replace(/['’.]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
const isExact = (orgName: string, n: string) => [`${norm(n)} high school`, `${norm(n)} regional high school`, `${norm(n)} township high school`].includes(norm(orgName))
const slugify = (s: string) => s.replace(/['’.]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '')
async function hudlFind(names: string[], town: string | null, g: 'M' | 'F'): Promise<{ url: string | null; why: string }> {
  const seen = new Map<string, { internalId: string; name: string; city: string; state: string }>()
  for (const term of [...new Set(names)]) {
    const d = await gql('query Q($input: FanSearchRequestInput!){fanSearch(input:$input){organization{internalId name city state organizationClassificationId}}}',
      { input: { searchTerm: term, organizationClassificationIds: [1], resultStartIndex: 0, resultSize: 25, types: ['ORGANIZATION'] } })
    for (const x of d?.data?.fanSearch ?? []) { const o = x.organization; if (o && o.state === 'NJ' && o.organizationClassificationId === 4) seen.set(o.internalId, o) }
    await sleep(250)
  }
  let fits = [...seen.values()].filter(o => namesSchool(slugify(o.name), names))
  if (fits.length > 1 && town) { const t = fits.filter(o => o.city?.toLowerCase() === town.toLowerCase()); if (t.length) fits = t }
  // same-name schools (East Brunswick HS / Magnet, Moorestown / Moorestown Friends, Princeton / Princeton Day): the
  // one named exactly "<name> High School"
  if (fits.length > 1) { const ex = fits.filter(o => names.some(n => isExact(o.name, n))); if (ex.length === 1) fits = ex }
  if (fits.length !== 1) return { url: null, why: fits.length ? `${fits.length} Hudl schools fit: ${fits.map(o => `${o.name} (${o.city})`).join('; ')}` : 'no NJ school of that name on Hudl' }
  const o = fits[0]
  const d = await gql('query Q($input: GetTeamHeadersForSchoolInput!){teamHeadersForSchool(input:$input){internalId name gender sport teamLevel isTeamProfileHidden}}', { input: { schoolId: Buffer.from(`School${o.internalId}`).toString('base64') } })
  const teams = ((d?.data?.teamHeadersForSchool ?? []) as { internalId: string; name: string; gender: string; sport: string; teamLevel: string; isTeamProfileHidden: boolean }[])
    .filter(t => t.sport === 'WRESTLING' && !t.isTeamProfileHidden)
  const want = g === 'F' ? ['WOMENS', 'COED'] : ['MENS', 'COED']
  const pick = want.map(gn => teams.filter(t => t.gender === gn).sort((a, b) => (a.teamLevel === 'VARSITY' ? 0 : 1) - (b.teamLevel === 'VARSITY' ? 0 : 1))[0]).find(Boolean)
  if (!pick) return { url: null, why: `${o.name}: no ${g === 'F' ? 'girls' : 'boys'} wrestling team on Hudl` }
  return { url: `https://fan.hudl.com/usa/nj/${slugify(o.city).toLowerCase()}/organization/${o.internalId}/${slugify(o.name).toLowerCase()}/team/${pick.internalId}/${slugify(pick.name)}`, why: `found: ${o.name} (${o.city}) · ${pick.name}` }
}

// ── NFHS lookup ─────────────────────────────────────────────────────────────────────────────────────────────────
async function nfhsFind(names: string[], town: string | null): Promise<{ url: string | null; why: string }> {
  const slugs = new Set<string>()
  for (const term of [...new Set(names.map(n => `${n} ${town ?? ''} nj`.trim()))]) {
    try {
      const r = await fetch(`https://www.nfhsnetwork.com/search?query=${encodeURIComponent(term)}`, { headers: { 'User-Agent': 'Mozilla/5.0' } })
      const h = await r.text()
      for (const m of h.matchAll(/\/schools\/([a-z0-9-]+-nj)\b/g)) slugs.add(m[1])
    } catch { /* none */ }
    await sleep(300)
  }
  let fits = [...slugs].filter(s => namesSchool(s, names) && !/middle|elementary|district|-ms-/.test(s))
  if (fits.length > 1 && town) { const t = fits.filter(s => s.includes(slugify(town).toLowerCase())); if (t.length) fits = t }
  if (fits.length > 1) { const ex = fits.filter(s => names.some(n => s.startsWith(`${slugify(n).toLowerCase()}-high-school-`))); if (ex.length === 1) fits = ex }
  if (fits.length !== 1) return { url: null, why: fits.length ? `${fits.length} NFHS schools fit: ${fits.join('; ')}` : 'no NJ school of that name on NFHS Network' }
  return { url: `https://www.nfhsnetwork.com/schools/${fits[0]}/wrestling`, why: `found: ${fits[0]}` }
}

// ── run ─────────────────────────────────────────────────────────────────────────────────────────────────────────
const { data: schools } = await db.from('schools').select('id, display_name, short_name, nickname, town, address')
const S = new Map((schools ?? []).map(s => [String(s.id), s]))
const townOf = (s: { town: string | null; address: string | null }) => s.town ?? s.address?.match(/,\s*([^,]+),\s*NJ/)?.[1]?.trim() ?? null
const boysH = new Map(csv('schools_with_streams.csv').map(r => [r.school_id, r]))
const boysN = new Map(csv('schools_with_nfhs.csv').map(r => [r.school_id, r]))
const girls = new Map(csv('schools_with_girls_streams.csv').map(r => [r.school_id, r]))
const programs: { g: 'M' | 'F'; id: string; hudl: string; nfhs: string }[] = []
for (const id of new Set([...boysH.keys(), ...boysN.keys()])) {
  const h = boysH.get(id)?.Stream ?? '', n = boysN.get(id)?.NFHS_Stream ?? ''
  // the Hudl file found NFHS pages for a few schools: they count as NFHS when the NFHS file has none
  programs.push({ g: 'M', id, hudl: /hudl\.com/i.test(h) ? h : '', nfhs: n || (/nfhsnetwork\.com/i.test(h) ? h : '') })
}
for (const [id, r] of girls) programs.push({ g: 'F', id, hudl: r.Girls_Hudl_Stream ?? '', nfhs: r.Girls_NFHS_Stream ?? '' })

const out: string[] = ['side,school_id,school,platform,file_link,result,link_to_load,note']
const load: { g: 'M' | 'F'; school_id: number; hudl: string | null; nfhs: string | null }[] = []
const q = (s: string) => `"${(s ?? '').replace(/"/g, '""')}"`
let n = 0
for (const p of programs) {
  const s = S.get(p.id)
  if (!s) { out.push([p.g, p.id, '', '', '', 'no such school', '', ''].map(q).join(',')); continue }
  const names = [s.display_name, s.short_name, s.nickname].filter(Boolean) as string[]
  // a co-op ("Leonia-Palisades", "Clayton/Glassboro"): its host school — the first one named — when its own name finds nothing
  const host = /[-/]/.test(s.display_name) ? [s.display_name.split(/\s*[-/]\s*/)[0]] : []
  const town = townOf(s)
  const row = { g: p.g, school_id: Number(p.id), hudl: null as string | null, nfhs: null as string | null }
  // Hudl
  {
    let result = '', link = '', note = ''
    if (p.hudl && namesSchool(hudlOrgSlug(p.hudl), [...names, ...host]) && sideOk(hudlTeamSlug(p.hudl), p.g)) { result = 'ok'; link = p.hudl.replace(/\/watch\?.*$/, '').replace(/\/video$/, '') }
    else {
      let f = await hudlFind(names, town, p.g)
      if (!f.url && host.length && /no NJ school/.test(f.why)) { const h = await hudlFind(host, town, p.g); if (h.url) f = { url: h.url, why: `co-op host: ${h.why}` } }
      result = p.hudl ? (f.url ? 'fixed' : 'wrong school — not found') : (f.url ? 'found (none in file)' : 'none'); link = f.url ?? ''; note = f.why
    }
    row.hudl = link || null
    out.push([p.g, p.id, s.display_name, 'hudl', p.hudl, result, link, note].map(q).join(','))
  }
  // NFHS
  {
    let result = '', link = '', note = ''
    if (p.nfhs && namesSchool(nfhsSlug(p.nfhs), [...names, ...host])) { result = 'ok'; link = p.nfhs }
    else {
      let f = await nfhsFind(names, town)
      if (!f.url && host.length && /no NJ school/.test(f.why)) { const h = await nfhsFind(host, town); if (h.url) f = { url: h.url, why: `co-op host: ${h.why}` } }
      result = p.nfhs ? (f.url ? 'fixed' : 'wrong school — not found') : (f.url ? 'found (none in file)' : 'none'); link = f.url ?? ''; note = f.why
    }
    row.nfhs = link || null
    out.push([p.g, p.id, s.display_name, 'nfhs', p.nfhs, result, link, note].map(q).join(','))
  }
  if (row.hudl || row.nfhs) load.push(row)
  if (++n % 50 === 0) console.log(n, 'programs checked')
}
writeFileSync('docs/reviews/streaming_links_checked.csv', out.join('\n') + '\n')
mkdirSync('data/streams', { recursive: true })
writeFileSync('data/streams/streams_20261119.json', JSON.stringify(load, null, 1))
const tally = new Map<string, number>()
for (const l of out.slice(1)) { const c = l.split('","'); const k = `${c[0].slice(1)} ${c[3]} ${c[5]}`; tally.set(k, (tally.get(k) ?? 0) + 1) }
console.log([...tally].sort().map(([k, v]) => `${k}: ${v}`).join('\n'))
console.log(`programs with a link to load: ${load.length}`)
