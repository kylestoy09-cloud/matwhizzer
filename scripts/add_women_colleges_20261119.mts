// Kyle 2026-11-19 ("we have all the collegiate girls tournaments uploaded … import them just like the boys"): the
// colleges in the women's championship files (NCWWC 2021–2025, NAIA 2021–2026) that weren't on our list. Most NAIA
// programs were already here from the boys NAIA import, so those rows only add the spellings the women's files print;
// 14 colleges are new (city, state, conference, mascot, colors — colors_checked stays false for Kyle). Same shape as
// scripts/add_dii_colleges_20261118.mts. A bare printed name another college took is fixed per level in
// LEVEL_COLLEGE_FIXES (NAIA "York" = York (NE)). Westminster (2021–23, one entrant a year, none NJ) is taken as
// Westminster (MO). Dry run unless --apply.
import { createClient } from '@supabase/supabase-js'

const APPLY = process.argv.includes('--apply')
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// name | city | state | conference | mascot | primary | secondary | aliases (as printed; existing colleges: name only)
const ROWS = `
D'Youville|Buffalo|NY|ECC|Saints|#C8102E|#000000|D\`Youville;D'Youville
Elmira|Elmira|NY|Empire 8|Soaring Eagles|#4F2683|#FFC72C|Elmira College
Emory & Henry|Emory|VA|SAC|Wasps|#002D72|#FFC72C|Emory & Henry;Emory and Henry College
Eureka|Eureka|IL|SLIAC|Red Devils|#7A0019|#FFC72C|Eureka
Fontbonne|St. Louis|MO|SLIAC|Griffins|#4F2683|#FFC72C|Fontbonne
Huntingdon|Montgomery|AL|USA South|Hawks|#C8102E|#A2AAAD|Huntingdon
Lincoln Memorial|Harrogate|TN|SAC|Railsplitters|#002D72|#A2AAAD|Lincoln Memorial
Linfield|McMinnville|OR|NWC|Wildcats|#9D2235|#4F2683|Linfield University
Marymount|Arlington|VA|Atlantic East|Saints|#002D72|#FFFFFF|Marymount
Presbyterian|Clinton|SC|Big South|Blue Hose|#8A1538|#002D72|Presbyterian;Presbyterian College
Texas Woman's|Denton|TX|LSC|Pioneers|#7A0019|#FFFFFF|Texas Woman\`s University;Texas Womens University;Texas Woman's University
Utica|Utica|NY|Empire 8|Pioneers|#FF8200|#002D72|Utica
William Jewell|Liberty|MO|GLVC|Cardinals|#C8102E|#000000|William Jewell College
Jarvis Christian|Hawkins|TX|RRAC|Bulldogs|#003087|#FFC72C|Jarvis Christian;Jarvis Christian (Texas)
Adams State||||||||Adams State University
East Stroudsburg||||||||East Stroudsburg University
Emmanuel (GA)||||||||Emmanuel College;Emmanuel University
Gannon||||||||Gannon University
Hiram||||||||Hiram College
King (TN)||||||||King University
Limestone||||||||Limestone University
Lindenwood||||||||Lindenwood University
Lock Haven||||||||Lock Haven University
McKendree||||||||McKendree University
Northern Michigan||||||||Northern Michigan University
Pacific (OR)||||||||Pacific University
Sacred Heart||||||||Sacred Heart University
Schreiner||||||||Schreiner University
Simon Fraser||||||||Simon Fraser University
Simpson (CA)||||||||Simpson University;Simpson (W)
Tiffin||||||||Tiffin University
UW-Stevens Point||||||||University Of Wisconsin At Stevens Point;Wisconsin Stevens Point
Sioux Falls||||||||University of Sioux Falls
Westminster (MO)||||||||Westminster;Westminster College;Westminster University
Wisconsin-Oshkosh||||||||Wisconsin - Oshkosh
York (PA)||||||||York College
York (NE)||||||||York (W);York (Neb.)
Brewton-Parker||||||||Brewton Parker (Ga.);Brewton Parker;Brewton Parker (W)
Eastern Oregon||||||||Eastern Oregon University;Eastern Oregon (W)
Menlo||||||||Menlo College
Missouri Valley||||||||Missouri Valley College;Missouri Valley (W)
Vanguard||||||||Vanguard University
Providence (MT)||||||||University of Providence;Providence (Mont.);Providence (W)
Chadron State||||||||Chadron
Avila||||||||Avila (Mo.);Avila University (W)
Baker||||||||Baker (Kan.);Baker (W)
Campbellsville||||||||Campbellsville (W)
Central Christian||||||||Central Christian (W)
Central Methodist||||||||Central Methodist (Mo.);Central Methodist (W)
Corban||||||||Corban (W)
Cumberlands||||||||Cumberlands (W)
Dickinson State||||||||Dickinson State (N.D.)
Doane||||||||Doane (Neb.)
Evergreen State||||||||Evergreen (Wash.)
Friends||||||||Friends (Kan.);Friends University (W)
Grand View||||||||Grand View (W)
Hastings||||||||Hastings (W)
Indiana Tech||||||||Indiana Tech (W)
Iowa Wesleyan||||||||Iowa Wesleyan University (W)
Jamestown||||||||Jamestown (N.D.);Jamestown (W)
Life||||||||Life (W)
Life Pacific||||||||Life Pacific (W)
Lyon||||||||Lyon (W)
Midland||||||||Midland (W);Midland University (Neb.)
Missouri Baptist||||||||Missouri Baptist (W)
Montreat||||||||Montreat (N.C.)
Morningside||||||||Morningside (Iowa)
Oklahoma City||||||||Oklahoma City (W)
Ottawa (KS)||||||||Ottawa (Kan.);Ottawa (W)
Saint Mary (KS)||||||||St. Mary (Kan.);St. Mary (W);University of St. Mary's (W)
Siena Heights||||||||Siena Heights (Mich.)
Southern Oregon||||||||Southern Oregon (W)
St. Andrews||||||||St. Andrews (N.C.);St. Andrews (W)
Texas Wesleyan||||||||Texas Wesleyan (W)
Waldorf||||||||Waldorf (Iowa);Waldorf (W)
Warner Pacific||||||||Warner Pacific (W)
Wayland Baptist||||||||Wayland Baptist (Texas);Wayland Baptist (W)
William Penn||||||||William Penn (Iowa);William Penn (W)
`.trim().split('\n').map(l => { const p = l.split('|'); const [name, city, state, conference, mascot, primary_color, secondary_color] = p; return { name, city: city || null, state: state || null, conference: conference || null, mascot: mascot || null, primary_color: primary_color || null, secondary_color: secondary_color || null, aliases: p[p.length - 1].split(';') } })

const { data: have } = await db.from('colleges').select('id, name')
const { data: haveAlias } = await db.from('college_aliases').select('alias, college_id')
const byName = new Map((have ?? []).map(c => [c.name.toLowerCase(), c.id as number]))
const aliasOf = new Map((haveAlias ?? []).map(a => [a.alias.toLowerCase(), a.college_id as number]))
const newColleges = ROWS.filter(r => !byName.has(r.name.toLowerCase()))
const missing = newColleges.filter(r => !r.city)   // an "existing" row whose name isn't on file: a typo here
const clash = ROWS.flatMap(r => r.aliases.filter(a => aliasOf.has(a.toLowerCase()) && aliasOf.get(a.toLowerCase()) !== byName.get(r.name.toLowerCase())).map(a => `${a} (already → college ${aliasOf.get(a.toLowerCase())})`))
console.log({ rows: ROWS.length, new: newColleges.map(r => r.name), aliases: ROWS.reduce((n, r) => n + r.aliases.length, 0), alias_clashes: clash, not_found: missing.map(r => r.name) })
if (!APPLY) process.exit(0)
if (clash.length || missing.length) throw new Error('alias clash or unknown college — sort out first')
if (newColleges.length) {
  const { data, error } = await db.from('colleges').insert(newColleges.map(({ aliases: _a, ...c }) => c)).select('id, name')
  if (error) throw new Error(error.message)
  for (const c of data ?? []) byName.set(c.name.toLowerCase(), c.id)
}
const aliasRows = ROWS.flatMap(r => r.aliases.filter(a => !aliasOf.has(a.toLowerCase())).map(a => ({ alias: a.toLowerCase(), college_id: byName.get(r.name.toLowerCase())! })))
const uniq = [...new Map(aliasRows.map(a => [a.alias, a])).values()]
const { error } = await db.from('college_aliases').insert(uniq)
if (error) throw new Error(error.message)
console.log({ colleges_added: newColleges.length, aliases_added: uniq.length })
