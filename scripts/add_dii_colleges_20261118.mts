// Kyle 2026-11-18 ("all dii is collected"): the NCAA Division II colleges in the 2011–2026 brackets
// (data/ncaa/transcripts/NCAA DII), each with every spelling the files use as an alias, and the details the college
// page shows (city, state, conference = the school's primary conference now or its last, mascot) and colors (Kyle
// checks colors: colors_checked stays false). Programs that closed (Notre Dame (OH), Ohio Valley, Limestone, Alderson
// Broaddus) keep their last conference. Dry run unless --apply; existing names / aliases are left alone.
import { createClient } from '@supabase/supabase-js'

const APPLY = process.argv.includes('--apply')
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// name | city | state | conference | mascot | primary | secondary | aliases (as printed)
const ROWS = `
Adams State|Alamosa|CO|RMAC|Grizzlies|#006341|#FFFFFF|Adams St.;Adams State
Alderson Broaddus|Philippi|WV|MEC|Battlers|#003087|#FFFFFF|Alderson Broaddus
American International|Springfield|MA|NE10|Yellow Jackets|#FFC72C|#000000|American Int;American Int\`l;American International
Anderson (SC)|Anderson|SC|SAC|Trojans|#7A0019|#FFFFFF|Anderson (SC);Anderson Univ;Anderson University
Ashland|Ashland|OH|G-MAC|Eagles|#4B2683|#C99700|Ashland
Augustana (SD)|Sioux Falls|SD|NSIC|Vikings|#002F6C|#FFC72C|Augustana (SD);Augustana SD;Augustana
Belmont Abbey|Belmont|NC|Conference Carolinas|Crusaders|#BF0D3E|#FFFFFF|Belmont Abbey
CSU Pueblo|Pueblo|CO|RMAC|ThunderWolves|#CE1126|#003DA5|CSU Pueblo;CSU-Pueblo;Colorado St. Pueblo;Colorado St.-Pueblo;Colorado State University - Pueblo
Central Missouri|Warrensburg|MO|MIAA|Mules|#CC0000|#000000|Central Missiouri;Central Missouri;Central Mo.
Central Oklahoma|Edmond|OK|MIAA|Bronchos|#002D72|#FFC72C|Central Okla.;Central Oklahoma
Chadron State|Chadron|NE|RMAC|Eagles|#5F0F40|#FFFFFF|Chadron St.;Chadron State
Coker|Hartsville|SC|SAC|Cobras|#002855|#BF0D3E|Coker
Colorado Mines|Golden|CO|RMAC|Orediggers|#21314D|#92A2BD|Colo. Sch. Of Mines;Colo. Sch. of Mines;Colorado Mines;Colorado School of Mines
Colorado Mesa|Grand Junction|CO|RMAC|Mavericks|#7B2C35|#FFC72C|Colorado Mesa University;Colorado Mesa;Mesa State
Davenport|Grand Rapids|MI|GLIAC|Panthers|#C8102E|#000000|Davenport
Davis & Elkins|Elkins|WV|MEC|Senators|#B31B1B|#FFFFFF|Davis & Elkins
Drury|Springfield|MO|GLVC|Panthers|#C8102E|#000000|Drury
Emmanuel (GA)|Franklin Springs|GA|Conference Carolinas|Lions|#00205B|#FFFFFF|Emmanuel (GA);Emmanuel
Fairmont State|Fairmont|WV|MEC|Fighting Falcons|#862633|#FFC72C|Fairmont St.;Fairmont State
Felician|Rutherford|NJ|CACC|Golden Falcons|#002D62|#C99700|Felician
Findlay|Findlay|OH|G-MAC|Oilers|#F47920|#000000|Findlay
Fort Hays State|Hays|KS|MIAA|Tigers|#000000|#FFC72C|Fort Hays St.;Fort Hays State
Frostburg State|Frostburg|MD|MEC|Bobcats|#D2232A|#000000|Frostburg St.;Frostburg State
Gannon|Erie|PA|PSAC|Golden Knights|#7A1F35|#C99700|Gannon Univ;Gannon
Glenville State|Glenville|WV|MEC|Pioneers|#002D72|#FFFFFF|Glenville St.;Glenville State College;Glenville State
Grand Canyon|Phoenix|AZ||Antelopes|#522398|#000000|Grand Canyon
Grand Valley State|Allendale|MI|GLIAC|Lakers|#0065A4|#000000|Grand Valley St.;Grand Valley State
Indianapolis|Indianapolis|IN|GLVC|Greyhounds|#9E1B32|#A2AAAD|Indianapolis;UIndy
King (TN)|Bristol|TN|Conference Carolinas|Tornado|#7A1F35|#FFFFFF|King (TN);King College (TN);King College;King
Kutztown|Kutztown|PA|PSAC|Golden Bears|#7A1F35|#C99700|Kutztown
LIU Post|Brookville|NY||Pioneers|#00843D|#C99700|LIU Post
Lake Erie|Painesville|OH|G-MAC|Storm|#00553F|#FFFFFF|Lake Erie College;Lake Erie
Lander|Greenwood|SC|Conference Carolinas|Bearcats|#4F2D7F|#FFC72C|Lander
Limestone|Gaffney|SC|Conference Carolinas|Saints|#002D72|#FFFFFF|Limestone College;Limestone
Lindenwood|St. Charles|MO|MIAA|Lions|#000000|#B5A36A|Lindenwood (MO);Lindenwood (Mo);Lindenwood
Mary|Bismarck|ND|NSIC|Marauders|#003087|#C99700|Mary;UMary
Maryville (MO)|St. Louis|MO|GLVC|Saints|#C8102E|#000000|Maryville (MO);Maryville University;Maryville
McKendree|Lebanon|IL|GLVC|Bearcats|#4F2D7F|#FFFFFF|McKendree
Mercyhurst|Erie|PA|PSAC|Lakers|#004236|#002D72|Mercyhurst
Minnesota State|Mankato|MN|NSIC|Mavericks|#4B2683|#C99700|Minn State Mankato;Minn. St. Mankato;Minnesota St.;Minnesota State Mankato;Minnesota State
MSU Moorhead|Moorhead|MN|NSIC|Dragons|#C8102E|#FFFFFF|MSU Moorhead;Minn State Moorhead;Minn. St. Moorhead;Minnesota State Moorhead
Minot State|Minot|ND|NSIC|Beavers|#C8102E|#00843D|Minot St.;Minot State (N.D.)
Montevallo|Montevallo|AL|Gulf South|Falcons|#7A1F35|#C99700|Montevallo
Mount Olive|Mount Olive|NC|Conference Carolinas|Trojans|#002D72|#FFC72C|Mount Olive
New Mexico Highlands|Las Vegas|NM|RMAC|Cowboys|#4F2D7F|#FFFFFF|N.M. Highlands;New Mexico Highlands
Nebraska-Kearney|Kearney|NE|MIAA|Lopers|#002D72|#FFC72C|Neb. Kearney;Neb.-Kearney;Nebraska-Kearney
Nebraska-Omaha|Omaha|NE|NCC|Mavericks|#000000|#D71920|Nebraska-Omaha
Newberry|Newberry|SC|SAC|Wolves|#C8102E|#A2AAAD|Newberry
Newman|Wichita|KS|MIAA|Jets|#002D72|#C8102E|Newman
UNC Pembroke|Pembroke|NC|Conference Carolinas|Braves|#002D72|#C99700|North Carolina-Pembroke;UNC Pembroke;UNC-Pembroke
Northern State|Aberdeen|SD|NSIC|Wolves|#8A1538|#C99700|Northern St.;Northern State
Notre Dame (OH)|South Euclid|OH|MEC|Falcons|#002D72|#C99700|Notre Dame (OH);Notre Dame (Ohio);Notre Dame
Ohio Valley|Vienna|WV|MEC|Fighting Scots|#4F2D7F|#FFFFFF|Ohio Valley
Ouachita Baptist|Arkadelphia|AR|Great American|Tigers|#4F2D7F|#C99700|Ouachita Baptist University;Ouachita Baptist
Pitt-Johnstown|Johnstown|PA|PSAC|Mountain Cats|#003594|#FFB81C|Pitt-Johnstown;Pitt. Johnstown;Pitt.-Johnstown;Pittsburgh-Johnstown
Queens (NC)|Charlotte|NC|South Atlantic|Royals|#002D72|#C99700|Queens (NC);Queens
Quincy|Quincy|IL|GLVC|Hawks|#4F2D7F|#C99700|Quincy
San Francisco State|San Francisco|CA|CCAA|Gators|#4F2D7F|#C99700|San Fran. St.;San Francisco State;San Francisco
Seton Hill|Greensburg|PA|PSAC|Griffins|#BF0D3E|#C99700|Seton Hill
Shippensburg|Shippensburg|PA|PSAC|Raiders|#002D72|#C8102E|Shippensburg
Shorter|Rome|GA|Conference Carolinas|Hawks|#002D72|#FFFFFF|Shorter
Simon Fraser|Burnaby|BC|GNAC|Red Leafs|#CC0633|#FFFFFF|Simon Fraser
Sioux Falls|Sioux Falls|SD|NSIC|Cougars|#4F2D7F|#FFFFFF|Sioux Falls
Southwest Minnesota State|Marshall|MN|NSIC|Mustangs|#4F2D7F|#C99700|Southwest Minn. St;Southwest Minn. St.;Southwest Minn. State;Southwest Minnesota St.;Southwest Minnesota State
St. Cloud State|St. Cloud|MN|NSIC|Huskies|#C8102E|#000000|St Cloud State;St. Cloud St.;St. Cloud State
Tiffin|Tiffin|OH|G-MAC|Dragons|#002D72|#C99700|Tiffin
Truman|Kirksville|MO|GLVC|Bulldogs|#4F2D7F|#FFFFFF|Truman
Upper Iowa|Fayette|IA|NSIC|Peacocks|#002D72|#FFFFFF|Upper Iowa
West Liberty|West Liberty|WV|MEC|Hilltoppers|#000000|#C99700|West Liberty Univ;West Liberty University;West Liberty
Western Colorado|Gunnison|CO|RMAC|Mountaineers|#C8102E|#A2AAAD|Western Colo.;Western Colorado;Western St.;Western State College
Wheeling|Wheeling|WV|MEC|Cardinals|#C8102E|#FFC72C|Wheeling Jesuit
Wisconsin-Parkside|Kenosha|WI|GLIAC|Rangers|#00843D|#000000|UW-Parkside;Wis. Parkside;Wis.-Parkside;Wisc-Parkside;Wisconsin-Parkside
`.trim().split('\n').map(l => { const [name, city, state, conference, mascot, primary_color, secondary_color, aliases] = l.split('|'); return { name, city, state, conference: conference || null, mascot, primary_color, secondary_color, aliases: aliases.split(';') } })

const { data: have } = await db.from('colleges').select('id, name')
const { data: haveAlias } = await db.from('college_aliases').select('alias, college_id')
const byName = new Map((have ?? []).map(c => [c.name.toLowerCase(), c.id as number]))
const aliasOf = new Map((haveAlias ?? []).map(a => [a.alias.toLowerCase(), a.college_id as number]))
const newColleges = ROWS.filter(r => !byName.has(r.name.toLowerCase()))
const clash = ROWS.flatMap(r => r.aliases.filter(a => aliasOf.has(a.toLowerCase()) && aliasOf.get(a.toLowerCase()) !== byName.get(r.name.toLowerCase())).map(a => `${a} (already → college ${aliasOf.get(a.toLowerCase())})`))
console.log({ colleges: ROWS.length, new: newColleges.length, aliases: ROWS.reduce((n, r) => n + r.aliases.length, 0), alias_clashes: clash })
if (!APPLY) process.exit(0)
if (clash.length) throw new Error('alias clash — sort out first')
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
