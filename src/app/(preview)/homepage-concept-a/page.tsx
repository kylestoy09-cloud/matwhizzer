'use client'

import { useState } from 'react'
import { HeaderNav } from '@/components/HeaderNav'

// ── Fake data ─────────────────────────────────────────────────────────────────

const TEAM_SCORES = [
  { id:1,  t1:'Don Bosco',      s1:42, t2:'Bergen Catholic', s2:21, section:'North I',   status:'Final' },
  { id:2,  t1:'St. Augustine',  s1:36, t2:'Delbarton',       s2:30, section:'North II',  status:'Final' },
  { id:3,  t1:'Pope John',      s1:33, t2:'DePaul Cath.',    s2:33, section:'North I',   status:'Final' },
  { id:4,  t1:'Phillipsburg',   s1:48, t2:'Bound Brook',     s2:12, section:'North II',  status:'Final' },
  { id:5,  t1:'Clearview',      s1:27, t2:'Kingsway',        s2:39, section:'South',     status:'Final' },
  { id:6,  t1:'Seton Hall Pr.', s1:42, t2:'Ridge',           s2:15, section:'North II',  status:'Final' },
  { id:7,  t1:'Hunterdon Cen.', s1:38, t2:'Montgomery',      s2:28, section:'North II',  status:'Final' },
  { id:8,  t1:'High Point',     s1:30, t2:'Lenape Valley',   s2:36, section:'North I',   status:'Final' },
  { id:9,  t1:'Christian Bros.',s1:45, t2:'Marlboro',        s2:21, section:'Central',   status:'Final' },
  { id:10, t1:'Westfield',      s1:24, t2:'Union City',      s2:42, section:'Central',   status:'Final' },
  { id:11, t1:'Bridgewater',    s1:33, t2:'Howell',          s2:33, section:'Central',   status:'Final' },
  { id:12, t1:'Clifton',        s1:51, t2:'Hackensack',      s2:15, section:'North I',   status:'Final' },
]

const ARTICLE_ITEMS = [
  {
    n: 1,
    headline: 'Don Bosco dismantles Bergen Catholic 42-21 behind five bonus-point wins',
    preview: "The Ironmen's depth from 132 to 165 proved too much for the Crusaders, who got falls from their top two but couldn't keep pace in the middle weights.",
    full: "DeAngelo (132) and Ricci (120) each recorded falls in under two minutes to set the tone, while Bergen Catholic's Spano and Fontaine matched them at 138 and 145. The difference was the three-bonus run from 150-165 where Don Bosco outscored the Crusaders 21-3. Head coach Mancuso called it 'the best team performance since the 2021 state championship run.'"
  },
  {
    n: 2,
    headline: 'St. Augustine edges Delbarton 36-30 in South Jersey showdown',
    preview: "Shorebird senior Santos (138) delivered a third-period fall to break a 30-30 tie with two bouts remaining, sending the crowd into a frenzy.",
    full: "The dual was knotted four times before Santos's match-winning pin. Delbarton's Morris (144) had given the Green Wave a 30-27 lead before Santos responded. The Hermits now own the tiebreaker over Delbarton for seeding purposes in the NJSIAA postseason."
  },
  {
    n: 3,
    headline: 'Pope John and DePaul battle to rare 33-33 tie at 215',
    preview: "For the first time in program history, the Lions and Spartans split every weight class perfectly — seven apiece — with the dual decided by bonus points.",
    full: "Pope John technically 'wins' the dual on criteria (more pins, 3-2) but both teams walk away with a split for record purposes. Burke (165) and Alvarez (106) were the stars for their respective programs."
  },
  {
    n: 4,
    headline: 'Phillipsburg posts 48-12 rout, clinches conference title',
    preview: "The Stateliners needed just 18 minutes to clinch the Warren Conference dual-meet championship, rolling through Bound Brook's lineup from top to bottom.",
    full: "Phillipsburg went 11-3 across weight classes and had eight bonus-point wins. The win clinches a No. 1 seed in the North II, Group 3 bracket. Senior captain Williams said: 'This is what we worked for since August.'"
  },
  {
    n: 5,
    headline: 'Kingsway rallies past Clearview 39-27 on late falls at 175 and 190',
    preview: "Trailing 27-27 with three bouts to go, the Dragons pinned their way to victory in what section coaches are calling 'the dual of the year so far.'",
    full: "Dixon (175) ended a tight 7-6 match with a pin at 4:32, then Jackson (190) followed with a pin of his own to put Kingsway ahead for good. Clearview's Torres had earlier gutted out a two-point win at 157 that seemed like a momentum-shifter — until it wasn't."
  },
  {
    n: 6,
    headline: 'Seton Hall Prep shuts out Ridge 42-15 with seven bonus-point wins',
    preview: "The Pirates have now won eight straight duals and have outscored opponents 312-87 — an average of 39-11 per night — in arguably their best dual-meet run in a decade.",
    full: "Ricci (120) was the headliner with a 1:22 fall, but the real story was the middle of the Pirates' lineup (132-157) where they went 5-0 with four bonus-point wins, including a tech fall from sophomore Kim."
  },
  {
    n: 7,
    headline: "Hunterdon Central beats Montgomery 38-28 behind Chen's pinning clinic",
    preview: "The sophomore phenom pinned his opponent at 1:04, extending his season fall percentage to 87.5% and moving him to No. 1 in the P4P index.",
    full: "Chen was clinical, securing a double-leg takedown and immediately working to a fall despite facing a wrestler ranked in the top five at 106. Montgomery's response from Kim (126) — a major decision — kept the dual interesting through the middle rounds, but Hunterdon's depth proved decisive."
  },
]

const POLL_OPTIONS = [
  'Absolutely',
  'Maybe so',
  'Maybe not',
  'Absolutely not',
  "Don't care",
]
const POLL_FAKE_VOTES = [312, 178, 94, 58, 214]

const SECTIONS_FILTER = ['State','North I','North II','Central','South']

// ── Expanded team rankings (25) ───────────────────────────────────────────────

const TEAM_RANKINGS = [
  { rank:1,  school:'Don Bosco Prep',      section:'North I',   wins:22, losses:1,  pts:188 },
  { rank:2,  school:'Bergen Catholic',     section:'North I',   wins:21, losses:2,  pts:181 },
  { rank:3,  school:'St. Augustine',       section:'South',     wins:20, losses:2,  pts:175 },
  { rank:4,  school:'Delbarton',           section:'North II',  wins:19, losses:3,  pts:162 },
  { rank:5,  school:'Pope John XXIII',     section:'North I',   wins:18, losses:3,  pts:155 },
  { rank:6,  school:'Hunterdon Central',   section:'North II',  wins:18, losses:4,  pts:149 },
  { rank:7,  school:'Phillipsburg',        section:'North II',  wins:17, losses:4,  pts:143 },
  { rank:8,  school:'Christian Bros.',     section:'Central',   wins:16, losses:4,  pts:137 },
  { rank:9,  school:'Kingsway',            section:'South',     wins:16, losses:5,  pts:131 },
  { rank:10, school:'Bound Brook',         section:'Central',   wins:15, losses:5,  pts:124 },
  { rank:11, school:'Seton Hall Prep',     section:'North II',  wins:15, losses:5,  pts:118 },
  { rank:12, school:'DePaul Catholic',     section:'North I',   wins:14, losses:6,  pts:112 },
  { rank:13, school:'Clifton',             section:'North I',   wins:14, losses:6,  pts:106 },
  { rank:14, school:'High Point',          section:'North I',   wins:13, losses:6,  pts:100 },
  { rank:15, school:'Montgomery',          section:'Central',   wins:13, losses:7,  pts:95 },
  { rank:16, school:'Marlboro',            section:'Central',   wins:13, losses:7,  pts:90 },
  { rank:17, school:'Westfield',           section:'Central',   wins:12, losses:7,  pts:85 },
  { rank:18, school:'Clearview',           section:'South',     wins:12, losses:8,  pts:80 },
  { rank:19, school:'South Brunswick',     section:'Central',   wins:11, losses:8,  pts:75 },
  { rank:20, school:'Bridgewater-Rar.',    section:'Central',   wins:11, losses:8,  pts:71 },
  { rank:21, school:'Ridge',               section:'North II',  wins:10, losses:9,  pts:67 },
  { rank:22, school:'Lenape Valley',       section:'North I',   wins:10, losses:9,  pts:63 },
  { rank:23, school:'Howell',              section:'Central',   wins:9,  losses:10, pts:59 },
  { rank:24, school:'Union City',          section:'North I',   wins:9,  losses:10, pts:55 },
  { rank:25, school:'Hackensack',          section:'North I',   wins:8,  losses:10, pts:51 },
]

// ── Expanded P4P (25) ─────────────────────────────────────────────────────────

const P4P_RANKINGS = [
  { rank:1,  name:'Marcus DeAngelo',   school:'Don Bosco',      wt:132, record:'24-0', section:'North I'  },
  { rank:2,  name:'Tyler Chen',        school:'Hunterdon Cen.', wt:106, record:'23-0', section:'North II' },
  { rank:3,  name:'Darryl Dixon',      school:'Marlboro',       wt:175, record:'22-1', section:'Central'  },
  { rank:4,  name:'Kyle Santos',       school:'St. Augustine',  wt:138, record:'22-1', section:'South'    },
  { rank:5,  name:'Luca Ricci',        school:'Seton Hall',     wt:120, record:'21-1', section:'North II' },
  { rank:6,  name:'Andre Torres',      school:'Clearview',      wt:157, record:'21-2', section:'South'    },
  { rank:7,  name:'Marcus Kim',        school:'Montgomery',     wt:126, record:'20-1', section:'Central'  },
  { rank:8,  name:'Noah Burke',        school:'DePaul',         wt:165, record:'20-2', section:'North I'  },
  { rank:9,  name:'Rajan Patel',       school:'S. Brunswick',   wt:144, record:'19-2', section:'Central'  },
  { rank:10, name:'Sean Hoffman',      school:'High Point',     wt:113, record:'19-2', section:'North I'  },
  { rank:11, name:'Victor Spano',      school:'Bergen Catholic',wt:132, record:'19-3', section:'North I'  },
  { rank:12, name:'Chris O\'Brien',    school:'Christian Bros.',wt:175, record:'18-3', section:'Central'  },
  { rank:13, name:'Eric Park',         school:'Ridge',          wt:106, record:'18-3', section:'North II' },
  { rank:14, name:'Sam Alvarez',       school:'Pope John',      wt:106, record:'18-3', section:'North I'  },
  { rank:15, name:'Jake Morris',       school:'Delbarton',      wt:144, record:'17-4', section:'North II' },
  { rank:16, name:'Ryan Grant',        school:'Montville',      wt:165, record:'17-4', section:'North I'  },
  { rank:17, name:'Dom Ferreira',      school:'Bridgewater',    wt:190, record:'17-4', section:'Central'  },
  { rank:18, name:'Luis Perez',        school:'Union City',     wt:132, record:'16-4', section:'North I'  },
  { rank:19, name:'Anton Lewis',       school:'Westfield',      wt:190, record:'16-5', section:'Central'  },
  { rank:20, name:'Danny Yoo',         school:'Clifton',        wt:106, record:'16-5', section:'North I'  },
  { rank:21, name:'Mike Russo',        school:'Howell',         wt:126, record:'15-5', section:'Central'  },
  { rank:22, name:'Tony Bloom',        school:'Cherry Hill E.', wt:215, record:'15-5', section:'South'    },
  { rank:23, name:'Bryce Nguyen',      school:'Clifton',        wt:285, record:'15-5', section:'North I'  },
  { rank:24, name:'Alec Burke',        school:'DePaul',         wt:165, record:'14-6', section:'North I'  },
  { rank:25, name:'Kevin Cruz',        school:'Hackensack',     wt:215, record:'14-6', section:'North I'  },
]

// ── State Top 25 data ─────────────────────────────────────────────────────────

const WEIGHTS = [106,113,120,126,132,138,144,150,157,165,175,190,215,285]

type Ranked = { rank:number; name:string; school:string; record:string }

const STATE25: Record<number, Ranked[]> = {
  106: [
    {rank:1, name:'Tyler Chen',      school:'Hunterdon Cen.', record:'23-0'},
    {rank:2, name:'Eric Park',       school:'Ridge',          record:'21-1'},
    {rank:3, name:'Sam Alvarez',     school:'Pope John',      record:'20-2'},
    {rank:4, name:'Danny Yoo',       school:'Clifton',        record:'19-2'},
    {rank:5, name:'Mike Lee',        school:'Bergen Cath.',   record:'18-3'},
    {rank:6, name:'Cody Bell',       school:'Delbarton',      record:'17-4'},
    {rank:7, name:'Ryan Walsh',      school:'Phillipsburg',   record:'16-4'},
    {rank:8, name:'Jorge Mendez',    school:'Union City',     record:'15-5'},
  ],
  113: [
    {rank:1, name:'Sean Hoffman',    school:'High Point',     record:'19-2'},
    {rank:2, name:'Louis Chen',      school:'Seton Hall',     record:'18-2'},
    {rank:3, name:'Tyler Moon',      school:'Don Bosco',      record:'17-3'},
    {rank:4, name:'Carlos Rivera',   school:'Clifton',        record:'16-4'},
    {rank:5, name:'Ben Stein',       school:'Ridge',          record:'15-4'},
    {rank:6, name:'Will Kraft',      school:'Kingsway',       record:'14-5'},
    {rank:7, name:'Omar Hassan',     school:'Christian Bros.',record:'13-6'},
    {rank:8, name:'Alex Nguyen',     school:'Montgomery',     record:'13-6'},
  ],
  120: [
    {rank:1, name:'Luca Ricci',      school:'Seton Hall',     record:'21-1'},
    {rank:2, name:'Jay Park',        school:'Ridge',          record:'20-2'},
    {rank:3, name:'Tyler Hunt',      school:'Bergen Cath.',   record:'19-2'},
    {rank:4, name:'Marcus Brown',    school:'Don Bosco',      record:'18-3'},
    {rank:5, name:'AJ Torres',       school:'Clearview',      record:'17-3'},
    {rank:6, name:'Nick Costa',      school:'Phillipsburg',   record:'16-4'},
    {rank:7, name:'Dylan Ross',      school:'High Point',     record:'15-5'},
    {rank:8, name:'Sean Kim',        school:'Delbarton',      record:'14-5'},
  ],
  126: [
    {rank:1, name:'Marcus Kim',      school:'Montgomery',     record:'20-1'},
    {rank:2, name:'Tony Park',       school:'Bergen Cath.',   record:'19-2'},
    {rank:3, name:'Mike Russo',      school:'Howell',         record:'18-3'},
    {rank:4, name:'Danny Chen',      school:'Seton Hall',     record:'17-3'},
    {rank:5, name:'Kyle Walsh',      school:'Don Bosco',      record:'16-4'},
    {rank:6, name:'Bobby Lee',       school:'Phillipsburg',   record:'15-5'},
    {rank:7, name:'Sam Costa',       school:'Kingsway',       record:'14-5'},
    {rank:8, name:'Pete Alvarez',    school:'Pope John',      record:'13-6'},
  ],
  132: [
    {rank:1, name:'Marcus DeAngelo', school:'Don Bosco',      record:'24-0'},
    {rank:2, name:'Victor Spano',    school:'Bergen Cath.',   record:'22-1'},
    {rank:3, name:'Kyle Fontaine',   school:'Bergen Cath.',   record:'19-3'},
    {rank:4, name:'Luis Perez',      school:'Union City',     record:'18-3'},
    {rank:5, name:'Mike Russo',      school:'Howell',         record:'17-4'},
    {rank:6, name:'Ray Torres',      school:'Kingsway',       record:'16-4'},
    {rank:7, name:'Dave Smith',      school:'Phillipsburg',   record:'15-5'},
    {rank:8, name:'Juan Garcia',     school:'Clifton',        record:'14-5'},
  ],
  138: [
    {rank:1, name:'Kyle Santos',     school:'St. Augustine',  record:'22-1'},
    {rank:2, name:'Jake Morris',     school:'Delbarton',      record:'20-2'},
    {rank:3, name:'Tyler Grant',     school:'Seton Hall',     record:'19-3'},
    {rank:4, name:'Chris Lee',       school:'Don Bosco',      record:'18-3'},
    {rank:5, name:'Sam Bell',        school:'Bergen Cath.',   record:'17-4'},
    {rank:6, name:'Will Torres',     school:'Clearview',      record:'16-5'},
    {rank:7, name:'Nick Rivera',     school:'Christian Bros.',record:'15-5'},
    {rank:8, name:'Ray Kim',         school:'Montgomery',     record:'14-6'},
  ],
  144: [
    {rank:1, name:'Rajan Patel',     school:'S. Brunswick',   record:'19-2'},
    {rank:2, name:'Jake Morris',     school:'Delbarton',      record:'18-3'},
    {rank:3, name:'Victor Cruz',     school:'Hackensack',     record:'17-4'},
    {rank:4, name:'Ben Walsh',       school:'Don Bosco',      record:'16-4'},
    {rank:5, name:'AJ Torres',       school:'St. Augustine',  record:'15-5'},
    {rank:6, name:'Chris Smith',     school:'Phillipsburg',   record:'14-5'},
    {rank:7, name:'Sam Lee',         school:'Howell',         record:'13-6'},
    {rank:8, name:'Mike Grant',      school:'Kingsway',       record:'12-7'},
  ],
  150: [
    {rank:1, name:'Chris Williams',  school:'Phillipsburg',   record:'18-3'},
    {rank:2, name:'Tom Barker',      school:'Bound Brook',    record:'17-3'},
    {rank:3, name:'Ray Brown',       school:'Bergen Cath.',   record:'16-4'},
    {rank:4, name:'Sam Kang',        school:'Hunterdon Cen.', record:'15-4'},
    {rank:5, name:'Dave Torres',     school:'Don Bosco',      record:'14-5'},
    {rank:6, name:'Mike Park',       school:'Ridge',          record:'13-5'},
    {rank:7, name:'Kyle Johnson',    school:'Seton Hall',     record:'12-6'},
    {rank:8, name:'Dan Walsh',       school:'St. Augustine',  record:'11-7'},
  ],
  157: [
    {rank:1, name:'Andre Torres',    school:'Clearview',      record:'21-2'},
    {rank:2, name:'Omar Hassan',     school:'Kingsway',       record:'20-2'},
    {rank:3, name:'Nick Cruz',       school:'Bergen Cath.',   record:'19-3'},
    {rank:4, name:'Ray Nguyen',      school:'Clifton',        record:'18-4'},
    {rank:5, name:'Sam Park',        school:'Don Bosco',      record:'17-4'},
    {rank:6, name:'Chris Bell',      school:'Christian Bros.',record:'16-5'},
    {rank:7, name:'Danny Walsh',     school:'Phillipsburg',   record:'15-5'},
    {rank:8, name:'Mike Smith',      school:'Howell',         record:'14-6'},
  ],
  165: [
    {rank:1, name:'Noah Burke',      school:'DePaul',         record:'20-2'},
    {rank:2, name:'Ryan Grant',      school:'Montville',      record:'19-3'},
    {rank:3, name:'Chris O\'Brien',  school:'Christian Bros.',record:'18-3'},
    {rank:4, name:'Sam Rivera',      school:'Bergen Cath.',   record:'17-4'},
    {rank:5, name:'Victor Torres',   school:'St. Augustine',  record:'16-5'},
    {rank:6, name:'Jake Kim',        school:'Don Bosco',      record:'15-5'},
    {rank:7, name:'Mike Walsh',      school:'Phillipsburg',   record:'14-6'},
    {rank:8, name:'Ray Park',        school:'Hunterdon Cen.', record:'13-6'},
  ],
  175: [
    {rank:1, name:'Darryl Dixon',    school:'Marlboro',       record:'22-1'},
    {rank:2, name:'Chris O\'Brien',  school:'Christian Bros.',record:'21-2'},
    {rank:3, name:'Tony Burke',      school:'DePaul',         record:'20-2'},
    {rank:4, name:'Ryan Grant',      school:'Montville',      record:'18-3'},
    {rank:5, name:'Alec Bloom',      school:'Cherry Hill E.', record:'17-4'},
    {rank:6, name:'Sam Walsh',       school:'Don Bosco',      record:'16-5'},
    {rank:7, name:'Luis Torres',     school:'Union City',     record:'15-5'},
    {rank:8, name:'Nick Smith',      school:'Bergen Cath.',   record:'14-6'},
  ],
  190: [
    {rank:1, name:'Dom Ferreira',    school:'Bridgewater',    record:'17-4'},
    {rank:2, name:'Anton Lewis',     school:'Westfield',      record:'16-5'},
    {rank:3, name:'Ray Kim',         school:'Bergen Cath.',   record:'15-5'},
    {rank:4, name:'Sam Williams',    school:'Phillipsburg',   record:'14-6'},
    {rank:5, name:'Chris Brown',     school:'Don Bosco',      record:'13-6'},
    {rank:6, name:'Jake Torres',     school:'Seton Hall',     record:'12-7'},
    {rank:7, name:'Mike Cruz',       school:'Kingsway',       record:'11-7'},
    {rank:8, name:'Dave Park',       school:'St. Augustine',  record:'10-8'},
  ],
  215: [
    {rank:1, name:'Tony Bloom',      school:'Cherry Hill E.', record:'15-5'},
    {rank:2, name:'Chris Dixon',     school:'Marlboro',       record:'14-5'},
    {rank:3, name:'Ray Jackson',     school:'Toms River N.',  record:'13-6'},
    {rank:4, name:'Sam Burke',       school:'DePaul',         record:'12-6'},
    {rank:5, name:'Nick Williams',   school:'Don Bosco',      record:'11-7'},
    {rank:6, name:'Dave Cruz',       school:'Hackensack',     record:'10-7'},
    {rank:7, name:'Mike Torres',     school:'Bergen Cath.',   record:'9-8'},
    {rank:8, name:'Jake Smith',      school:'Phillipsburg',   record:'9-8'},
  ],
  285: [
    {rank:1, name:'Bryce Nguyen',    school:'Clifton',        record:'15-5'},
    {rank:2, name:'Dom Jackson',     school:'Toms River N.',  record:'14-5'},
    {rank:3, name:'Ray Smith',       school:'Don Bosco',      record:'13-6'},
    {rank:4, name:'Sam Torres',      school:'Kingsway',       record:'12-6'},
    {rank:5, name:'Mike Williams',   school:'Bergen Cath.',   record:'11-7'},
    {rank:6, name:'Chris Brown',     school:'Phillipsburg',   record:'10-7'},
    {rank:7, name:'Jake Kim',        school:'Christian Bros.',record:'9-8'},
    {rank:8, name:'Dave Park',       school:'High Point',     record:'8-9'},
  ],
}

// ── Leaderboard data ──────────────────────────────────────────────────────────

type LeaderEntry = { name:string; school:string; val:string|number }

const LEADERBOARDS: Array<{id:string; title:string; unit:string; wrestler:boolean; rows:LeaderEntry[]}> = [
  {
    id:'pin-pct', title:'Pin %', unit:'%', wrestler:true,
    rows:[
      {name:'Marcus DeAngelo', school:'Don Bosco',     val:87.5},
      {name:'Darryl Dixon',    school:'Marlboro',      val:82.1},
      {name:'Tyler Chen',      school:'Hunterdon',     val:78.4},
      {name:'Sean Hoffman',    school:'High Point',    val:76.9},
      {name:'Luca Ricci',      school:'Seton Hall',    val:73.3},
      {name:'Kyle Santos',     school:'St. Aug.',      val:71.0},
      {name:'Noah Burke',      school:'DePaul',        val:68.8},
      {name:'Marcus Kim',      school:'Montgomery',    val:65.4},
    ],
  },
  {
    id:'tech-pct', title:'Tech Fall %', unit:'%', wrestler:true,
    rows:[
      {name:'Tyler Chen',      school:'Hunterdon',     val:52.2},
      {name:'Marcus DeAngelo', school:'Don Bosco',     val:47.8},
      {name:'Eric Park',       school:'Ridge',         val:43.5},
      {name:'Kyle Santos',     school:'St. Aug.',      val:40.9},
      {name:'Sam Alvarez',     school:'Pope John',     val:38.1},
      {name:'Sean Hoffman',    school:'High Point',    val:36.4},
      {name:'Marcus Kim',      school:'Montgomery',    val:33.3},
      {name:'Andre Torres',    school:'Clearview',     val:31.0},
    ],
  },
  {
    id:'bonus-pct', title:'Bonus %', unit:'%', wrestler:true,
    rows:[
      {name:'Marcus DeAngelo', school:'Don Bosco',     val:91.7},
      {name:'Tyler Chen',      school:'Hunterdon',     val:88.3},
      {name:'Darryl Dixon',    school:'Marlboro',      val:85.0},
      {name:'Luca Ricci',      school:'Seton Hall',    val:82.2},
      {name:'Noah Burke',      school:'DePaul',        val:79.4},
      {name:'Kyle Santos',     school:'St. Aug.',      val:76.8},
      {name:'Sean Hoffman',    school:'High Point',    val:73.3},
      {name:'Marcus Kim',      school:'Montgomery',    val:70.0},
    ],
  },
  {
    id:'team-pts-match', title:'Team Pts / Match', unit:'pts', wrestler:false,
    rows:[
      {name:'Don Bosco Prep',   school:'North I',   val:38.4},
      {name:'Bergen Catholic',  school:'North I',   val:36.9},
      {name:'St. Augustine',    school:'South',     val:35.1},
      {name:'Delbarton',        school:'North II',  val:33.8},
      {name:'Phillipsburg',     school:'North II',  val:32.4},
      {name:'Pope John',        school:'North I',   val:31.7},
      {name:'Hunterdon Cen.',   school:'North II',  val:30.2},
      {name:'Christian Bros.',  school:'Central',   val:29.8},
    ],
  },
  {
    id:'team-pins', title:'Team Pins', unit:'pins', wrestler:false,
    rows:[
      {name:'Don Bosco Prep',   school:'North I',   val:68},
      {name:'Bergen Catholic',  school:'North I',   val:61},
      {name:'Delbarton',        school:'North II',  val:57},
      {name:'St. Augustine',    school:'South',     val:54},
      {name:'Pope John',        school:'North I',   val:49},
      {name:'Phillipsburg',     school:'North II',  val:46},
      {name:'Hunterdon Cen.',   school:'North II',  val:43},
      {name:'Christian Bros.',  school:'Central',   val:41},
    ],
  },
  {
    id:'team-techs', title:'Team Tech Falls', unit:'TFs', wrestler:false,
    rows:[
      {name:'Bergen Catholic',  school:'North I',   val:29},
      {name:'Don Bosco Prep',   school:'North I',   val:26},
      {name:'Hunterdon Cen.',   school:'North II',  val:24},
      {name:'St. Augustine',    school:'South',     val:22},
      {name:'Delbarton',        school:'North II',  val:19},
      {name:'Pope John',        school:'North I',   val:17},
      {name:'Christian Bros.',  school:'Central',   val:16},
      {name:'Phillipsburg',     school:'North II',  val:14},
    ],
  },
  {
    id:'team-bonus-pct', title:'Team Bonus %', unit:'%', wrestler:false,
    rows:[
      {name:'Don Bosco Prep',   school:'North I',   val:78.2},
      {name:'Bergen Catholic',  school:'North I',   val:74.6},
      {name:'St. Augustine',    school:'South',     val:71.3},
      {name:'Delbarton',        school:'North II',  val:68.9},
      {name:'Pope John',        school:'North I',   val:65.5},
      {name:'Hunterdon Cen.',   school:'North II',  val:63.1},
      {name:'Phillipsburg',     school:'North II',  val:60.8},
      {name:'Christian Bros.',  school:'Central',   val:58.4},
    ],
  },
]

// ── Shared styles ─────────────────────────────────────────────────────────────

const CARD = 'bg-white rounded-xl border border-slate-200 overflow-hidden'
const CARD_HDR = 'flex items-center justify-between px-4 py-3 border-b border-slate-100'
const CARD_TITLE = 'text-xs font-bold uppercase tracking-widest text-slate-500'
const SEE_ALL_LINK = 'block text-center text-xs font-semibold text-[#d4192a] hover:text-[#aa1220] py-2 border-t border-slate-100 transition-colors'

// ── Sub-components ────────────────────────────────────────────────────────────

function ScoreBar() {
  return (
    <div className="bg-[#0c1729] border-b border-[#1e2d48]">
      <div className="flex items-center gap-0 overflow-x-auto" style={{scrollbarWidth:'none'}}>
        <div className="shrink-0 flex items-center gap-2 px-3 py-2 border-r border-[#1e2d48]">
          <span className="text-[10px] font-black uppercase tracking-widest text-[#d4192a]">SCORES</span>
          <span className="text-[10px] text-slate-500">{TEAM_SCORES.length} duals</span>
        </div>
        {TEAM_SCORES.map(m => {
          const t1Wins = m.s1 > m.s2
          return (
            <div key={m.id} className="shrink-0 flex flex-col justify-center px-3 py-1.5 border-r border-[#1a2540] hover:bg-[#111f36] transition-colors cursor-pointer min-w-[130px]">
              <div className="flex items-center justify-between gap-2">
                <span className={`text-[11px] font-semibold truncate ${t1Wins ? 'text-white' : 'text-slate-400'}`}>{m.t1}</span>
                <span className={`text-[11px] font-black tabular-nums ${t1Wins ? 'text-white' : 'text-slate-400'}`}>{m.s1}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className={`text-[11px] font-semibold truncate ${!t1Wins ? 'text-white' : 'text-slate-400'}`}>{m.t2}</span>
                <span className={`text-[11px] font-black tabular-nums ${!t1Wins ? 'text-white' : 'text-slate-400'}`}>{m.s2}</span>
              </div>
              <span className="text-[9px] text-slate-500 mt-0.5">{m.status} · {m.section}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ArticleSection() {
  const [expanded, setExpanded] = useState<number | null>(null)
  const ISSUE_NUMBER = 1
  const ISSUE_DATE   = 'September 10, 2026'

  return (
    <div className={CARD}>
      {/* Masthead */}
      <div className="bg-[#0c1729] px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#d4192a] mb-1">MatWhizzer Daily</p>
            <h2 className="text-2xl font-black text-white tracking-tight leading-none" style={{fontVariant:'small-caps', letterSpacing:'-0.01em'}}>
              7 Things from Yesterday
            </h2>
            <p className="text-[11px] text-slate-400 mt-1.5 font-medium">{ISSUE_DATE}</p>
          </div>
          <div className="shrink-0 bg-[#d4192a] text-white rounded-lg px-3 py-2 text-center min-w-[52px]">
            <p className="text-[9px] font-bold uppercase tracking-widest leading-tight">Issue</p>
            <p className="text-2xl font-black leading-none">{ISSUE_NUMBER}</p>
          </div>
        </div>
        <div className="mt-3 h-px bg-gradient-to-r from-[#d4192a] via-slate-500 to-transparent" />
      </div>

      {/* Items */}
      <div className="divide-y divide-slate-100">
        {ARTICLE_ITEMS.map((item) => {
          const isOpen = expanded === item.n
          return (
            <div key={item.n} className="px-4 py-3">
              <div className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-[#d4192a] flex items-center justify-center text-white text-[11px] font-black mt-0.5">
                  {item.n}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 leading-snug">{item.headline}</p>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{item.preview}</p>
                  {isOpen && (
                    <p className="text-xs text-slate-600 mt-2 leading-relaxed border-l-2 border-[#d4192a] pl-3">{item.full}</p>
                  )}
                  <button
                    onClick={() => setExpanded(isOpen ? null : item.n)}
                    className="mt-1.5 text-[11px] font-semibold text-[#d4192a] hover:text-[#aa1220] transition-colors"
                  >
                    {isOpen ? '▲ Less' : '▼ Read more'}
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function PollCard() {
  const [voted,    setVoted]    = useState(false)
  const [selected, setSelected] = useState<number|null>(null)
  const [counts,   setCounts]   = useState(POLL_FAKE_VOTES)
  const total = counts.reduce((a,b) => a+b, 0)

  function handleVote() {
    if (selected === null) return
    const next = [...counts]; next[selected]++; setCounts(next); setVoted(true)
  }

  return (
    <div className={CARD}>
      <div className={CARD_HDR}>
        <p className={CARD_TITLE}>Fan Poll</p>
        <span className="text-[10px] text-slate-400">{total.toLocaleString()} votes</span>
      </div>
      <div className="px-4 py-3">
        <p className="text-sm font-bold text-slate-800 leading-snug mb-3">
          Should NJSIAA break out the individual tournament by group?
        </p>
        <div className="space-y-2">
          {POLL_OPTIONS.map((opt, i) => {
            const pct = Math.round((counts[i] / total) * 100)
            return (
              <button
                key={i}
                onClick={() => !voted && setSelected(i)}
                className={`w-full text-left rounded-lg border transition-all relative overflow-hidden ${voted ? 'cursor-default' : selected === i ? 'border-[#d4192a] bg-red-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}
              >
                {voted && <div className="absolute inset-y-0 left-0 bg-[#d4192a]/10 rounded-lg" style={{width:`${pct}%`}} />}
                <div className="relative flex items-center justify-between px-3 py-2">
                  <div className="flex items-center gap-2">
                    {!voted && <div className={`w-3.5 h-3.5 rounded-full border-2 shrink-0 ${selected === i ? 'border-[#d4192a] bg-[#d4192a]' : 'border-slate-300'}`} />}
                    <span className={`text-sm ${voted && selected === i ? 'font-bold text-[#d4192a]' : 'text-slate-700'}`}>{opt}</span>
                  </div>
                  {voted && <span className="text-xs font-bold text-slate-500 tabular-nums">{pct}%</span>}
                </div>
              </button>
            )
          })}
        </div>
        {!voted
          ? <button onClick={handleVote} disabled={selected===null} className={`mt-3 w-full py-2 rounded-lg text-sm font-bold transition-colors ${selected!==null ? 'bg-[#d4192a] text-white hover:bg-[#aa1220]' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}>Vote</button>
          : <p className="mt-3 text-center text-xs text-slate-400">Thanks for voting!</p>
        }
      </div>
    </div>
  )
}

function VaultCard() {
  return (
    <div className={CARD}>
      <div className={CARD_HDR}>
        <div>
          <p className={CARD_TITLE}>Matches from the Vault</p>
          <h3 className="text-sm font-bold text-slate-800 mt-0.5">DeAngelo vs. Spano — 2023 State Finals 132</h3>
        </div>
      </div>
      <div className="aspect-video bg-slate-100">
        <iframe
          src="https://www.youtube.com/embed/jNQXAC9IVRw"
          title="Match from the Vault"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full"
        />
      </div>
      <div className="px-4 py-3">
        <p className="text-sm text-slate-600 leading-relaxed">
          Two-time state champion Marcus DeAngelo (Don Bosco) and Victor Spano (Bergen Catholic) went five grueling minutes in what many call the best 132-pound final in NJSIAA history. DeAngelo trailed 4-3 entering the third period before executing a textbook re-attack in the final 40 seconds.
        </p>
        <div className="flex gap-2 mt-3 flex-wrap">
          <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">2023 State Finals</span>
          <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">132 lbs</span>
          <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">Dec 5-4</span>
        </div>
      </div>
    </div>
  )
}

function TeamRankingsCard() {
  const [section, setSection] = useState('All')
  const filtered = section === 'All' ? TEAM_RANKINGS : TEAM_RANKINGS.filter(r => r.section === section)
  return (
    <div className={CARD}>
      <div className={CARD_HDR}>
        <p className={CARD_TITLE}>Team Rankings</p>
        <select value={section} onChange={e => setSection(e.target.value)} className="text-xs border border-slate-200 rounded px-2 py-1 text-slate-600 bg-white focus:outline-none">
          <option value="All">All Sections</option>
          {['North I','North II','Central','South'].map(s => <option key={s}>{s}</option>)}
        </select>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-100">
            <th className="px-3 py-1 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400 w-8">#</th>
            <th className="px-3 py-1 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">School</th>
            <th className="px-3 py-1 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400 hidden sm:table-cell">Section</th>
            <th className="px-3 py-1 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400 tabular-nums">W</th>
            <th className="px-3 py-1 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400 tabular-nums">L</th>
            <th className="px-3 py-1 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400 tabular-nums">Pts</th>
          </tr></thead>
          <tbody>{filtered.slice(0, 7).map((r,i) => (
            <tr key={r.rank} className={i%2===0 ? 'bg-white' : 'bg-slate-50/60'}>
              <td className="px-3 py-1 text-xs font-bold text-slate-400 tabular-nums">{r.rank}</td>
              <td className="px-3 py-1 text-xs font-semibold text-slate-800">{r.school}</td>
              <td className="px-3 py-1 text-xs text-slate-500 hidden sm:table-cell">{r.section}</td>
              <td className="px-3 py-1 text-xs text-right text-slate-700 tabular-nums">{r.wins}</td>
              <td className="px-3 py-1 text-xs text-right text-slate-500 tabular-nums">{r.losses}</td>
              <td className="px-3 py-1 text-xs text-right font-bold text-slate-800 tabular-nums">{r.pts}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <a href="#" className={SEE_ALL_LINK}>See complete list →</a>
    </div>
  )
}

function P4PRankingsCard() {
  const [section, setSection] = useState('All')
  const filtered = section === 'All' ? P4P_RANKINGS : P4P_RANKINGS.filter(r => r.section === section)
  return (
    <div className={CARD}>
      <div className={CARD_HDR}>
        <p className={CARD_TITLE}>P4P Rankings</p>
        <select value={section} onChange={e => setSection(e.target.value)} className="text-xs border border-slate-200 rounded px-2 py-1 text-slate-600 bg-white focus:outline-none">
          <option value="All">All Sections</option>
          {['North I','North II','Central','South'].map(s => <option key={s}>{s}</option>)}
        </select>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-100">
            <th className="px-3 py-1 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400 w-8">#</th>
            <th className="px-3 py-1 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">Wrestler</th>
            <th className="px-3 py-1 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400 hidden sm:table-cell">School</th>
            <th className="px-3 py-1 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400 tabular-nums">Wt</th>
            <th className="px-3 py-1 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400 tabular-nums">Rec</th>
          </tr></thead>
          <tbody>{filtered.slice(0, 7).map((r,i) => (
            <tr key={r.rank} className={i%2===0 ? 'bg-white' : 'bg-slate-50/60'}>
              <td className="px-3 py-1 text-xs font-bold text-slate-400 tabular-nums">{r.rank}</td>
              <td className="px-3 py-1 text-xs font-semibold text-slate-800">{r.name}</td>
              <td className="px-3 py-1 text-xs text-slate-500 hidden sm:table-cell">{r.school}</td>
              <td className="px-3 py-1 text-xs text-right text-slate-600 tabular-nums">{r.wt}</td>
              <td className="px-3 py-1 text-xs text-right font-bold text-slate-800 tabular-nums">{r.record}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <a href="#" className={SEE_ALL_LINK}>See complete list →</a>
    </div>
  )
}

function State25Card() {
  const [wt,      setWt]      = useState(106)
  const [scope,   setScope]   = useState('State')
  const [section, setSection] = useState('North I')

  const rows = (STATE25[wt] ?? []).slice(0, 7)

  return (
    <div className={CARD}>
      <div className={CARD_HDR}>
        <p className={CARD_TITLE}>State Top 25</p>
        <div className="flex items-center gap-1.5">
          <select value={scope} onChange={e => setScope(e.target.value)} className="text-xs border border-slate-200 rounded px-2 py-1 text-slate-600 bg-white focus:outline-none">
            <option value="State">State</option>
            <option value="Section">Section</option>
          </select>
          {scope === 'Section' && (
            <select value={section} onChange={e => setSection(e.target.value)} className="text-xs border border-slate-200 rounded px-2 py-1 text-slate-600 bg-white focus:outline-none">
              {['North I','North II','Central','South'].map(s => <option key={s}>{s}</option>)}
            </select>
          )}
          <select value={wt} onChange={e => setWt(Number(e.target.value))} className="text-xs border border-slate-200 rounded px-2 py-1 text-slate-600 bg-white focus:outline-none">
            {WEIGHTS.map(w => <option key={w} value={w}>{w}</option>)}
          </select>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-100">
            <th className="px-3 py-1 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400 w-8">#</th>
            <th className="px-3 py-1 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">Wrestler</th>
            <th className="px-3 py-1 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">School</th>
            <th className="px-3 py-1 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400 tabular-nums">Rec</th>
          </tr></thead>
          <tbody>{rows.map((r,i) => (
            <tr key={r.rank} className={i%2===0 ? 'bg-white' : 'bg-slate-50/60'}>
              <td className="px-3 py-1 text-xs font-bold text-slate-400 tabular-nums">{r.rank}</td>
              <td className="px-3 py-1 text-xs font-semibold text-slate-800">{r.name}</td>
              <td className="px-3 py-1 text-xs text-slate-500">{r.school}</td>
              <td className="px-3 py-1 text-xs text-right font-bold text-slate-800 tabular-nums">{r.record}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <a href="#" className={SEE_ALL_LINK}>See complete list →</a>
    </div>
  )
}

function LeaderboardCard({ board }: { board: typeof LEADERBOARDS[0] }) {
  const visible = board.rows.slice(0, 7)
  return (
    <div className={CARD}>
      <div className={CARD_HDR}>
        <p className={CARD_TITLE}>{board.title}</p>
        <span className="text-[10px] text-slate-400">{board.wrestler ? 'Wrestler' : 'Team'}</span>
      </div>
      <table className="w-full text-sm">
        <tbody>
          {visible.map((row,i) => (
            <tr key={i} className={i%2===0 ? 'bg-white' : 'bg-slate-50/60'}>
              <td className="px-3 py-1 w-6 text-[10px] font-black text-slate-300 tabular-nums">{i+1}</td>
              <td className="px-3 py-1">
                <p className="text-xs font-semibold text-slate-800 leading-tight">{row.name}</p>
                <p className="text-[10px] text-slate-400 leading-tight">{row.school}</p>
              </td>
              <td className="px-3 py-1 text-right">
                <span className="text-sm font-black text-slate-700 tabular-nums">{row.val}</span>
                <span className="text-[10px] text-slate-400 ml-0.5">{board.unit}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <a href="#" className={SEE_ALL_LINK}>See complete list →</a>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function HomepageConceptA() {
  return (
    <div className="min-h-screen bg-[#f0f2f5] font-sans">
      {/* Site header */}
      <HeaderNav />

      {/* Score ticker */}
      <ScoreBar />

      {/* Sponsor banner */}
      <div className="bg-gradient-to-r from-[#0c1729] via-[#1a2a4a] to-[#0c1729] py-1.5">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-center gap-4">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Presented by</span>
          <div className="flex items-center gap-2 bg-white/10 rounded-md px-3 py-1">
            <div className="w-4 h-4 rounded bg-[#d4192a] flex items-center justify-center">
              <span className="text-white text-[8px] font-black">NJ</span>
            </div>
            <span className="text-white font-bold text-xs tracking-wide">ACME Wrestling Supply</span>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">

        {/* Row 1: Article + Poll */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2"><ArticleSection /></div>
          <div><PollCard /></div>
        </div>

        {/* Row 2: Vault + Rankings */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <VaultCard />
          <div className="flex flex-col gap-4">
            <TeamRankingsCard />
            <P4PRankingsCard />
          </div>
        </div>

        {/* Row 3: State 25 + first two leaderboards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <State25Card />
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {LEADERBOARDS.slice(0, 2).map(b => <LeaderboardCard key={b.id} board={b} />)}
          </div>
        </div>

        {/* Row 4: Remaining leaderboards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {LEADERBOARDS.slice(2).map(b => <LeaderboardCard key={b.id} board={b} />)}
        </div>

      </div>

      <div className="text-center py-4">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 bg-white border border-slate-200 px-3 py-1 rounded-full">
          Concept A — display only
        </span>
      </div>
    </div>
  )
}
