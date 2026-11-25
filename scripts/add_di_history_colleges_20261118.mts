// Kyle 2026-11-18: the colleges named in the NCAA DI files 1935–1998 that weren't on our list — one row each (city,
// state, mascot; conference and colors left for later — many of these programs are long gone) with every printed
// spelling as an alias. Spellings of colleges already on the list become aliases of them. Dry run unless --apply.
import { createClient } from '@supabase/supabase-js'
const APPLY = process.argv.includes('--apply')
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
// name | city | state | mascot | printed spellings
const NEW = `
Akron|Akron|OH|Zips|Akron
Alabama|Tuscaloosa|AL|Crimson Tide|Alabama
Alfred|Alfred|NY|Saxons|Alfred
Allegheny|Meadville|PA|Gators|Allegheny
Amherst|Amherst|MA|Mammoths|Amherst
Arizona|Tucson|AZ|Wildcats|Arizona
Arkansas State|Jonesboro|AR|Red Wolves|Arkansas State
Auburn|Auburn|AL|Tigers|Auburn
Augsburg|Minneapolis|MN|Auggies|Augsburg
Augustana (IL)|Rock Island|IL|Vikings|Augustana Illinois
Baldwin Wallace|Berea|OH|Yellow Jackets|Baldwin Wallace
Ball State|Muncie|IN|Cardinals|Ball State
Baltimore|Baltimore|MD|Bees|Baltimore
Beloit|Beloit|WI|Buccaneers|Beloit
Bowling Green|Bowling Green|OH|Falcons|Bowling Green
Bradley|Peoria|IL|Braves|Bradley
Brooklyn College|Brooklyn|NY|Bulldogs|Brooklyn
Buena Vista|Storm Lake|IA|Beavers|Buena Vista
Cal Poly Pomona|Pomona|CA|Broncos|Cal Poly-Pomona
Chico State|Chico|CA|Wildcats|Cal State-Chico
Cal State LA|Los Angeles|CA|Golden Eagles|Cal State-Los Angeles
UC Santa Barbara|Santa Barbara|CA|Gauchos|Cal State-Santa Barbara
PennWest California|California|PA|Vulcans|California PA
California|Berkeley|CA|Golden Bears|California-Berkeley
Carleton|Northfield|MN|Knights|Carleton
Case Western Reserve|Cleveland|OH|Spartans|Case-Western Reserve
Central (IA)|Pella|IA|Dutch|Central College IA
Central Connecticut|New Britain|CT|Blue Devils|Central Connecticut
UCF|Orlando|FL|Knights|Central Florida
Cheyney|Cheyney|PA|Wolves|Cheyney
Chicago State|Chicago|IL|Cougars|Chicago State
Chicago|Chicago|IL|Maroons|Chicago University
Cincinnati|Cincinnati|OH|Bearcats|Cincinnati
Clemson|Clemson|SC|Tigers|Clemson
Coast Guard|New London|CT|Bears|Coast Guard
Coe|Cedar Rapids|IA|Kohawks|Coe College
Colgate|Hamilton|NY|Raiders|Colgate
TCNJ|Ewing|NJ|Lions|College of New Jersey
Colorado College|Colorado Springs|CO|Tigers|Colorado College
Colorado State|Fort Collins|CO|Rams|Colorado State
Colorado|Boulder|CO|Buffaloes|Colorado
Concordia-Moorhead|Moorhead|MN|Cobbers|Concordia MN
UConn|Storrs|CT|Huskies|Connecticut
Cornell College|Mount Vernon|IA|Rams|Cornell Iowa
Dartmouth|Hanover|NH|Big Green|Dartmouth
DePauw|Greencastle|IN|Tigers|DePauw
Delaware Valley|Doylestown|PA|Aggies|Delaware Valley
Delaware|Newark|DE|Blue Hens|Delaware
Denison|Granville|OH|Big Red|Denison
Denver|Denver|CO|Pioneers|Denver
Drake|Des Moines|IA|Bulldogs|Drake
Dubuque|Dubuque|IA|Spartans|Dubuque
East Carolina|Greenville|NC|Pirates|East Carolina
Eastern Kentucky|Richmond|KY|Colonels|Eastern Kentucky
Eastern Washington|Cheney|WA|Eagles|Eastern Washington
Elizabethtown|Elizabethtown|PA|Blue Jays|Elizabethtown
Fairleigh Dickinson|Teaneck|NJ|Knights|Fairleigh Dickinson
Ferris State|Big Rapids|MI|Bulldogs|Ferris State
Florida|Gainesville|FL|Gators|Florida
Furman|Greenville|SC|Paladins|Furman
George Washington|Washington|DC|Revolutionaries|George Washington
Georgia State|Atlanta|GA|Panthers|Georgia State
Georgia Tech|Atlanta|GA|Yellow Jackets|Georgia Tech
Georgia|Athens|GA|Bulldogs|Georgia
Gettysburg|Gettysburg|PA|Bullets|Gettysburg
Grinnell|Grinnell|IA|Pioneers|Grinnell
Gustavus Adolphus|St. Peter|MN|Gusties|Gustavus Adolphus
Haverford|Haverford|PA|Fords|Haverford
Hiram|Hiram|OH|Terriers|Hiram
Humboldt State|Arcata|CA|Lumberjacks|Humboldt State;Humbouldt State
Idaho State|Pocatello|ID|Bengals|Idaho State
Idaho|Moscow|ID|Vandals|Idaho
Illinois State|Normal|IL|Redbirds|Illinois State
IUP|Indiana|PA|Crimson Hawks|Indiana PA
Indiana State|Terre Haute|IN|Sycamores|Indiana State
Ithaca|Ithaca|NY|Bombers|Ithaca
Jacksonville State|Jacksonville|AL|Gamecocks|Jacksonville State
John Carroll|University Heights|OH|Blue Streaks|John Carroll
Kansas State|Manhattan|KS|Wildcats|Kansas State
Kansas|Lawrence|KS|Jayhawks|Kansas
Kentucky|Lexington|KY|Wildcats|Kentucky
Merchant Marine|Kings Point|NY|Mariners|Kings Point
Knox|Galesburg|IL|Prairie Fire|Knox
Lafayette|Easton|PA|Leopards|Lafayette
Lake Superior State|Sault Ste. Marie|MI|Lakers|Lake Superior
Lewis & Clark|Portland|OR|Pioneers|Lewis & Clark
Lincoln (MO)|Jefferson City|MO|Blue Tigers|Lincoln
Long Beach State|Long Beach|CA|Beach|Long Beach State
LSU|Baton Rouge|LA|Tigers|Louisiana State
Luther|Decorah|IA|Norse|Luther
Lycoming|Williamsport|PA|Warriors|Lycoming
MacMurray|Jacksonville|IL|Highlanders|MacMurray State
Maine|Orono|ME|Black Bears|Maine
Manhattan|Riverdale|NY|Jaspers|Manhattan
Marshall|Huntington|WV|Thundering Herd|Marshall
UMass|Amherst|MA|Minutemen|Massachusetts
Miami (OH)|Oxford|OH|RedHawks|Miami Ohio
Middle Tennessee|Murfreesboro|TN|Blue Raiders|Middle Tennessee
Minnesota Duluth|Duluth|MN|Bulldogs|Minnesota-Duluth
Minnesota Morris|Morris|MN|Cougars|Minnesota-Morris
MIT|Cambridge|MA|Engineers|MIT
Montana State|Bozeman|MT|Bobcats|Montana State
Montana|Missoula|MT|Grizzlies|Montana
Montclair State|Montclair|NJ|Red Hawks|Montclair State
Moravian|Bethlehem|PA|Greyhounds|Moravian
Muhlenberg|Allentown|PA|Mules|Muhlenberg
UNLV|Las Vegas|NV|Rebels|Nevada-Las Vegas
New Hampshire|Durham|NH|Wildcats|New Hampshire
New Mexico|Albuquerque|NM|Lobos|New Mexico
NYU|New York|NY|Violets|New York University
Norfolk State|Norfolk|VA|Spartans|Norfolk State
North Central (IL)|Naperville|IL|Cardinals|North Central Illinois
North Dakota|Grand Forks|ND|Fighting Hawks|North Dakota
Northeastern State|Tahlequah|OK|RiverHawks|Northeastern State
Northern Arizona|Flagstaff|AZ|Lumberjacks|Northern Arizona
Northern Michigan|Marquette|MI|Wildcats|Northern Michigan
Ohio Northern|Ada|OH|Polar Bears|Ohio Northern
Olivet|Olivet|MI|Comets|Olivet
Pacific|Stockton|CA|Tigers|Pacific
Rhode Island|Kingston|RI|Rams|Rhode Island
RIT|Rochester|NY|Tigers|RIT
Rochester|Rochester|NY|Yellowjackets|Rochester
Rowan|Glassboro|NJ|Profs|Rowan
Southern Illinois|Carbondale|IL|Salukis|SIU-Carbondale
Albany|Albany|NY|Great Danes|SUNY-Albany
SUNY Brockport|Brockport|NY|Golden Eagles|SUNY-Brockport
SUNY Cortland|Cortland|NY|Red Dragons|SUNY-Cortland
SUNY Maritime|Bronx|NY|Privateers|SUNY-Maritime College
SUNY Oneonta|Oneonta|NY|Red Dragons|SUNY-Oneonta
SUNY Oswego|Oswego|NY|Lakers|SUNY-Oswego
SUNY Potsdam|Potsdam|NY|Bears|SUNY-Potsdam
Salisbury|Salisbury|MD|Sea Gulls|Salisbury
San Diego State|San Diego|CA|Aztecs|San Diego State
San Jose State|San Jose|CA|Spartans|San Jose State
Seattle Pacific|Seattle|WA|Falcons|Seattle Pacific
South Carolina State|Orangeburg|SC|Bulldogs|South Carolina State
Southeast Missouri|Cape Girardeau|MO|Redhawks|Southeast Missouri
Southern Connecticut|New Haven|CT|Owls|Southern Connecticut
Southern Oregon|Ashland|OR|Raiders|Southern Oregon
Missouri State|Springfield|MO|Bears|Southwest Missouri
Southwestern Oklahoma State|Weatherford|OK|Bulldogs|Southwestern Oklahoma
Springfield|Springfield|MA|Pride|Springfield
St. Ambrose|Davenport|IA|Fighting Bees|St. Ambrose
Saint Francis (PA)|Loretto|PA|Red Flash|St. Francis PA
St. Lawrence|Canton|NY|Saints|St. Lawrence
Swarthmore|Swarthmore|PA|Garnet|Swarthmore
Syracuse|Syracuse|NY|Orange|Syracuse
Tampa|Tampa|FL|Spartans|Tampa
Temple|Philadelphia|PA|Owls|Temple
Tennessee|Knoxville|TN|Volunteers|Tennessee
Texas A&M|College Station|TX|Aggies|Texas A & M
UTEP|El Paso|TX|Miners|Texas-El Paso
Toledo|Toledo|OH|Rockets|Toledo
Tufts|Medford|MA|Jumbos|Tufts
UCLA|Los Angeles|CA|Bruins|UCLA
Sewanee|Sewanee|TN|Tigers|University of the South
Ursinus|Collegeville|PA|Bears|Ursinus
Utah State|Logan|UT|Aggies|Utah State
Utah|Salt Lake City|UT|Utes|Utah
VCU|Richmond|VA|Rams|Virginia Commonwealth
Virginia State|Petersburg|VA|Trojans|Virginia State
Wagner|Staten Island|NY|Seahawks|Wagner
Wartburg|Waverly|IA|Knights|Wartburg
Washington & Jefferson|Washington|PA|Presidents|Washington & Jefferson
Washington and Lee|Lexington|VA|Generals|Washington & Lee
Washington State|Pullman|WA|Cougars|Washington State
Washington|Seattle|WA|Huskies|Washington
Waynesburg|Waynesburg|PA|Yellow Jackets|Waynesburg
Weber State|Ogden|UT|Wildcats|Weber State
Wesleyan|Middletown|CT|Cardinals|Wesleyan
West Chester|West Chester|PA|Golden Rams|West Chester
Western Illinois|Macomb|IL|Leathernecks|Western Illinois
Western Michigan|Kalamazoo|MI|Broncos|Western Michigan
Wheaton (IL)|Wheaton|IL|Thunder|Wheaton
Wilkes|Wilkes-Barre|PA|Colonels|Wilkes
William & Mary|Williamsburg|VA|Tribe|William & Mary
William Penn|Oskaloosa|IA|Statesmen|William Penn
Williams|Williamstown|MA|Ephs|Williams
Winona State|Winona|MN|Warriors|Winona State
Milwaukee|Milwaukee|WI|Panthers|Wisconsin-Milwaukee
UW-River Falls|River Falls|WI|Falcons|Wisconsin-River Falls
UW-Stevens Point|Stevens Point|WI|Pointers|Wisconsin-Stevens
UW-Superior|Superior|WI|Yellowjackets|Wisconsin-Superior
UW-Whitewater|Whitewater|WI|Warhawks|Wisconsin-Whitewater
Wright State|Dayton|OH|Raiders|Wright State
Yale|New Haven|CT|Bulldogs|Yale
Youngstown State|Youngstown|OH|Penguins|Youngstown State
CCNY|New York|NY|Beavers|CCNY
LIU Post (C.W. Post)|Brookville|NY|Pioneers|C.W. Post
`.trim().split('\n').map(l => { const [name, city, state, mascot, al] = l.split('|'); return { name, city, state, mascot, aliases: al.split(';') } })
// spellings of colleges already on the list
const OLD: [string, string][] = [['Minnesota State', 'Minnesota State-Mankato'], ['Minnesota State', 'Minnesota State-Manka'], ['MSU Moorhead', 'Minnesota State-Moorhead'], ['MSU Moorhead', 'Minnesota State-Moor'], ['MSU Moorhead', 'Moorhead State'], ['Wisconsin-Parkside', 'Wisconsin-Parkland']]
const { data: cols } = await db.from('colleges').select('id, name')
const { data: have } = await db.from('college_aliases').select('alias, college_id')
const id = new Map((cols ?? []).map(c => [c.name.toLowerCase(), c.id as number]))
const taken = new Map((have ?? []).map(a => [a.alias.toLowerCase(), a.college_id as number]))
const clash = NEW.filter(c => id.has(c.name.toLowerCase())).map(c => c.name)
const takenAl = NEW.flatMap(c => c.aliases).filter(a => taken.has(a.toLowerCase()))
console.log({ new: NEW.length, name_already_used: clash, alias_already_used: takenAl })
// LIU Post is on the list as "LIU Post" already: C.W. Post becomes its alias instead
const liu = id.get('liu post')
if (!APPLY) process.exit(0)
const rows = NEW.filter(c => !id.has(c.name.toLowerCase()) && !(c.name.startsWith('LIU Post') && liu))
const { data: ins, error } = await db.from('colleges').insert(rows.map(({ aliases: _a, ...c }) => ({ ...c, conference: null }))).select('id, name')
if (error) throw new Error(error.message)
for (const c of ins ?? []) id.set(c.name.toLowerCase(), c.id)
const aliasRows = [
  ...NEW.flatMap(c => c.aliases.map(a => ({ alias: a.toLowerCase(), college_id: c.name.startsWith('LIU Post') && liu ? liu : id.get(c.name.toLowerCase())! }))),
  ...OLD.map(([n, a]) => ({ alias: a.toLowerCase(), college_id: id.get(n.toLowerCase())! })),
].filter(a => a.college_id && !taken.has(a.alias))
const { error: e2 } = await db.from('college_aliases').insert([...new Map(aliasRows.map(a => [a.alias, a])).values()])
if (e2) throw new Error(e2.message)
console.log({ colleges_added: ins?.length, aliases_added: aliasRows.length })
