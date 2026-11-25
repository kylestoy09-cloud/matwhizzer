// History school names (text from njwrestlinghistory.info or TrackWrestling) → one of our schools. A name maps when
// exactly one school matches: its name, a school alias, the name cleaned of HS / Regional / Township / Jr-Sr /
// punctuation (Pt. Boro = Point Pleasant Boro; Saint = St; "Memorial" stays so Brick Twp isn't Brick Memorial), or
// one name starting the other ("Don Bosco" → Don Bosco Prep; never onto an out-of-state school). Used by the Daily
// Challenge research tabs (section) and the school profile's Trophy Case.
// 2026-11-14 (Kyle: Trophy Case review): a saint's possessive is dropped ("St Joseph's - Metuchen" = St. Joseph Metuchen,
// no longer Montvale by starts-with; St Benedicts = St Benedict's), and HISTORY_NAMES settles the names the starts-with rule got wrong.
import type { SupabaseClient } from '@supabase/supabase-js'

export const cleanSchool = (x: string) => x.toLowerCase()
  .replace(/[`’?]/g, "'").replace(/\bs\.t\b/g, 'st').replace(/\b(st\.?\s+[a-z]+?)'?s\b/g, '$1').replace(/\bsaint\s+([a-z]+?)'?s\b/g, 'st $1').replace(/\bpt\.?\s*boro\b/g, 'point pleasant boro').replace(/\bpt\.?\s/g, 'point ').replace(/\bsaint\b/g, 'st').replace(/^tr\b/, 'toms river')
  .replace(/\bh\.?\s?s\.?\b|high school|\bregional\b|\breg\b|\btownship\b|\btwp\b|\bjr\.?\s*\/?\s*sr\.?\b/g, '').replace(/[^a-z]/g, '')

// Names the starts-with rule placed at the wrong school (2026-11-14), keyed by cleanSchool. null = a school we don't
// have (closed, or never in our list), so its rows show nowhere rather than at a namesake.
const HISTORY_NAMES: Record<string, number | null> = {
  eastsidepatterson: 72,       // Paterson Eastside, not Newark East Side
  middlewtownsouth: 160,       // Middletown South, not Middle Township
  passaiccountytech: 391,      // Passaic Tech, not Passaic
  warrenhlls: 67,              // Warren Hills, not Warren (OH)
  // 2026-11-17 (Kyle: "all of the closed schools must have folded into new or existing schools, let's connect those";
  // else an inactive school under the old name). CONNECTED below lists the ones shown "Old name (New school)".
  madisoncentral: 163,         // Madison Central (Old Bridge), merged into Old Bridge — not Madison
  cedarridge: 163,             // Cedar Ridge (Old Bridge), merged into Old Bridge
  springfield: 130,            // Springfield = Jonathan Dayton Regional, now Brearley-Dayton — not Springfield Local (OH)
  dayton: 130, daytonregional: 130,
  kenilworth: 130,             // Kenilworth = David Brearley, now Brearley-Dayton
  montclairkimberly: 1239,     // Montclair Kimberley (inactive school), not Montclair
  montclairkimberley: 1239,
  phillipsburgcatholic: 1231,  // Phillipsburg Catholic (closed), not Phillipsburg
  newarkcentral: 1240,         // Newark Central (inactive school), not Newark (DE)
  palisadespark: 44, palisadesprk: 44,   // Palisades Park, now Leonia-Palisades — not Palisades (PA)
  stjames: 1233,               // St. James (Carneys Point, closed), not St James Academy (VA)
  bogota: 393,                 // Bogota, now Ridgefield Park/Bogota
  parkridge: 3,                // Park Ridge, now Emerson-Park Ridge
  bridgewatereast: 131, bridgewaterwest: 131, bridegwaterwest: 131, bridgwatereast: 131,   // merged into Bridgewater-Raritan
  jfkwillingboro: 265,         // John F. Kennedy (Willingboro), merged into Willingboro
  glassboro: 305,              // now Clayton/Glassboro
  woodbury: 291,               // now Gateway Reg/ Woodbury
  westwindsor: 177,            // West Windsor-Plainsboro, the school now WW-P South
  donbosco: 11,                // Don Bosco = Don Bosco Prep (Don Bosco Tech is written out)
  kearney: 103,                // a misspelling of Kearny, not Kearney (MO)
  thomasjefferson: 123,        // Thomas Jefferson (Elizabeth), merged into Elizabeth High (1977) — not Thomas Jefferson (PA)
  sussextech: 1247,            // Sussex Tech (Sparta, NJ), not Sussex Tech (DE)
  bayleyellard: 1227, essexcatholic: 1228, donboscotech: 1229, patersoncatholic: 1230, stcecilia: 1232, stcecelia: 1232,
  sacredheart: 1234, valisburg: 1235, vailsburg: 1235, bergentech: 1236, bridgeton: 1237, midlandpark: 1238,
  pleasantville: 1241, woodrowwilson: 1242,
  northedison: 151,            // North Edison = John P. Stevens (Kyle 2026-11-17; was Edison)
  southfreehold: 199,          // South Freehold, now Freehold Borough (Freehold HS)
  greenbrook: 147,             // Green Brook, now Watchung Hills
  stjoseph: null,              // which St. Joseph? Montvale, Metuchen and Hammonton all wrestle (the Trophy Case uses the region)
  // 2026-11-14 (Kyle: the Daily Challenge Explorer listed schools more than once): source typos and other names for our schools
  audobon: 236, bellville: 100, blleville: 100, camdoncatholic: 278, cherryhullwest: 268, clfiton: 50, clumbia: 121,
  collngswood: 238, delawarvevalley: 141, delewarevalley: 141, delawarevellay: 141, emersonpr: 3, epkridge: 3, emrson: 3,
  hasbrocukheights: 54, kennedypatterson: 74, machester: 45, mansquan: 220, middeltownnorth: 159, milville: 292,
  montivlle: 75, montlcair: 105, morthwarren: 25, newprividence: 134, northernbulrington: 388, nvdemarest: 314,
  pacackhills: 15, pasackhills: 15, pasckackvalley: 16, parmus: 57, pausboro: 309, pauslboro: 309, phillpsburg: 7,
  phiilipsburg: 7, piscatway: 183, pointbeach: 223, pointplesantboro: 224, ramsay: 18, rbc: 264, staugistine: 313,
  steonhallprep: 127, stjoe: 394, stjoemontvale: 394, stjoesphmontvale: 394, stjoehammonton: 356, voorhess: 146,
  watchughills: 147, westfiled: 128, wllingboro: 265, brealrey: 130, saddlebrook: 59, henrypbecton: 321,
  clark: 129,                  // Arthur L. Johnson is the Clark high school
  berkeleyheights: 102,        // Governor Livingston is the Berkeley Heights high school
  monsignordonovan: 248,       // renamed Donovan Catholic
  eastpaterson: 51, eastpatterson: 51,   // the town (and its school) became Elmwood Park in 1973
  edgewood: 304, egdewood: 304,          // Edgewood Regional became Winslow Township
}

// History-only names (not used by idOfStrict, so imports are unchanged) where the cleaned name would join two schools
const HISTORY_RAW: Record<string, number | null> = {
  'washington': 67,            // 1938–71, Regions 1–3 with Phillipsburg: Washington (Warren County), now Warren Hills — not Washington Township
  'washingto': 67,
  'madison twp': 163,          // 1972–76, Region 6: Madison Township, now Old Bridge — not Madison
  'burlington': 228,           // Burlington = Burlington City (Kyle 2026-11-17)
  'freehold': 199,             // 1934–64 "Freehold" = Freehold High (Borough); Freehold Township High opened in the 1970s
  'burlington twp': 229,       // Burlington Township, not the inactive Burlington
  'middletown': 160, 'middletown twp': 160,   // Middletown before the 1975 split; the school became Middletown South
  'toms river': 255,           // Toms River before the split; the school became Toms River South
  'wayne': 68,                 // Wayne High, renamed Wayne Valley when Wayne Hills opened (1966)
  'englewood': 41,             // Englewood's high school, Dwight Morrow
  'manchester twp': 250,
  'franklin twp': 169,
}
// A bare name shared by two schools (keyed by the name as written, letters only), settled by the finish's region and
// year: St. Joseph is Montvale in Region 2 and Hammonton in Region 8 (Kyle 2026-11-14 review); Manchester's Region 6/7
// finishes are Manchester Township (every bare Manchester on file is Region 6 or a state finish); Franklin in Regions 1 and 3 is Franklin (Sussex), not on our list, and in Region 5
// or from 1985 Franklin Township. undefined = unknown, so a state finish takes the same wrestler's region title, when
// it was at one of `ids`.
const stJoe = { ids: [394, 356], pick: (r: number | null) => ({ 2: 394, 8: 356 } as Record<number, number>)[r ?? 0] }
const BY_REGION: Record<string, { ids: number[]; pick: (region: number | null, year: number) => number | null | undefined; fallback?: number }> = {
  stjoseph: stJoe, stjosephs: stJoe, stjoesph: stJoe, stjoesphs: stJoe,
  manchester: { ids: [250, 45], pick: r => (r === 2 || r === 4 ? 45 : 250) },
  // "Washington" in Region 1 (South Jersey through 1971: 1966, 1967, 1971 among Paulsboro, West Deptford, Pennsville)
  // is Washington Township (302); Washington of Warren County wrestled in Regions 3 then 2 with Phillipsburg (Warren
  // Hills, 67). A state finish takes the wrestler's region title, else Warren Hills (2026-11-17, Muni / McWhirter)
  washington: { ids: [67, 302], pick: r => (r === 1 ? 302 : r === 2 || r === 3 ? 67 : undefined), fallback: 67 },
  washingto: { ids: [67, 302], pick: r => (r === 1 ? 302 : r === 2 || r === 3 ? 67 : undefined), fallback: 67 },
  franklin: { ids: [169, 28], pick: (r, y) => (r === 1 || r === 3 ? 28 : r === 5 || y >= 1985 ? 169 : undefined) },   // Franklin (Sussex) is now Wallkill Valley
}
const bare = (name: string | null) => (name ?? '').toLowerCase().replace(/[^a-z]/g, '')
/** Old names connected to the school they became (Kyle 2026-11-17): shown "Old name (New school)". Keyed like
 *  HISTORY_NAMES (cleanSchool) or, for HISTORY_RAW names, letters only. */
const CONNECTED: Record<string, string> = {
  madisoncentral: 'Madison Central', cedarridge: 'Cedar Ridge', madisontwp: 'Madison Twp', springfield: 'Springfield',
  dayton: 'Dayton', daytonregional: 'Dayton Regional', kenilworth: 'Kenilworth', palisadespark: 'Palisades Park',
  palisadesprk: 'Palisades Park', bogota: 'Bogota', parkridge: 'Park Ridge', bridgewatereast: 'Bridgewater East',
  bridgewaterwest: 'Bridgewater West', bridegwaterwest: 'Bridgewater West', bridgwatereast: 'Bridgewater East',
  jfkwillingboro: 'JFK-Willingboro', glassboro: 'Glassboro', woodbury: 'Woodbury', westwindsor: 'West Windsor',
  washington: 'Washington', washingto: 'Washington', middletown: 'Middletown', middletowntwp: 'Middletown Twp',
  tomsriver: 'Toms River', wayne: 'Wayne', englewood: 'Englewood', franklin: 'Franklin',
  burlington: 'Burlington', northedison: 'North Edison', southfreehold: 'South Freehold', greenbrook: 'Green Brook',
  thomasjefferson: 'Thomas Jefferson',
}
/** A history finish's school as shown: an old school connected to one of ours reads "Old name (New school)" */
export function historySchoolLabel(raw: string | null, schoolName: string | null): string | null {
  if (!raw) return schoolName
  const old = CONNECTED[cleanSchool(raw)] ?? CONNECTED[bare(raw)]
  return old && schoolName && cleanSchool(old) !== cleanSchool(schoolName) ? `${old} (${schoolName})` : schoolName ?? raw
}

// Schools not on our list, one spelling each
const HISTORY_SPELLING: Record<string, string> = {
  bridegwaterwest: 'Bridgewater West', bridgwatereast: 'Bridgewater East', bayleyellard: 'Bayley-Ellard',
  dayton: 'Dayton', springfield: 'Dayton',   // Jonathan Dayton Regional is the Springfield high school
  middletown: 'Middletown', newarkcentral: 'Newark Central', palisadespark: 'Palisades Park', palisadesprk: 'Palisades Park',
  stcecelia: 'St. Cecilia', stcecilia: 'St. Cecilia', valisburg: 'Vailsburg', stjoseph: 'St. Joseph', stjoesph: 'St. Joseph', stjoesphs: 'St. Joseph',
  washington: 'Washington (Warren County)', washingto: 'Washington (Warren County)', madison: 'Madison Township (Old Bridge)',
  burlington: 'Burlington', franklin: 'Franklin (Sussex)',   // the names HISTORY_RAW / BY_REGION keep off our schools
  montclairkimberly: 'Montclair Kimberley', montclairkimberley: 'Montclair Kimberley', dwightenglewood: 'Dwight-Englewood',
}

// idOfStrict: the same without the starts-with rule ("Passaic Co Tech" must not become Passaic), for imports that write data
export type SchoolMatcher = { idOf: (name: string | null | undefined) => number | null; idOfStrict: (name: string | null | undefined) => number | null; school: Map<number, { display_name: string; section: string | null }> }

export async function schoolMatcher(db: SupabaseClient): Promise<SchoolMatcher> {
  const all = async (t: string, sel: string) => { const out: Record<string, unknown>[] = []; for (let from = 0; ; from += 1000) { const { data } = await db.from(t).select(sel).order('id').range(from, from + 999); out.push(...((data ?? []) as unknown as Record<string, unknown>[])); if ((data ?? []).length < 1000) return out } }
  const [schools, aliases] = await Promise.all([all('schools', 'id, display_name, section'), all('school_aliases', 'id, school_id, alias')])
  const exact = new Map<string, Set<number>>(), loose = new Map<string, Set<number>>()
  const add = (m: Map<string, Set<number>>, k: string, id: number) => { if (k) (m.get(k) ?? m.set(k, new Set()).get(k)!).add(id) }
  for (const x of schools) { add(exact, String(x.display_name).toLowerCase().trim(), x.id as number); add(loose, cleanSchool(String(x.display_name)), x.id as number) }
  for (const x of aliases) { add(exact, String(x.alias).toLowerCase().trim(), x.school_id as number); add(loose, cleanSchool(String(x.alias)), x.school_id as number) }
  // the starts-with rule never lands on a school tagged with another state ("Springfield" is not Springfield Local (OH))
  const nj = new Set(schools.filter(x => !/\((?!NJ\))[A-Z]{2}\)\s*$/.test(String(x.display_name))).map(x => x.id as number))
  const cache = new Map<string, number | null>()
  const idOf = (name: string | null | undefined) => {
    if (!name) return null
    if (cache.has(name)) return cache.get(name)!
    const e = exact.get(name.toLowerCase().trim()), c = cleanSchool(name), l = loose.get(c)
    const raw = name.toLowerCase().replace(/[.*]/g, '').trim()
    if (raw in HISTORY_RAW) { cache.set(name, HISTORY_RAW[raw]); return HISTORY_RAW[raw] }
    if (c in HISTORY_NAMES) { cache.set(name, HISTORY_NAMES[c]); return HISTORY_NAMES[c] }
    const pre = c.length >= 5 ? new Set([...loose].filter(([k]) => k.startsWith(c) || (c.startsWith(k) && k.length >= 5)).flatMap(([, v]) => [...v]).filter(id => nj.has(id))) : new Set<number>()
    const ids = e?.size === 1 ? e : l?.size === 1 ? l : pre.size === 1 ? pre : null
    const id = ids ? [...ids][0] : null
    cache.set(name, id)
    return id
  }
  const idOfStrict = (name: string | null | undefined) => {
    if (!name) return null
    const e = exact.get(name.toLowerCase().trim()), c = cleanSchool(name), l = loose.get(c)
    if (c in HISTORY_NAMES) return HISTORY_NAMES[c]
    const ids = e?.size === 1 ? e : l?.size === 1 ? l : null
    return ids ? [...ids][0] : null
  }
  return { idOf, idOfStrict, school: new Map(schools.map(x => [x.id as number, { display_name: String(x.display_name), section: (x.section as string | null) ?? null }])) }
}

/** One school per history finish (Daily Challenge tabs, Trophy Case): the name's school, else its region's (BY_REGION);
 *  a state finish still unknown takes the school of the same wrestler's region title that year (same weight, close
 *  last name). null = a school not on our list (or not known). */
export function historyFinishSchools<F extends { level: string; year: number; region: number | null; weight: string; place: number; name: string; school: string | null }>(fin: F[], m: SchoolMatcher, sameLastName: (a: string, b: string) => boolean): (number | null)[] {
  const first = fin.map(f => {
    const rule = BY_REGION[bare(f.school)]
    if (!rule) return { id: m.idOf(f.school), rule }
    const id = rule.pick(f.region, f.year)
    return id === undefined && f.level === 'state' ? { id: undefined, rule } : { id: id ?? null, rule: undefined }
  })
  const regionTitle = new Map<string, { name: string; id: number }[]>()
  fin.forEach((f, i) => { const id = first[i].id; if (f.level === 'region' && f.place === 1 && id != null) { const k = `${f.year}|${f.weight}`; regionTitle.set(k, [...(regionTitle.get(k) ?? []), { name: f.name, id }]) } })
  return fin.map((f, i) => { const { id, rule } = first[i]; return id !== undefined ? id : regionTitle.get(`${f.year}|${f.weight}`)?.find(r => rule!.ids.includes(r.id) && sameLastName(r.name, f.name))?.id ?? rule!.fallback ?? null })
}

/** How a history school shows when it isn't one of ours: one spelling per school (the most used when there's no fix) */
export function historySchoolNames(names: string[]): (name: string) => string {
  const counts = new Map<string, Map<string, number>>()
  for (const n of names) { const c = cleanSchool(n), m = counts.get(c) ?? counts.set(c, new Map()).get(c)!; m.set(n.trim(), (m.get(n.trim()) ?? 0) + 1) }
  return name => HISTORY_SPELLING[cleanSchool(name)] ?? [...(counts.get(cleanSchool(name)) ?? new Map([[name, 1]]))].sort((a, b) => b[1] - a[1])[0][0]
}
