'use client'

import { useState } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

export type CalendarRow = {
  id: number
  season_label: string
  event_date: string
  event_date_end: string | null
  event_time: string | null
  event_category: string
  event_type: string | null
  gender: string | null
  label: string
  notes: string | null
}

type QA      = { q: string; a: string }
type Bullet  = string

type DocTab = {
  kind: 'doc'
  tabLabel: string
  title: string
  url: string
  summary: Bullet[]
  qa: QA[]
}

// ── Calendar helpers ──────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  preseason:              'Pre-Season & Season Start',
  weight:                 'Weight Allowances',
  team_entry:             'Team Tournament Entry & Rankings',
  team_public_boys:       'Boys Public Team Tournament',
  team_np_boys:           'Boys Non-Public Team Tournament',
  team_girls:             'Girls Team Tournament',
  individual_boys:        'Individual Tournament — Boys',
  individual_girls:       'Individual Tournament — Girls',
  state_individual_detail:'State Individual Championships (Boardwalk Hall)',
  state_team:             'State Team Championships',
  administrative:         'Administrative / Policy',
}

const CATEGORY_ORDER = Object.keys(CATEGORY_LABELS)

function fmtDate(dateStr: string, endDateStr: string | null, time: string | null): string {
  const d = new Date(dateStr + 'T12:00:00')
  const opts: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }
  const start = d.toLocaleDateString('en-US', opts)
  if (endDateStr) {
    const e = new Date(endDateStr + 'T12:00:00')
    const sameMonth = d.getMonth() === e.getMonth() && d.getFullYear() === e.getFullYear()
    const end = sameMonth
      ? e.toLocaleDateString('en-US', { day: 'numeric', timeZone: 'UTC' })
      : e.toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: 'UTC' })
    const startShort = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: 'UTC' })
    return `${startShort}–${end}, ${d.getFullYear()}`
  }
  return time ? `${start} · ${time}` : start
}

function fmtDayHeader(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  })
}

function CalendarSection({ category, rows }: { category: string; rows: CalendarRow[] }) {
  // Group by date; use compact time-based layout when multiple rows share a date
  const dateMap = new Map<string, CalendarRow[]>()
  for (const row of rows) {
    if (!dateMap.has(row.event_date)) dateMap.set(row.event_date, [])
    dateMap.get(row.event_date)!.push(row)
  }
  const useGrouped = [...dateMap.values()].some(g => g.length > 1 && g.some(r => r.event_time))

  return (
    <div>
      <div className="px-4 py-2 bg-slate-900 text-white text-[10px] font-bold uppercase tracking-widest">
        {CATEGORY_LABELS[category] ?? category}
      </div>
      {useGrouped
        ? [...dateMap.entries()].map(([date, dateRows]) => (
            <div key={date}>
              <div className="px-4 py-1.5 bg-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wide border-t border-slate-200">
                {fmtDayHeader(date)}
              </div>
              {dateRows.map((row, i) => (
                <div
                  key={row.id}
                  className={`flex items-start gap-3 px-4 py-2 border-t border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}
                >
                  <div className="w-24 shrink-0 text-right">
                    <span className="text-xs text-slate-400 tabular-nums whitespace-nowrap">{row.event_time ?? ''}</span>
                  </div>
                  <div className="flex-1">
                    <span className="text-sm text-slate-800">{row.label}</span>
                    {row.notes && <span className="ml-2 text-xs text-slate-400">{row.notes}</span>}
                  </div>
                </div>
              ))}
            </div>
          ))
        : rows.map((row, i) => (
            <div
              key={row.id}
              className={`flex items-start gap-3 px-4 py-2.5 border-t border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}
            >
              <div className="flex-1">
                <span className="text-sm text-slate-800">{row.label}</span>
                {row.notes && (
                  <span className="ml-2 text-xs text-slate-400">{row.notes}</span>
                )}
              </div>
              <div className="text-right shrink-0">
                <span className="text-sm text-slate-600 whitespace-nowrap tabular-nums">
                  {fmtDate(row.event_date, row.event_date_end, row.event_time)}
                </span>
              </div>
            </div>
          ))
      }
    </div>
  )
}

// ── Doc content (season-agnostic for now) ─────────────────────────────────────

const DOC_TABS: DocTab[] = [
  {
    kind: 'doc',
    tabLabel: 'Regular Season Rules',
    title: 'Boys Wrestling Regular Season Rules 2025-26',
    url: 'https://www.njsiaa.org/sites/default/files/documents/2025-09/boys-wrestling-regular-season-rules-2025-26.pdf',
    summary: [
      'Wrestler match cap is 33 for 2025-26 only (approved 9/17/25). A forfeit only counts if the wrestler appeared on the mat to accept it.',
      'Weekly weigh-in cap: max 4 per wrestler per week. A "week" runs 12:01 AM Sunday through Saturday midnight — not a rolling 7-day window. A 2-day tournament with a weigh-in each day still counts as one weigh-in, credited to the week it started.',
      'Elite Events (boys-only, named annually) are exempt from the one-event-per-week and max-4-teams restrictions, but the 4-weigh-ins/week cap still applies. 2025-26 Elite Events: Beast of the East (DE), Sam Cali Tournament (NJ), Powerade Tournament (PA), Escape the Rock (PA). Teams may enter up to 3 per season; only one wrestler per weight class per team per day across all events.',
      'Transfer eligibility: a student who transfers after the NJSIAA Competition Start Date is ineligible for postseason championship competition at the new school — no exceptions.',
      'Boys weight classes: 106, 113, 120, 126, 132, 138, 144, 150, 157, 165, 175, 190, 215, 285.',
      'Skin/contagious disease clearance must be signed by an MD/DO/PA/APN within the 7 days immediately before that weigh-in — not a one-time season clearance.',
      'DQ tracking uses a rolling 365-day window. A 2nd DQ within 365 days of the first doubles the penalty. Wrestling-specific carve-out: a flagrant DQ in a tournament is a 2-match sit-out (vs. the general 2-meet rule) and can be served within the same tournament. 2+ individual DQs before a tournament → wrestler barred. 3+ team DQs before a tournament → team barred, even if already seeded. Scrimmage DQs count toward an individual\'s 2-DQ bar but not the 3-DQ team bar.',
      'Out-of-state opponents must be members in good standing of their own state association. No competition with club teams or post-high-school participants beyond their first year post-graduation. One varsity team per school — no A/B varsity teams.',
    ],
    qa: [
      { q: 'How many matches can a wrestler compete in this season?', a: '33, but only for 2025-26 — a one-time bump approved 9/17/25.' },
      { q: 'Does a forfeit count as one of a wrestler\'s matches?', a: 'Only if the wrestler showed up and stepped on the mat to accept it. A forfeit where nobody weighed in for that slot doesn\'t count against anyone\'s total.' },
      { q: 'How many times can a wrestler weigh in during a single week?', a: 'Four times max. A "week" runs from 12:01 AM Sunday through Saturday midnight — not a rolling 7-day window.' },
      { q: 'If a tournament runs Saturday and Sunday, does that count as two weigh-ins?', a: 'No — a two-day tournament with a weigh-in each day counts as one weigh-in, credited to the week in which it started (i.e., Saturday\'s week), and it does not spill into the following week\'s count.' },
      { q: 'What are "Elite Events" and do they work differently from a normal tournament?', a: 'They\'re a named annual list of marquee national/regional tournaments (this year: Beast of the East, Sam Cali, Powerade, Escape the Rock). Teams can enter up to 3 per season. Normal restrictions on max-4-teams-per-week don\'t apply to them, but the 4-weigh-ins/week cap still does, and only one wrestler per weight class per team may compete across any events on the same day.' },
      { q: 'Can a team\'s whole roster wrestle in an Elite Event without limit?', a: 'Yes in terms of number of wrestlers, but a specific weight class is capped at one entrant per team per day — if two 285-pounders exist on the roster, only one can compete anywhere that day.' },
      { q: 'What happens if a wrestler transfers mid-season?', a: 'If the transfer happens after the season\'s Competition Start Date, that wrestler is ineligible for postseason championship competition at the new school — no exceptions for whether it\'s a first-ever transfer.' },
      { q: 'How long is a skin-lesion clearance valid?', a: 'The clearance exam must have occurred within the 7 days immediately before that weigh-in. It\'s not a one-time season clearance — it has to be current relative to each event where it\'s required.' },
      { q: 'What\'s the actual penalty for a flagrant disqualification in wrestling?', a: 'A 2-match sit-out, which is a wrestling-specific modification of the general NJSIAA rule (which is normally 2 meets, not 2 matches). The wrestler can serve out the two-match penalty within the same tournament, provided the team keeps competing in scheduled events.' },
      { q: 'Does a disqualification "reset" between seasons?', a: 'Not immediately — DQs count on a rolling 365-day window from the date of the first offense, not a fixed season boundary. A second DQ within that 365-day window doubles the standard penalty.' },
      { q: 'What happens if a wrestler or team hits the disqualification threshold right before a tournament?', a: 'An individual with 2+ DQs in the current season before the tournament starts is barred from competing in it. A team with 3+ player/coach DQs before the tournament starts is barred entirely — even if already seeded, it forfeits its spot.' },
      { q: 'Do scrimmage disqualifications count the same as regular-season ones?', a: 'Partially. They don\'t count toward the 3-DQ team bar from tournaments, but they do count toward an individual wrestler\'s 2-DQ tournament bar.' },
      { q: 'Can a school field more than one varsity wrestling team?', a: 'No — one varsity team per school. "A" and "B" varsity teams aren\'t permitted in any sport.' },
      { q: 'Can an NJSIAA school scrimmage or compete against an out-of-state team freely?', a: 'Only if that out-of-state school is a member in good standing of its own state\'s high school athletic association (or an approved affiliate) — not just any out-of-state program.' },
      { q: 'What are the official boys weight classes for 2025-26?', a: '106, 113, 120, 126, 132, 138, 144, 150, 157, 165, 175, 190, 215, 285.' },
    ],
  },
  {
    kind: 'doc',
    tabLabel: 'Team Tournament Regs',
    title: 'Boys Wrestling Regular Season/Team Tournament Regulations 2025-26',
    url: 'https://www.njsiaa.org/sites/default/files/documents/2025-11/wrestling-boys-team-regs-2025-26.pdf',
    summary: [
      'Public schools are seeded by the deterministic Power Points formula. Non-public schools are seeded by a 6-person committee of public school administrators using stated-but-open-ended criteria (head-to-head, Power Points, strength of schedule, common opponents, "but not limited to") — no formula to replicate on the non-public side.',
      'Preseason Power Ranking is not a separate system — it\'s the starting value the regular-season Power Points calculation begins from. Built from last year\'s returning district placers (weighted by district strength coefficient: 1.0 + 0.1 per team in that district that ended last season ≥ 25.00 Power Points) plus a 3-season average of the team\'s season-ending Power Points. Top 15 teams per section: 32.00 down to 25.0 in 0.50 steps. Everyone else: flat 23.0.',
      'Bracket structure (public schools): Round 1 — #1 vs #8, #4 vs #5 hosted by #1; #2 vs #7, #3 vs #6 hosted by #2. Round 2 — (1/8 winner) vs (4/5 winner) hosted by #1; (3/6 winner) vs (2/7 winner) hosted by #2. Sectional Final — hosted by the higher remaining seed.',
      'Power Points freeze after sectional seeding. The state semifinal seeding uses the same snapshot from sectionals plus head-to-head results layered on top — no recalculation after the sectional round.',
      'Team tournament weigh-in cap: up to 3 wrestlers per weight class per day — different from the regular-season 4-per-week limit.',
      'Paperwork penalty: 1 team point deducted if the Trackwrestling weigh-in sheet or descent plan is missing at mat side.',
      'Flagrant DQ "event" counting: dual meet = 1 event, tri-meet = 2 events, quad meet = 3 events, dual-meet-formatted tournament = however many actual duals wrestled, individual tournament = 1 event regardless of bouts guaranteed.',
      'Ineligible wrestler penalty: automatic 6-point team score swing — offending team\'s score reduced, opponent credited a 6-point win.',
    ],
    qa: [
      { q: 'Are public and non-public schools seeded the same way?', a: 'No. Public schools use the deterministic Power Points formula with an explicit tiebreak/seed-jump procedure. Non-public schools are seeded by a 6-person committee of public school administrators using a stated-but-open-ended list of criteria. There\'s no formula to replicate on the non-public side — it\'s a human judgment call by design.' },
      { q: 'What\'s the difference between Preseason Power Ranking and the regular Power Points system?', a: 'They\'re not separate systems — Preseason Power Ranking is literally the starting value the regular-season Power Points calculation begins from. It\'s built from last year\'s returning district placers (weighted by district strength) plus a 3-season average of the team\'s season-ending Power Points. The top 15 teams per section get a calculated starting value from 32.00 down to 25.0; everyone else starts at a flat 23.0.' },
      { q: 'Does Power Points keep updating once the team tournament starts?', a: 'No — it freezes. Sectional seeding uses the last regular-season Power Points calculation, and the semifinal seeding explicitly does not recalculate Power Points after the sectional round completes; it just adds head-to-head results on top of the same frozen numbers.' },
      { q: 'How many wrestlers can weigh in at one weight class during the team tournament?', a: 'Up to 3 per weight class per day — a different, tournament-specific cap from the 4-weigh-ins-per-week limit that governs the regular season.' },
      { q: 'What happens if a team forgets to bring its weigh-in sheet or descent plan to the mat?', a: 'A 1-point team score deduction, automatically. If a team\'s final score comes in 1 point lower than the raw match results would suggest, this is a plausible, named explanation rather than a scoring error.' },
      { q: 'If a wrestler is disqualified and has to sit out 2 "events," does a tri-meet count as 1 event or 2?', a: '2. A tri-meet consumes two of the two allotted events in a single outing, since it functions as two separate dual matchups. A quad-meet consumes three. A dual-meet-formatted tournament consumes however many actual duals were wrestled in it. An individual tournament, regardless of how many bouts a wrestler is guaranteed, only ever counts as 1 event.' },
      { q: 'What\'s the actual penalty if a team uses an ineligible wrestler?', a: 'A fixed 6-point team score swing — the offending team\'s score is reduced and the opponent is credited a 6-point win, in addition to Trackwrestling record adjustments, disqualification reporting, and forfeiture of any tournament awards if it happened in a scored event.' },
      { q: 'What\'s the actual bracket pairing structure for the public school team tournament?', a: 'Round 1 is #1 vs #8 and #4 vs #5 (hosted by #1), plus #2 vs #7 and #3 vs #6 (hosted by #2). Round 2 crosses the winners: (1/8 winner) vs (4/5 winner) hosted by #1, and (3/6 winner) vs (2/7 winner) hosted by #2. The Sectional Final is hosted by whichever of the two round-2 winners has the higher seed. It\'s a fully fixed structure.' },
    ],
  },
  {
    kind: 'doc',
    tabLabel: 'Individual Tournament Regs',
    title: 'Boys Wrestling Individual Tournament Regulations 2025-26',
    url: 'https://www.njsiaa.org/sites/default/files/documents/2025-11/wrestling-boys-individual-regs-2025-26.pdf',
    summary: [
      'District Pre-Seed = Prestige Points + Caliber Points. Prestige Points are a fixed one-time lookup based on best prior NJSIAA tournament finish (State Champ = 125, 2nd = 115, 3rd = 110, down to 0 for never placed). Caliber Points are earned this season from a wrestler\'s best 20 matches.',
      'Caliber Point rules: win over a non-NJSIAA-member = flat 2 pts. Pin adds +1 (not for major decision, tech fall, DQ, or forfeit). A decision loss to a previously seeded/tournament opponent earns 20% of that opponent\'s Caliber value. A loss to a non-regional competitor from a previous tournament = −1 pt. Forfeit win = 2 pts, no pin bonus.',
      'Tie-break at pre-seed: first eliminate artificial loss cycles (A beat B, B beat C, C beat A → discard one loss per cycle using the earliest result), then head-to-head → common opponents (win/loss only) → "three best wins" by coach vote.',
      'Region and State seeding uses a different non-formulaic method: three ranked qualitative criteria (own advancement, defeated a seeded wrestler, defeated a prior participant) with raw Trackwrestling total points (not win %) as the numeric tiebreaker.',
      'Replacement eligibility: Districts — any eligible alternate before that weight class\'s weigh-in period ends. Regions — must have competed in district finals/consolations (1st–4th) unless injured. States — must have competed in region finals/consolations (1st–6th) unless injured; appeal deadline noon Wednesday, late withdrawals (before 8 PM Wed.) still trigger a reseed.',
      'Appeal/unfair-seed deadlines: noon Friday (districts) → noon Thursday (regions) → noon Wednesday (states).',
      'Medical forfeit at District/Region level is explicitly scored as a loss for seeding purposes at the next level up — distinct from a standard competitive loss.',
      'A bye only happens in the first round (round of 16) when there aren\'t 16 entrants. It is not the same as a forfeit.',
      'Entry fee: $25/wrestler who weighs in. District facility fee: $175/team. Independent athletes: max 4 boys per school. District entry deadline: 8:00 PM Monday of district week via Trackwrestling.',
      'State bracket: 32 wrestlers per weight class; medals to top 8. Districts advance top 3; Regions advance top 4.',
      'State tournament weight allowance rises 1 lb per day across the 3-day event (March 12–14, 2026) — distinct from regular-season allowances.',
      'New for 2025-26: girls entered in the boys Trackwrestling season cannot also wrestle in girls events (either/or). Virtual weigh-ins are banned entirely.',
    ],
    qa: [
      { q: 'How is a wrestler\'s district seed actually calculated?', a: 'Prestige Points (a fixed value based on their best prior NJSIAA tournament finish) plus Caliber Points (earned this season from their best 20 matches, with bonuses/penalties for pins, wins over non-member opponents, close losses to strong opponents, and losses to non-regional competitors). The two numbers are added into one Pre-Seed value.' },
      { q: 'Does beating a team that\'s not in the NJSIAA count for anything?', a: 'Yes, but at a flat, uncalibrated rate — exactly 2 Caliber Points regardless of how good that non-member opponent actually is. Compare that to an in-conference win, where the value depends on the beaten wrestler\'s own seeding weight.' },
      { q: 'If I lose to a really good wrestler, does that hurt my seeding as much as any other loss?', a: 'No — losing by decision to a wrestler who is themselves seeded/previously in the tournament earns you 20% of their Caliber value. It\'s designed to reward a competitive loss against strong competition, not just penalize any loss equally.' },
      { q: 'What\'s the actual process when two wrestlers are tied after Pre-Seed?', a: 'First, the committee eliminates artificial "loss cycles" — if A beat B, B beat C, and C beat A, one of those three losses gets thrown out before anyone starts arguing head-to-head, using the earliest result if multiple such cycles overlap. Only after that cleanup does the actual head-to-head discussion and vote happen, starting from the best pre-seed and working down.' },
      { q: 'Is the Region/State seeding formula the same as the District one?', a: 'No. Districts use the explicit Prestige+Caliber point formula. Regions and States instead use three ranked qualitative tiers (prior tournament advancement, beating a seeded wrestler, beating a past participant) with raw Trackwrestling points — not win percentage — as the numeric tiebreaker. Don\'t assume the district formula scales upward.' },
      { q: 'What happens if the top seed can\'t compete after brackets are set?', a: 'Depends on the level and timing. At districts, any eligible alternate can step in before that weight class\'s weigh-in closes, followed by a mandatory reseed. At regions, only a wrestler who actually competed in that district\'s finals or consolations (1st–4th place) is eligible to replace — unless the original wrestler was injured. At states, the replacement must have competed in region finals/consolations (1st–6th place), with a hard appeal deadline of noon Wednesday, though a withdrawal up to 8 PM Wednesday still triggers a reseed.' },
      { q: 'What if nobody eligible is available to replace a wrestler who can\'t make weight at States?', a: 'No reseed happens after the initial weigh-in period. If there\'s a legal replacement from that region, they step in. If it\'s past 8 PM Wednesday and there\'s no eligible replacement, the remaining wrestlers move up in the bracket and the forfeit is awarded to the highest remaining seed.' },
      { q: 'Is a bye the same as a forfeit?', a: 'No. A bye only happens in the very first round (round of 16) when there simply aren\'t 16 real entrants to fill the bracket. A forfeit happens when a scheduled opponent doesn\'t show up to an actual matchup. They\'re tracked and treated differently.' },
      { q: 'If a wrestler medically forfeits at Districts, does that count as a real loss?', a: 'For seeding purposes at the next level (Regions), yes — it\'s explicitly scored as a loss. But the rule specifically frames this as "for seeding purposes only," implying it may not be treated identically to a standard competitive loss elsewhere (e.g., in a personal win-loss record).' },
      { q: 'How much does it cost to enter the district tournament?', a: '$25 per wrestler who weighs in — whether or not they end up competing — plus a $175 facility fee per team (a "team" being defined as two or more entered athletes). The $25 figure is new this year (an increase from the prior season).' },
      { q: 'How many Independent Athletes can one school enter?', a: 'Up to 4 boys per school. They must be accompanied by a certified faculty chaperone or approved coach at all times, cannot check in with a parent, and are disqualified outright if unaccompanied.' },
      { q: 'What\'s a "Wild Card" and when does it get used?', a: 'It\'s a coach-voted exception process, discussed and decided collectively before seeding begins for the day — covering situations like a wrestler moving up multiple weight classes from their season-low weight, or someone changing weight classes after the seeding meeting already happened. Once the vote is taken, the decision is final and the topic can\'t be revisited.' },
      { q: 'How many wrestlers get seeded into the State Tournament bracket, and how many get medals?', a: '32 wrestlers per weight class are seeded into the bracket. Medals go to the top 8 finishers.' },
      { q: 'Why does the "weight allowance" number go up every day at States?', a: 'The state tournament runs three days, and the effective weight-class ceiling is designed to rise by 1 lb each day of competition (Thursday, Friday, Saturday) to account for the physical toll of a multi-day event — separate from the regular-season allowances covered in the Regular Season Rules document.' },
      { q: 'Can a girl who wrestles in the boys\' season also compete in girls\' district tournaments?', a: 'No — this is new for 2025-26. A girl entered in the boys Trackwrestling season cannot also enter or wrestle in girls events, and vice versa. It\'s an either/or based on which season she\'s certified in.' },
      { q: 'Are virtual weigh-ins allowed this year?', a: 'No — they\'ve been banned entirely for 2025-26, a change from prior seasons.' },
    ],
  },
]

// ── Collapsible ───────────────────────────────────────────────────────────────

function Collapsible({
  label, open, onToggle, children,
}: {
  label: string; open: boolean; onToggle: () => void; children: React.ReactNode
}) {
  return (
    <div className="border border-slate-200 rounded-none overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-3.5 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
      >
        <span className="font-semibold text-slate-800 text-sm tracking-wide uppercase">{label}</span>
        <span className="text-slate-400 text-lg leading-none select-none">{open ? '−' : '+'}</span>
      </button>
      {open && <div className="px-5 py-4 bg-white">{children}</div>}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function AboutClient({ calendarRows, dbError, rowCount }: { calendarRows: CalendarRow[]; dbError?: string | null; rowCount?: number }) {
  const [activeTopTab, setActiveTopTab] = useState<'matwhizzer' | 'njsiaa'>('njsiaa')
  const [activeDoc, setActiveDoc]       = useState(0)  // 0 = dates, 1-3 = doc tabs
  const [summaryOpen, setSummaryOpen]   = useState([false, false, false])
  const [qaOpen,      setQaOpen]        = useState([true,  true,  true])

  function toggleSummary(i: number) {
    setSummaryOpen(prev => prev.map((v, idx) => idx === i ? !v : v))
  }
  function toggleQa(i: number) {
    setQaOpen(prev => prev.map((v, idx) => idx === i ? !v : v))
  }

  // Group calendar rows by category, in defined display order
  const byCategory = new Map<string, CalendarRow[]>()
  for (const row of calendarRows) {
    if (!byCategory.has(row.event_category)) byCategory.set(row.event_category, [])
    byCategory.get(row.event_category)!.push(row)
  }
  const seasonLabel = calendarRows[0]?.season_label ?? ''
  const docTab = activeDoc > 0 ? DOC_TABS[activeDoc - 1] : null

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">About</h1>

      {/* Top-level tabs */}
      <div className="flex border-b border-slate-200 mb-8">
        {(['matwhizzer', 'njsiaa'] as const).map(t => (
          <button
            key={t}
            onClick={() => setActiveTopTab(t)}
            className={`px-5 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
              activeTopTab === t
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            {t === 'matwhizzer' ? 'Mat Whizzer' : 'NJSIAA'}
          </button>
        ))}
      </div>

      {activeTopTab === 'matwhizzer' && (
        <div className="text-slate-400 text-sm">Coming soon.</div>
      )}

      {activeTopTab === 'njsiaa' && (
        <div>
          {/* Sub-tabs */}
          <div className="flex flex-wrap gap-2 mb-6">
            {['Important Dates', 'Regular Season Rules', 'Team Tournament Regs', 'Individual Tournament Regs'].map((label, i) => (
              <button
                key={i}
                onClick={() => setActiveDoc(i)}
                className={`px-4 py-1.5 text-xs font-semibold border transition-colors rounded-none ${
                  activeDoc === i
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-600 border-slate-300 hover:border-slate-500 hover:text-slate-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Important Dates tab — DB-driven, categorized, season-specific */}
          {activeDoc === 0 && (
            <div>
              {(dbError || rowCount === 0) && (
                <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 text-xs text-red-700 rounded">
                  {dbError ? `DB error: ${dbError}` : 'No rows returned for the live season'}
                </div>
              )}
              {seasonLabel && (
                <p className="text-xs text-slate-400 mb-3">
                  NJSIAA Boys Wrestling {seasonLabel} season
                </p>
              )}
              <div className="border border-slate-200 rounded-none overflow-hidden divide-y divide-slate-200">
                {CATEGORY_ORDER.map(cat => {
                  const rows = byCategory.get(cat)
                  if (!rows?.length) return null
                  return <CalendarSection key={cat} category={cat} rows={rows} />
                })}
                {calendarRows.length === 0 && (
                  <div className="px-4 py-8 text-center text-slate-400 text-sm">No calendar data for this season.</div>
                )}
              </div>
            </div>
          )}

          {/* Doc tabs (Regular Season, Team, Individual) */}
          {docTab && (
            <div>
              <div className="mb-5">
                <h2 className="text-lg font-bold text-slate-900 mb-1">{docTab.title}</h2>
                <a
                  href={docTab.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                  </svg>
                  View NJSIAA PDF
                </a>
              </div>

              <div className="space-y-3">
                <Collapsible
                  label="Summary"
                  open={summaryOpen[activeDoc - 1]}
                  onToggle={() => toggleSummary(activeDoc - 1)}
                >
                  <ul className="space-y-3">
                    {docTab.summary.map((b, i) => (
                      <li key={i} className="flex gap-3 text-sm text-slate-700 leading-relaxed">
                        <span className="text-slate-300 mt-0.5 shrink-0">•</span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </Collapsible>

                <Collapsible
                  label="Q&A"
                  open={qaOpen[activeDoc - 1]}
                  onToggle={() => toggleQa(activeDoc - 1)}
                >
                  <div className="space-y-5">
                    {docTab.qa.map((item, i) => (
                      <div key={i}>
                        <p className="text-sm font-semibold text-slate-800 mb-1">Q: {item.q}</p>
                        <p className="text-sm text-slate-600 leading-relaxed">A: {item.a}</p>
                      </div>
                    ))}
                  </div>
                </Collapsible>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
