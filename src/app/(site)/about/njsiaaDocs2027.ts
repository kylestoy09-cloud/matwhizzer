// The NJSIAA rule documents for the 2026-27 season, one set per side (Kyle 2026-11-11: the NJSIAA publishes boys
// and girls separately, so the About page shows each side its own). Summarized from the PDFs posted 11/9/26
// ("NJSIAA Docs/Boys 2026-27", "NJSIAA Docs/Girls 2026-27"); "New" items are the documents' own "New for this
// year" lists, checked against the boys 2025-26 documents. No links yet: the NJSIAA page addresses aren't known.
import type { DocTab } from './AboutClient'

// season-literal-ok-start: summaries of the 2026-27 NJSIAA rule documents (content, replaced when new documents are published)
export const BOYS_DOCS_2027: DocTab[] = [
  {
    kind: 'doc',
    tabLabel: 'Regular Season Rules',
    title: 'Boys Wrestling Regular Season Rules 2026-27',
    summary: [
      'New: the match limit is back to 30 per wrestler (varsity and sub-varsity, scrimmages included). The 33-match limit was for 2025-26 only. NJSIAA team and individual tournaments don\'t count toward it.',
      'New: a dual-meet event with more than four teams counts as a quad when every team is limited to 3 matches, so a team can still enter another event of more than four teams that week.',
      'A team or wrestler may have at most four weigh-ins a week (Sunday 12:01 am to Saturday midnight), and only one event of more than four teams a week. A weigh-in counts only if the wrestler steps on the mat; a Saturday-Sunday tournament is one weigh-in, in the week it starts.',
      'Elite Events: Beast of the East (DE), Sam Cali (NJ), Powerade (PA), Escape the Rock (PA). A team may enter up to three. They are exempt from the event limits but not the four weigh-ins, they count toward the 30 matches, and a team may use only one wrestler per weight class across all events that day.',
      'No varsity meets during or after district week without NJSIAA approval. JV and freshman wrestlers can\'t compete during district and region weeks or after districts; schools may hold unscored interschool workouts (no officials, no weigh-ins).',
      'A student who transfers after the Competition Start Date is ineligible for the postseason at the new school.',
      'A wrestler previously judged not fit to wrestle needs the NJSIAA skin form signed by an MD, DO, PA or APN after an exam within the last 7 days, at weigh-in.',
      'A flagrant disqualification means a two-match sit-out (it can be served in the same tournament if the team keeps wrestling). A second DQ within 365 days doubles the penalty; 2+ DQs before an NJSIAA tournament bars the wrestler, 3+ bars the team.',
    ],
    qa: [
      { q: 'How many matches can a wrestler have this season?', a: '30, varsity and sub-varsity together, scrimmages included. The 33 allowed in 2025-26 was a one-season exception. Each match over 30 by the cutoff (January 30, 2027) is a loss by disqualification.' },
      { q: 'What changed for big dual-meet events?', a: 'If a dual-meet event with more than four teams limits every team to 3 matches, it counts as a quad. The team can still enter one other event of more than four teams that week.' },
      { q: 'Which tournaments are Elite Events?', a: 'Beast of the East, Sam Cali, Powerade and Escape the Rock. Teams may enter up to three. The weekly event limits don\'t apply, but the four-weigh-ins-a-week cap and the 30-match limit do.' },
      { q: 'What happens if a wrestler transfers mid-season?', a: 'After the Competition Start Date, the wrestler is ineligible for postseason competition at the new school, first transfer or not.' },
      { q: 'Can a school wrestle an out-of-state team?', a: 'Only one that is a member in good standing of its own state association (or an approved affiliate). Club teams are not allowed.' },
      { q: 'Do scrimmage disqualifications count?', a: 'They count toward a wrestler\'s 2-DQ tournament bar but not toward the team\'s 3-DQ bar.' },
    ],
  },
  {
    kind: 'doc',
    tabLabel: 'Team Tournament Regs',
    title: 'Boys Wrestling Regular Season/Team Tournament Regulations 2026-27',
    summary: [
      'New: Power Points now average 80% of a school\'s matches against NJSIAA members (at least 9 count), replacing the best 9 meets.',
      'New: non-public schools the size of public Groups III, IV and V are Non-Public A; all others are Non-Public B.',
      'New: withdrawing after seeding means a fine; after the brackets are official, a fine and a year of probation; withdrawing while on probation bars the team the next year. A no-show forfeits and gets a fine and probation.',
      'New: practices during the 3-day tryout period count toward the 6-days-practice / 1-day-rest rule, and schools get one scrimmage date, December 3, 4 or 5.',
      'To enter, a team needs 9 dual meets against NJSIAA members, and 60% of its duals by the cutoff must be against New Jersey schools. No waivers.',
      'Public: the top 8 in each section and group by Power Points qualify. Non-public: every entrant is seeded by a committee of six public-school administrators (head-to-head, Power Points, strength of schedule, common opponents).',
      'Dates: entries January 5–15; cutoff January 23; Power Points close January 24; seeding January 26. Public rounds 1 & 2 February 1, sectional finals February 3, state semifinals February 5; non-public rounds 1 & 2 February 2, semifinals February 4; all state finals February 7 at Phillipsburg High School.',
      'Team forfeits are scored 84-0.',
    ],
    qa: [
      { q: 'How are Power Points figured now?', a: 'From 80% of a school\'s matches against NJSIAA members, with at least 9 counting. Before 2026-27 they averaged the best 9 meets. The first calculation is about December 26, then every Sunday; the fifth runs the day after the cutoff and a sixth just before seeding.' },
      { q: 'What is Non-Public A vs Non-Public B now?', a: 'Non-public schools with enrollment equal to a public Group III, IV or V school are Non-Public A. All others are Non-Public B.' },
      { q: 'What happens if a team withdraws from the tournament?', a: 'Before seeding: nothing. After seeding: a fine. After the brackets are official: a fine and one year of probation. Withdrawing again while on probation: a fine, a year\'s ban and another year of probation.' },
      { q: 'Does Power Points keep updating during the tournament?', a: 'No. Seeding uses the final regular-season calculation, and the state semifinals use the same numbers plus head-to-head results.' },
    ],
  },
  {
    kind: 'doc',
    tabLabel: 'Individual Tournament Regs',
    title: 'Boys Wrestling Individual Championships 2026-27',
    summary: [
      'New: the district pre-seed chart starts at the district quarterfinals (10 prestige points; district 4th = 15).',
      'New: wild cards must be sent in writing to the Region President by noon Tuesday of district week, signed by the athletic director. A wrestler with 20 or more varsity matches can\'t be wild-carded. A wild card challenges a seed and, if a majority of head coaches agree, takes that spot.',
      'New: district seeding meetings are on Wednesday and may be virtual; if a meeting is held in person, every coach must attend in person.',
      'New: parents may no longer sit on the floor during the finals at Boardwalk Hall.',
      'Districts (32 sites, February 13): 16-man brackets, top 3 advance. Regions (8 sites, February 19–20): top 4 advance. State championships February 25–27, 2027, Boardwalk Hall.',
      'Pre-seed = prestige points (best past NJSIAA finish) + caliber points (best 20 matches this season). A win over a non-member is worth 2 points; a pin adds 1; a forfeit win is 2 with no pin point.',
      'A girl entering the boys districts must be certified in the boys season and can\'t have wrestled girls events.',
      'Entry: $25 per wrestler who weighs in, plus a $175 facility fee per team.',
    ],
    qa: [
      { q: 'When are the individual tournaments?', a: 'Districts February 13, regions February 19–20, and the state championships February 25–27, 2027 at Boardwalk Hall — about two weeks earlier than 2025-26.' },
      { q: 'How does a wild card work now?', a: 'The coach emails the Region President by noon Tuesday of district week with the reason, the weight and the seed being challenged, signed by the athletic director. Wrestlers with 20+ varsity matches aren\'t eligible. If a majority of head coaches vote yes, the wrestler takes that seed; if not, the challenge moves to the next seed down.' },
      { q: 'How are ties in pre-seed broken?', a: 'By total Trackwrestling points (prestige plus best 20 caliber points; district points can count), then winning percentage.' },
      { q: 'How many wrestlers advance?', a: 'The top 3 from each district weight class to regions, and the top 4 from each region to the state championships.' },
    ],
  },
]

export const GIRLS_DOCS_2027: DocTab[] = [
  {
    kind: 'doc',
    tabLabel: 'Regular Season Rules',
    title: 'Girls Wrestling Regular Season Rules 2026-27',
    summary: [
      'The match limit is 30 per wrestler (varsity and sub-varsity, scrimmages included); NJSIAA team and individual tournaments don\'t count toward it.',
      'A team or wrestler may have at most four weigh-ins a week (Sunday 12:01 am to Saturday midnight). Unlike the boys, a girl may wrestle in more than one event of more than four opponents in a week.',
      'Elite Events: Beast of the East (DE) and Escape the Rock (PA), with the boys\' rules: a team may enter up to three, the four-weigh-ins cap and 30-match limit still apply, and one wrestler per weight class per team across all events that day.',
      'Weight classes: 100, 107, 114, 120, 126, 132, 138, 145, 152, 165, 185, 235.',
      'No varsity meets during or after district week without NJSIAA approval. JV and freshman wrestlers can\'t compete during district and region weeks or after districts.',
      'A student who transfers after the Competition Start Date is ineligible for the postseason at the new school.',
      'A wrestler previously judged not fit to wrestle needs the NJSIAA skin form signed by an MD, DO, PA or APN after an exam within the last 7 days, at weigh-in.',
      'A flagrant disqualification means a two-match sit-out. A second DQ within 365 days doubles the penalty; 2+ DQs before an NJSIAA tournament bars the wrestler, 3+ bars the team.',
    ],
    qa: [
      { q: 'How many matches can a girl have this season?', a: '30, varsity and sub-varsity together, scrimmages included. Each match over 30 by the cutoff (January 30, 2027) is a loss by disqualification.' },
      { q: 'Can a girl wrestle in more than one big event a week?', a: 'Yes. The boys are limited to one event of more than four teams a week; girls may enter more than one, within the four weigh-ins.' },
      { q: 'Which girls tournaments are Elite Events?', a: 'Beast of the East and Escape the Rock.' },
      { q: 'What happens if a wrestler transfers mid-season?', a: 'After the Competition Start Date, she is ineligible for postseason competition at the new school.' },
    ],
  },
  {
    kind: 'doc',
    tabLabel: 'Team Tournament Regs',
    title: 'Girls Wrestling Regular Season/Team Tournament Regulations 2026-27',
    summary: [
      'New: schools declare dual-meet team status by December 15. A dual is no longer defined by a minimum number of bouts: declared teams are classified and in Power Points, and every regular-season event they wrestle counts as a dual.',
      'New: forfeits may be taken only in a dual between two teams that have both declared dual-meet status.',
      'New: girls tri-cooperative programs (three schools) are allowed, with a roster limit of 30.',
      'New: one varsity match per wrestler per dual (if a girl wrestles a team more than once in an event, the first match is the varsity one), and at most two wrestlers per team in a varsity tournament bracket. JV matches must be entered in Trackwrestling as JV.',
      'New: the minimum body fat for girls is 19% (NFHS).',
      'One group, two sections (North and South); the top 12 in each section by Power Points qualify. To enter, a team needs 9 duals against NJSIAA members and 60% of its duals against New Jersey schools.',
      'Power Points average the best 9 meets against NJSIAA members (the boys moved to 80% of matches; the girls did not).',
      'Dates: entries January 5–15; cutoff January 23; Power Points close January 24; seeding January 26 (brackets on nj.com January 27). Rounds 1 & 2 February 2, sectional semifinals and finals February 4, state final February 7 at Phillipsburg High School. Team forfeits are scored 72-0.',
    ],
    qa: [
      { q: 'What is dual-meet status?', a: 'Each school declares by December 15 whether it will wrestle dual meets. Declared schools have team status: they are classified, their events count as duals and they are in Power Points. Forfeits can be taken only between two declared teams.' },
      { q: 'How many teams make the state tournament?', a: 'The top 12 in each section (North and South) by Power Points.' },
      { q: 'Can a girl wrestle the same team twice in one event?', a: 'Only one match counts as varsity: the first one. The rest are junior varsity and must be entered as JV.' },
      { q: 'How are girls Power Points figured?', a: 'The average of the best 9 meets against NJSIAA members. The first calculation is about December 26, then every Sunday, with a final one just before seeding.' },
    ],
  },
  {
    kind: 'doc',
    tabLabel: 'Individual Tournament Regs',
    title: 'Girls Wrestling Individual Championships 2026-27',
    summary: [
      'New: the district pre-seed chart starts at the district quarterfinals.',
      'New: wild cards must be emailed to the Region President by noon Tuesday of district week, signed by the athletic director, and a wrestler with 15 or more varsity matches can\'t be wild-carded.',
      'Districts (12 sites, February 14): 32-wrestler brackets with wrestlebacks from the quarterfinals to 6th place; top 4 advance. The 2026-27 girls district alignment is released in January.',
      'Regions (4 sites, February 21): 12 seeds per weight; top 4 advance. State championships February 25–27, 2027, Boardwalk Hall.',
      'Pre-seed uses Trackwrestling points from a wrestler\'s best 15 matches (prestige points plus caliber points).',
      'A girl in the girls districts must be certified in the girls season and can\'t have wrestled boys or boys events.',
      'Entry: $25 per wrestler who weighs in, plus a facility fee set by the NJSIAA. District seeding meetings are on Thursday of district week.',
    ],
    qa: [
      { q: 'When are the girls individual tournaments?', a: 'Districts February 14, regions February 21 and the state championships February 25–27, 2027 at Boardwalk Hall.' },
      { q: 'How many girls advance?', a: 'The top 4 from each district weight class to regions, and the top 4 from each region to the state championships.' },
      { q: 'Who can be wild-carded?', a: 'Only a wrestler with fewer than 15 varsity matches this season (the boys limit is 20). The request goes to the Region President by email by noon Tuesday of district week, signed by the athletic director.' },
      { q: 'Can a girl wrestle in both the boys and girls postseason?', a: 'No. She is certified in one season; girls certified in the girls season can\'t wrestle boys or boys events, and the reverse.' },
    ],
  },
]
// season-literal-ok-end

/** The side's rule documents for a season (by ending year), when summarized; otherwise the page's own (boys 2025-26). */
export function njsiaaDocs(side: 'boys' | 'girls', seasonEnd: number): DocTab[] | undefined {
  if (seasonEnd === 2027) return side === 'girls' ? GIRLS_DOCS_2027 : BOYS_DOCS_2027   // season-literal-ok: the 2026-27 documents above
  return undefined
}
