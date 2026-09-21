'use client'

import Link from 'next/link'
import { useState } from 'react'
import type { GroupBracket, SeedEntry, MeetResult, LeaderStats, LeaderEntry } from './page'

// ── Result helpers ────────────────────────────────────────────────────────────

function findResult(
  results: MeetResult[],
  a: SeedEntry | null | undefined,
  b: SeedEntry | null | undefined,
): MeetResult | null {
  if (!a?.schoolId || !b?.schoolId) return null
  return results.find(m =>
    (m.team1SchoolId === a.schoolId && m.team2SchoolId === b.schoolId) ||
    (m.team1SchoolId === b.schoolId && m.team2SchoolId === a.schoolId),
  ) ?? null
}

function winnerSid(m: MeetResult | null): number | null {
  if (!m || m.team1Score == null || m.team2Score == null) return null
  if (m.team1Score > m.team2Score) return m.team1SchoolId
  if (m.team2Score > m.team1Score) return m.team2SchoolId
  return m.tiebreakerWinnerId ?? null
}

function scoreFor(m: MeetResult | null, sid: number | null | undefined): number | null {
  if (!m || sid == null) return null
  if (m.team1SchoolId === sid) return m.team1Score
  if (m.team2SchoolId === sid) return m.team2Score
  return null
}

function advance(
  m: MeetResult | null,
  a: SeedEntry | null | undefined,
  b: SeedEntry | null | undefined,
  bySid: Map<number, SeedEntry>,
): SeedEntry | null {
  const wid = winnerSid(m)
  if (!wid) return null
  return bySid.get(wid) ?? null
}

// Build bySid map from any collection of SeedEntry arrays
function buildBySid(seedGroups: SeedEntry[][]): Map<number, SeedEntry> {
  const map = new Map<number, SeedEntry>()
  for (const group of seedGroups)
    for (const s of group)
      if (s.schoolId != null) map.set(s.schoolId, s)
  return map
}

// ── Common components ─────────────────────────────────────────────────────────

function seedBadge(seed: number) {
  if (seed === 1) return 'bg-yellow-100 text-yellow-700'
  if (seed <= 3) return 'bg-blue-100 text-blue-700'
  return 'bg-slate-100 text-slate-600'
}

function TeamSlot({
  entry, score, isWinner,
}: {
  entry: SeedEntry | null | undefined
  score?: number | null
  isWinner?: boolean
}) {
  if (!entry) {
    return (
      <div className="flex items-center gap-2 px-3 py-2">
        <span className="w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center bg-slate-100 text-slate-400 shrink-0">—</span>
        <span className="text-xs text-slate-400 flex-1">TBD</span>
        <span className="text-xs text-slate-200 tabular-nums shrink-0">—</span>
      </div>
    )
  }
  return (
    <div className={`flex items-center gap-2 px-3 py-2 ${isWinner ? 'bg-slate-50' : ''}`}>
      <span className={`w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center shrink-0 ${seedBadge(entry.seed)}`}>
        {entry.seed}
      </span>
      {entry.logo && <img src={entry.logo} alt="" className="w-4 h-4 object-contain shrink-0" />}
      <span className={`text-xs flex-1 truncate ${isWinner ? 'font-bold text-slate-900' : 'font-medium text-slate-800'}`}>
        {entry.name ?? 'TBD'}
      </span>
      {score != null
        ? <span className={`text-xs tabular-nums shrink-0 ${isWinner ? 'font-bold text-slate-900' : 'text-slate-500'}`}>{score}</span>
        : <span className="text-xs tabular-nums text-slate-300 shrink-0">—</span>
      }
    </div>
  )
}

function MatchupCard({
  a, b, label, meet,
}: {
  a: SeedEntry | null | undefined
  b: SeedEntry | null | undefined
  label?: string
  meet: MeetResult | null
}) {
  const wid = winnerSid(meet)
  const inner = (
    <div className={`rounded-lg border bg-white overflow-hidden shadow-sm transition-colors ${
      meet ? 'border-slate-300 hover:border-blue-400 hover:shadow' : 'border-slate-200'
    }`}>
      {label && (
        <div className="px-3 py-0.5 bg-slate-50 border-b border-slate-100 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
          {label}
        </div>
      )}
      <TeamSlot entry={a} score={scoreFor(meet, a?.schoolId)} isWinner={!!(meet && wid === a?.schoolId)} />
      <div className="border-t border-slate-100 mx-3" />
      <TeamSlot entry={b} score={scoreFor(meet, b?.schoolId)} isWinner={!!(meet && wid === b?.schoolId)} />
    </div>
  )
  return meet?.meetId
    ? <Link href={`/meets/${meet.meetId}`} className="block">{inner}</Link>
    : inner
}

function ChampionBox({
  champion, meet, teamA, teamB, label,
}: {
  champion: SeedEntry
  meet: MeetResult | null
  teamA: SeedEntry | null | undefined
  teamB: SeedEntry | null | undefined
  label: string
}) {
  const wid = winnerSid(meet)
  const box = (
    <div className="rounded-lg border-2 border-yellow-300 overflow-hidden">
      <div className="bg-white">
        <TeamSlot entry={teamA} score={scoreFor(meet, teamA?.schoolId)} isWinner={!!(meet && wid === teamA?.schoolId)} />
        <div className="border-t border-slate-100 mx-3" />
        <TeamSlot entry={teamB} score={scoreFor(meet, teamB?.schoolId)} isWinner={!!(meet && wid === teamB?.schoolId)} />
      </div>
      <div className="bg-yellow-50 px-3 py-1.5 flex items-center gap-2 border-t border-yellow-200">
        {champion.logo && <img src={champion.logo} alt="" className="w-4 h-4 object-contain shrink-0" />}
        <span className="text-[10px] font-bold text-yellow-800 truncate flex-1">{champion.name}</span>
        <span className="text-[9px] text-yellow-600 font-bold uppercase tracking-wide shrink-0">{label}</span>
      </div>
    </div>
  )
  return meet?.meetId
    ? <Link href={`/meets/${meet.meetId}`} className="block">{box}</Link>
    : box
}

function BracketConnector({ pairs }: { pairs: number }) {
  return (
    <div className="flex flex-col w-5 shrink-0">
      {Array.from({ length: pairs }).map((_, i) => (
        <div key={i} className="flex-1 flex flex-col">
          <div className="flex-1 border-r-2 border-b-2 border-slate-200 rounded-br-sm" />
          <div className="flex-1 border-r-2 border-t-2 border-slate-200 rounded-tr-sm" />
        </div>
      ))}
    </div>
  )
}

// ── Public 8-team bracket ─────────────────────────────────────────────────────

// Public bracket R1 groupings: 1/8 & 4/5 at seed-1 site; 3/6 & 2/7 at seed-2 site
// R2: W(1/8) vs W(4/5); W(3/6) vs W(2/7) — same day
// Sectional Final: R2 winners — Feb 18

function computePublicBracket(seeds: SeedEntry[], meetResults: MeetResult[]) {
  const byNum = new Map(seeds.map(s => [s.seed, s]))
  const bySid = buildBySid([seeds])
  const s = (n: number) => byNum.get(n) ?? null

  const m1v8 = findResult(meetResults, s(1), s(8))
  const m4v5 = findResult(meetResults, s(4), s(5))
  const m3v6 = findResult(meetResults, s(3), s(6))
  const m2v7 = findResult(meetResults, s(2), s(7))

  const w1v8 = advance(m1v8, s(1), s(8), bySid)
  const w4v5 = advance(m4v5, s(4), s(5), bySid)
  const w3v6 = advance(m3v6, s(3), s(6), bySid)
  const w2v7 = advance(m2v7, s(2), s(7), bySid)

  const mR2a = findResult(meetResults, w1v8, w4v5)
  const mR2b = findResult(meetResults, w3v6, w2v7)

  const wR2a = advance(mR2a, w1v8, w4v5, bySid)
  const wR2b = advance(mR2b, w3v6, w2v7, bySid)

  const mFinal = findResult(meetResults, wR2a, wR2b)
  const champion = advance(mFinal, wR2a, wR2b, bySid)

  return { s, m1v8, m4v5, m3v6, m2v7, w1v8, w4v5, w3v6, w2v7, mR2a, mR2b, wR2a, wR2b, mFinal, champion }
}

function Bracket8({ seeds, meetResults }: { seeds: SeedEntry[]; meetResults: MeetResult[] }) {
  const { s, m1v8, m4v5, m3v6, m2v7, w1v8, w4v5, w3v6, w2v7, mR2a, mR2b, wR2a, wR2b, mFinal, champion } =
    computePublicBracket(seeds, meetResults)

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex gap-0 items-stretch min-w-[660px]">
        {/* R1 */}
        <div className="flex flex-col gap-2 w-[210px] shrink-0">
          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pb-1">Round 1</div>
          <MatchupCard a={s(1)} b={s(8)} label="1 vs 8" meet={m1v8} />
          <MatchupCard a={s(4)} b={s(5)} label="4 vs 5" meet={m4v5} />
          <MatchupCard a={s(3)} b={s(6)} label="3 vs 6" meet={m3v6} />
          <MatchupCard a={s(2)} b={s(7)} label="2 vs 7" meet={m2v7} />
        </div>

        <BracketConnector pairs={2} />

        {/* R2 */}
        <div className="flex flex-col gap-2 w-[200px] shrink-0 justify-around">
          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pb-1">Round 2</div>
          <MatchupCard a={w1v8} b={w4v5} label="W(1/8) vs W(4/5)" meet={mR2a} />
          <div className="h-4" />
          <MatchupCard a={w3v6} b={w2v7} label="W(3/6) vs W(2/7)" meet={mR2b} />
        </div>

        <BracketConnector pairs={1} />

        {/* Sectional Final */}
        <div className="flex flex-col w-[205px] shrink-0 justify-center">
          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pb-1">Sectional Final</div>
          {champion
            ? <ChampionBox champion={champion} meet={mFinal} teamA={wR2a} teamB={wR2b} label="Sect. Champ" />
            : <MatchupCard a={wR2a} b={wR2b} label="Sectional Final" meet={mFinal} />
          }
        </div>
      </div>
    </div>
  )
}

// ── State bracket (4-team, public groups) ─────────────────────────────────────
// SF pairings are determined by power points (not fixed by section), so we
// find the actual matches by date rather than assuming which sections meet.

export type StateDates = { sf: string | null; final: string | null }

function StateBracket({
  sections, meetResults, stateDates,
}: {
  sections: Array<{ section: string; seeds: SeedEntry[] }>
  meetResults: MeetResult[]
  stateDates: StateDates
}) {
  const bySec = new Map(sections.map(s => [s.section, s.seeds]))
  const allSeeds = sections.flatMap(s => s.seeds)
  const bySid = buildBySid([allSeeds])

  const getChamp = (sec: string) => computePublicBracket(bySec.get(sec) ?? [], meetResults).champion
  const niChamp  = getChamp('North I')
  const niiChamp = getChamp('North II')
  const cenChamp = getChamp('Central')
  const souChamp = getChamp('South')

  const champs = [niChamp, niiChamp, cenChamp, souChamp].filter((c): c is SeedEntry => c?.schoolId != null)
  const champSids = new Set(champs.map(c => c.schoolId!))
  const hasAllChamps = champSids.size === 4

  // Find SF and Final matches: both teams must be sectional champs, matched by date
  const sfMeets = meetResults.filter(m =>
    m.meetDate === stateDates.sf &&
    champSids.has(m.team1SchoolId) && champSids.has(m.team2SchoolId)
  )
  const mSF1 = sfMeets[0] ?? null
  const mSF2 = sfMeets[1] ?? null

  const sf1A = mSF1 ? bySid.get(mSF1.team1SchoolId) ?? null : null
  const sf1B = mSF1 ? bySid.get(mSF1.team2SchoolId) ?? null : null
  const sf2A = mSF2 ? bySid.get(mSF2.team1SchoolId) ?? null : null
  const sf2B = mSF2 ? bySid.get(mSF2.team2SchoolId) ?? null : null

  const sf1Winner = advance(mSF1, sf1A, sf1B, bySid)
  const sf2Winner = advance(mSF2, sf2A, sf2B, bySid)

  const mFinal = meetResults.find(m =>
    m.meetDate === stateDates.final &&
    champSids.has(m.team1SchoolId) && champSids.has(m.team2SchoolId)
  ) ?? null
  const finA = mFinal ? bySid.get(mFinal.team1SchoolId) ?? null : null
  const finB = mFinal ? bySid.get(mFinal.team2SchoolId) ?? null : null
  const champion = advance(mFinal, finA, finB, bySid)

  return (
    <div className="overflow-x-auto pb-2">
      {!hasAllChamps && (
        <p className="text-xs text-slate-400 mb-4 italic">
          State bracket populates once all sectional champions are determined.
        </p>
      )}
      {hasAllChamps && sfMeets.length === 0 && (
        <p className="text-xs text-slate-400 mb-4 italic">
          State semifinal pairings are based on power points — matches not yet imported.
        </p>
      )}
      <div className="flex gap-0 items-stretch min-w-[500px]">
        <div className="flex flex-col gap-2 w-[220px] shrink-0">
          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pb-1">State Semifinals</div>
          <MatchupCard a={sf1A} b={sf1B} label="Semifinal 1" meet={mSF1} />
          <div className="h-2" />
          <MatchupCard a={sf2A} b={sf2B} label="Semifinal 2" meet={mSF2} />
        </div>

        <BracketConnector pairs={1} />

        <div className="flex flex-col w-[205px] shrink-0 justify-center">
          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pb-1">State Final</div>
          {champion
            ? <ChampionBox champion={champion} meet={mFinal} teamA={finA} teamB={finB} label="Group Champ" />
            : <MatchupCard a={sf1Winner} b={sf2Winner} label="State Final" meet={mFinal} />
          }
        </div>
      </div>
    </div>
  )
}

// ── NP-A 13-team bracket ──────────────────────────────────────────────────────
// R1 (Feb 17): 4v13, 5v12, 6v11, 7v10, 8v9
// QF (Feb 17): 1 vs W(8/9), 2 vs W(7/10), 3 vs W(6/11), W(4/13) vs W(5/12)
// State SFs (Feb 19): QF winners
// State Final (Feb 22)

function BracketNPA({ seeds, meetResults }: { seeds: SeedEntry[]; meetResults: MeetResult[] }) {
  const byNum = new Map(seeds.map(s => [s.seed, s]))
  const bySid = buildBySid([seeds])
  const s = (n: number) => byNum.get(n) ?? null

  // R1
  const m4v13 = findResult(meetResults, s(4),  s(13))
  const m5v12 = findResult(meetResults, s(5),  s(12))
  const m6v11 = findResult(meetResults, s(6),  s(11))
  const m7v10 = findResult(meetResults, s(7),  s(10))
  const m8v9  = findResult(meetResults, s(8),  s(9))

  const w4v13 = advance(m4v13, s(4),  s(13), bySid)
  const w5v12 = advance(m5v12, s(5),  s(12), bySid)
  const w6v11 = advance(m6v11, s(6),  s(11), bySid)
  const w7v10 = advance(m7v10, s(7),  s(10), bySid)
  const w8v9  = advance(m8v9,  s(8),  s(9),  bySid)

  // QF
  const mQF1 = findResult(meetResults, s(1),   w8v9)
  const mQF2 = findResult(meetResults, s(2),   w7v10)
  const mQF3 = findResult(meetResults, s(3),   w6v11)
  const mQF4 = findResult(meetResults, w4v13, w5v12)

  const wQF1 = advance(mQF1, s(1),   w8v9,  bySid)
  const wQF2 = advance(mQF2, s(2),   w7v10, bySid)
  const wQF3 = advance(mQF3, s(3),   w6v11, bySid)
  const wQF4 = advance(mQF4, w4v13, w5v12, bySid)

  // State SFs — find any two meets on Feb 19 where both teams are QF winners
  const qfWinners = [wQF1, wQF2, wQF3, wQF4].filter(Boolean) as SeedEntry[]
  const mSF1 = qfWinners.length >= 2 ? findResult(meetResults, qfWinners[0], qfWinners[3] ?? qfWinners[1]) : null
  const mSF2 = qfWinners.length >= 4 ? findResult(meetResults, qfWinners[1], qfWinners[2]) : null

  const wSF1 = advance(mSF1, qfWinners[0] ?? null, qfWinners[3] ?? qfWinners[1] ?? null, bySid)
  const wSF2 = advance(mSF2, qfWinners[1] ?? null, qfWinners[2] ?? null, bySid)

  const mFinal = findResult(meetResults, wSF1, wSF2)
  const champion = advance(mFinal, wSF1, wSF2, bySid)

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex gap-0 items-start min-w-[840px]">
        {/* R1 */}
        <div className="flex flex-col gap-2 w-[200px] shrink-0">
          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pb-1">First Round</div>
          <MatchupCard a={s(4)}  b={s(13)} label="4 vs 13" meet={m4v13} />
          <MatchupCard a={s(5)}  b={s(12)} label="5 vs 12" meet={m5v12} />
          <MatchupCard a={s(6)}  b={s(11)} label="6 vs 11" meet={m6v11} />
          <MatchupCard a={s(7)}  b={s(10)} label="7 vs 10" meet={m7v10} />
          <MatchupCard a={s(8)}  b={s(9)}  label="8 vs 9"  meet={m8v9}  />
        </div>

        <BracketConnector pairs={3} />

        {/* QF */}
        <div className="flex flex-col gap-2 w-[210px] shrink-0">
          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pb-1">Quarterfinals</div>
          <MatchupCard a={w4v13} b={w5v12} label="W(4/13) vs W(5/12)" meet={mQF4} />
          <div className="rounded-lg border border-blue-100 bg-blue-50 overflow-hidden">
            <TeamSlot entry={s(1)} />
            <div className="px-3 pb-1.5 text-[10px] text-blue-500 font-medium">BYE → vs W(8/9)</div>
          </div>
          <MatchupCard a={s(1)}   b={w8v9}  label="1 vs W(8/9)"       meet={mQF1} />
          <MatchupCard a={s(2)}   b={w7v10} label="2 vs W(7/10)"      meet={mQF2} />
          <MatchupCard a={s(3)}   b={w6v11} label="3 vs W(6/11)"      meet={mQF3} />
        </div>

        <BracketConnector pairs={2} />

        {/* SFs */}
        <div className="flex flex-col gap-2 w-[190px] shrink-0 justify-around pt-4">
          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pb-1">State Semifinals</div>
          <MatchupCard a={wQF1} b={wQF4} label="SF 1" meet={mSF1} />
          <div className="h-4" />
          <MatchupCard a={wQF2} b={wQF3} label="SF 2" meet={mSF2} />
        </div>

        <BracketConnector pairs={1} />

        {/* Final */}
        <div className="flex flex-col w-[190px] shrink-0 justify-center pt-4">
          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pb-1">State Final</div>
          {champion
            ? <ChampionBox champion={champion} meet={mFinal} teamA={wSF1} teamB={wSF2} label="NP-A Champ" />
            : <MatchupCard a={wSF1} b={wSF2} label="NP-A Final" meet={mFinal} />
          }
        </div>
      </div>
    </div>
  )
}

// ── NP-B 9-team bracket ───────────────────────────────────────────────────────
// Prelim (Feb 17): 8 vs 9
// QF (Feb 17): 1 vs W(8/9), 4 vs 5, 3 vs 6, 2 vs 7
// State SFs (Feb 19): W(1/W89) vs W(4/5)  |  W(2/7) vs W(3/6)
// State Final (Feb 22)

function BracketNPB({ seeds, meetResults }: { seeds: SeedEntry[]; meetResults: MeetResult[] }) {
  const byNum = new Map(seeds.map(s => [s.seed, s]))
  const bySid = buildBySid([seeds])
  const s = (n: number) => byNum.get(n) ?? null

  // Prelim
  const mPrelim = findResult(meetResults, s(8), s(9))
  const wPrelim = advance(mPrelim, s(8), s(9), bySid)

  // QF
  const mQF1 = findResult(meetResults, s(1), wPrelim)
  const mQF2 = findResult(meetResults, s(4), s(5))
  const mQF3 = findResult(meetResults, s(3), s(6))
  const mQF4 = findResult(meetResults, s(2), s(7))

  const wQF1 = advance(mQF1, s(1),  wPrelim, bySid)
  const wQF2 = advance(mQF2, s(4),  s(5),    bySid)
  const wQF3 = advance(mQF3, s(3),  s(6),    bySid)
  const wQF4 = advance(mQF4, s(2),  s(7),    bySid)

  // State SFs: 1-side vs 4-side, 2-side vs 3-side
  const mSF1 = findResult(meetResults, wQF1, wQF2)
  const mSF2 = findResult(meetResults, wQF4, wQF3)

  const wSF1 = advance(mSF1, wQF1, wQF2, bySid)
  const wSF2 = advance(mSF2, wQF4, wQF3, bySid)

  const mFinal = findResult(meetResults, wSF1, wSF2)
  const champion = advance(mFinal, wSF1, wSF2, bySid)

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex gap-0 items-start min-w-[720px]">
        {/* Prelim */}
        <div className="flex flex-col gap-2 w-[190px] shrink-0">
          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pb-1">Prelim</div>
          <MatchupCard a={s(8)} b={s(9)} label="8 vs 9" meet={mPrelim} />
          <div className="rounded-lg border border-blue-100 bg-blue-50 overflow-hidden">
            <TeamSlot entry={s(1)} />
            <div className="px-3 pb-1.5 text-[10px] text-blue-500 font-medium">BYE → vs W(8/9)</div>
          </div>
        </div>

        <BracketConnector pairs={1} />

        {/* QF */}
        <div className="flex flex-col gap-2 w-[205px] shrink-0">
          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pb-1">Quarterfinals</div>
          <MatchupCard a={s(1)}  b={wPrelim} label="1 vs W(8/9)" meet={mQF1} />
          <MatchupCard a={s(4)}  b={s(5)}    label="4 vs 5"       meet={mQF2} />
          <MatchupCard a={s(3)}  b={s(6)}    label="3 vs 6"       meet={mQF3} />
          <MatchupCard a={s(2)}  b={s(7)}    label="2 vs 7"       meet={mQF4} />
        </div>

        <BracketConnector pairs={2} />

        {/* SFs */}
        <div className="flex flex-col gap-2 w-[185px] shrink-0 justify-around">
          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pb-1">State Semifinals</div>
          <MatchupCard a={wQF1} b={wQF2} label="SF 1" meet={mSF1} />
          <div className="h-4" />
          <MatchupCard a={wQF4} b={wQF3} label="SF 2" meet={mSF2} />
        </div>

        <BracketConnector pairs={1} />

        {/* Final */}
        <div className="flex flex-col w-[190px] shrink-0 justify-center">
          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pb-1">State Final</div>
          {champion
            ? <ChampionBox champion={champion} meet={mFinal} teamA={wSF1} teamB={wSF2} label="NP-B Champ" />
            : <MatchupCard a={wSF1} b={wSF2} label="NP-B Final" meet={mFinal} />
          }
        </div>
      </div>
    </div>
  )
}

// ── Leader dashboard ──────────────────────────────────────────────────────────

function StatCard({ title, entries, decimals = 2 }: { title: string; entries: LeaderEntry[]; decimals?: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">{title}</div>
      {entries.length === 0 ? (
        <div className="text-xs text-slate-300 italic">No playoff data yet</div>
      ) : (
        <ol className="space-y-2">
          {entries.map((e, i) => (
            <li key={e.name} className="flex items-center gap-2">
              <span className={`w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center shrink-0 ${
                i === 0 ? 'bg-yellow-100 text-yellow-700' : i === 1 ? 'bg-slate-100 text-slate-600' : 'bg-orange-50 text-orange-600'
              }`}>{i + 1}</span>
              <span className="text-xs text-slate-700 flex-1 truncate">{e.name}</span>
              <span className="text-xs font-bold text-slate-800 tabular-nums">{e.value.toFixed(decimals)}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

function LeaderDashboard({ stats }: { stats: LeaderStats }) {
  const hasData = stats.pointsPerMatch.length > 0 || stats.pinsPerMatch.length > 0
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-3">
        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Team Leaders</h2>
        {!hasData && (
          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-400 font-medium">
            Updates as playoff matches are loaded
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard title="Points / Match"    entries={stats.pointsPerMatch}  decimals={1} />
        <StatCard title="Pins / Match"      entries={stats.pinsPerMatch}    />
        <StatCard title="Techs / Match"     entries={stats.techsPerMatch}   />
        <StatCard title="Bonus Pts / Match" entries={stats.bonusPerMatch}   />
      </div>
    </div>
  )
}

// ── Main client ───────────────────────────────────────────────────────────────

const GROUP_TABS = [
  { key: 'g1', label: 'Group 1' },
  { key: 'g2', label: 'Group 2' },
  { key: 'g3', label: 'Group 3' },
  { key: 'g4', label: 'Group 4' },
  { key: 'g5', label: 'Group 5' },
  { key: 'np', label: 'Non-Public' },
]

export function TeamBracketClient({
  regularGroups, npGroups, leaderStats, meetResults, stateDates,
}: {
  regularGroups: GroupBracket[]
  npGroups:      GroupBracket[]
  leaderStats:   LeaderStats
  meetResults:   MeetResult[]
  stateDates:    StateDates
}) {
  const [activeGroup,   setActiveGroup]   = useState(0)
  const [activeSectionByGroup, setActiveSectionByGroup] = useState<number[]>(
    () => Array(GROUP_TABS.length).fill(0),
  )

  const isNP           = activeGroup === 5
  const currentGroup   = isNP ? null : regularGroups[activeGroup]
  const activeSection  = activeSectionByGroup[activeGroup]

  function setSection(idx: number) {
    setActiveSectionByGroup(prev => {
      const next = [...prev]; next[activeGroup] = idx; return next
    })
  }

  const subTabs = isNP
    ? npGroups.map(g => g.label)
    : ['State', 'North I', 'North II', 'Central', 'South']

  return (
    <div>
      <LeaderDashboard stats={leaderStats} />

      {/* Group tabs */}
      <div className="flex flex-wrap gap-1 border-b border-slate-200 pb-2 mb-5">
        {GROUP_TABS.map((g, i) => (
          <button key={g.key} onClick={() => setActiveGroup(i)}
            className={`px-3 py-1.5 text-sm rounded font-medium transition-colors ${
              activeGroup === i ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}>
            {g.label}
          </button>
        ))}
      </div>

      {/* Section sub-tabs */}
      <div className="flex flex-wrap gap-1 mb-5">
        {subTabs.map((label, i) => (
          <button key={label} onClick={() => setSection(i)}
            className={`px-3 py-1 text-xs rounded font-medium transition-colors ${
              activeSection === i ? 'bg-blue-600 text-white' : 'text-slate-500 border border-slate-200 hover:bg-slate-50'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        {isNP ? (() => {
          const g = npGroups[activeSection]
          if (!g) return null
          const seeds = g.sections[0]?.seeds ?? []
          return (
            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-4">Non-Public Group {g.classification} Bracket</h2>
              {g.isNPA
                ? <BracketNPA seeds={seeds} meetResults={meetResults} />
                : <BracketNPB seeds={seeds} meetResults={meetResults} />
              }
            </div>
          )
        })() : activeSection === 0 ? (
          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-1">
              Group {currentGroup?.classification} — State Bracket
            </h2>
            <p className="text-xs text-slate-400 mb-4">NJSIAA Group {currentGroup?.classification} State Championship</p>
            {currentGroup && (
              <StateBracket sections={currentGroup.sections} meetResults={meetResults} stateDates={stateDates} />
            )}
          </div>
        ) : (() => {
          const sectionName = ['North I', 'North II', 'Central', 'South'][activeSection - 1]
          const sectionData = currentGroup?.sections.find(s => s.section === sectionName)
          return (
            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-1">
                {sectionName} Group {currentGroup?.classification} Bracket
              </h2>
              <p className="text-xs text-slate-400 mb-4">8-team single elimination — click a matchup to view match results</p>
              <Bracket8 seeds={sectionData?.seeds ?? []} meetResults={meetResults} />
            </div>
          )
        })()}
      </div>
    </div>
  )
}
