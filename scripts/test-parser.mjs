// scripts/test-parser.mjs
// Run with: node scripts/test-parser.mjs
// Validates parseDualMeetText against inline sample data.

import { parseDualMeetText } from '../src/lib/parseDualMeet.ts'

// ── Sample data ────────────────────────────────────────────────────────────────

// FORMAT A: proper tab/space-separated lines with newlines
const FORMAT_A_SAMPLE = `
Garfield vs. Cliffside Park (01/15/2025) • Matches Dashboard | Team Scores | Individual Stats
  Weight  Summary  GARF  DOVE
  106  Joe Balzano (Garfield) over Nick Ferrer (Cliffside Park) (Dec 9-7)  3  0
  113  Double Forfeit  0  0
  120  Marcus Gill (Garfield) over Unknown (For.)  6  0
  126  Luis Taveras (Cliffside Park) over Mike Ortega (Garfield) (Fall 1:34)  0  6
  132  Sam Diaz (Garfield) over Alex Ruiz (Cliffside Park) (MD 12-3)  4  0
  138  Pedro Colon (Cliffside Park) over Chris Vega (Garfield) (TF 16-1, 3:45)  0  5
  144  Dante Rivera (Garfield) over Jordan Pena (Cliffside Park) (Dec 7-5)  3  0
  150  Elias Cruz (Garfield) over Unknown (For.)  6  0
  157  Roberto Santos (Cliffside Park) over Tyler Mora (Garfield) (SV-1 4-2)  0  3
  165  Double Forfeit  0  0
  175  Kyle Reyes (Garfield) over Sam Flores (Cliffside Park) (Fall 3:22)  6  0
  190  Marco Perez (Cliffside Park) over Quinn Torres (Garfield) (Dec 8-2)  0  3
  215  Darius King (Garfield) over Drew Hunt (Cliffside Park) (MD 11-2)  4  0
  285  Brian Walsh (Garfield) over Jordan Stone (Cliffside Park) (Dec 6-4)  3  0
Team Score:    42  17
`.trim()

// FORMAT B: whitespace-collapsed / jammed (no tabs, may lack newlines)
// Simulates what happens when a TrackWrestling table is pasted into an app that
// strips tab characters — column headers run together, data follows inline.
const FORMAT_B_SAMPLE = `Kearny vs. Belleville (02/05/2025) • Matches Dashboard | Team Scores | Individual StatsWeightSummaryKEARBELL106Mike Torres (Kearny) over Carlos Rivera (Belleville) (Fall 2:14) 6 0113Double Forfeit 0 0120James Monroe (Belleville) over Tyler Grant (Kearny) (Dec 8-5) 0 3126David Kim (Kearny) over Amir Hassan (Belleville) (MD 14-4) 4 0132Luis Santos (Kearny) over Unknown (For.) 6 0138Eric Johnson (Belleville) over Ray Martinez (Kearny) (TF 15-0, 4:12) 0 5144Brian Lee (Kearny) over Chris Park (Belleville) (Dec 3-1) 3 0150Double Forfeit 0 0157Kevin Brown (Kearny) over Jason White (Belleville) (Fall 4:32) 6 0165Paul Green (Belleville) over Mark Thomas (Kearny) (UTB 4-3) 0 3175Robert Black (Kearny) over Steven Gray (Belleville) (Dec 9-7) 3 0190Tommy Red (Kearny) over Andy Blue (Belleville) (MD 13-2) 4 0215Chris Gold (Belleville) over Dan Silver (Kearny) (Dec 7-4) 0 3285Nick Steel (Kearny) over Pete Iron (Belleville) (Fall 1:58) 6 0Team Score: 38 14`

// DUPLICATE: same teams + date as FORMAT_A_SAMPLE — should be flagged isDuplicate: true
const DUPLICATE_SAMPLE = `
Garfield vs. Cliffside Park (01/15/2025) • Matches Dashboard | Team Scores | Individual Stats
  Weight  Summary  GARF  DOVE
  106  Joe Balzano (Garfield) over Nick Ferrer (Cliffside Park) (Dec 9-7)  3  0
  113  Double Forfeit  0  0
Team Score:    3  0
`.trim()

// FORFEIT-HEAVY: multiple forfeit wins and a double forfeit
const FORFEIT_SAMPLE = `
Hoboken vs. Memorial (12/10/2024) • Matches Dashboard | Team Scores | Individual Stats
  Weight  Summary  HOB  MEM
  106  Alexei Petrov (Hoboken) over Unknown (For.)  6  0
  113  Double Forfeit  0  0
  120  Double Forfeit  0  0
  126  Carlos Mendez (Memorial) over Unknown (For.)  0  6
  132  Diego Reyes (Hoboken) over Brian Cho (Memorial) (Fall 0:58)  6  0
  138  Double Forfeit  0  0
  144  Franco Masi (Hoboken) over Unknown (For.)  6  0
  150  Kevin Pak (Memorial) over Justin Lee (Hoboken) (MD 15-4)  0  4
  157  Anthony Russo (Hoboken) over Unknown (For.)  6  0
  165  Double Forfeit  0  0
  175  Manny Cruz (Hoboken) over Unknown (For.)  6  0
  190  Steve Nam (Memorial) over Unknown (For.)  0  6
  215  Victor Pham (Hoboken) over Pete Walsh (Memorial) (Dec 4-2)  3  0
  285  Double Forfeit  0  0
Team Score:    33  16
`.trim()

// ── Run ────────────────────────────────────────────────────────────────────────

const raw = [FORMAT_A_SAMPLE, FORMAT_B_SAMPLE, DUPLICATE_SAMPLE, FORFEIT_SAMPLE].join('\n\n')

const meets = parseDualMeetText(raw)

console.log(`\n${'═'.repeat(70)}`)
console.log(`Parsed ${meets.length} meets`)
console.log('═'.repeat(70))

for (const meet of meets) {
  const dup = meet.isDuplicate ? '  ⚠ DUPLICATE' : ''
  const fmt = meet.rawText.includes('•') && !meet.rawText.includes('\n  Weight') ? 'Format B' : 'Format A'
  console.log(`\n┌─ ${meet.team1Name} vs. ${meet.team2Name} (${meet.date})${dup}`)
  console.log(`│  Format: ${fmt}`)
  console.log(`│  Score:  ${meet.team1Name} ${meet.team1Score} – ${meet.team2Score} ${meet.team2Name}`)
  console.log(`│  Matches: ${meet.matches.length}`)
  console.log('│')

  for (const m of meet.matches) {
    if (m.isDoubleForfeit) {
      console.log(`│  ${String(m.weightClass).padStart(3)} │ DOUBLE FORFEIT  (${m.team1Points}-${m.team2Points})`)
    } else if (m.isForfeitWin) {
      console.log(`│  ${String(m.weightClass).padStart(3)} │ FOR  ${m.winnerName} (${m.winnerSchoolRaw ?? '?'}) wins by forfeit  (${m.team1Points}-${m.team2Points})`)
    } else {
      const result = m.resultDetail ? `${m.resultType} ${m.resultDetail}` : m.resultType
      console.log(`│  ${String(m.weightClass).padStart(3)} │ ${m.resultType.padEnd(5)} ${m.winnerName ?? '?'} (${m.winnerSchoolRaw ?? '?'}) over ${m.loserName ?? '?'} (${m.loserSchoolRaw ?? '?'})  [${result}]  (${m.team1Points}-${m.team2Points})`)
    }
  }

  const doubleForfeitCount = meet.matches.filter(m => m.isDoubleForfeit).length
  const forfeitWinCount    = meet.matches.filter(m => m.isForfeitWin).length
  const nullResults        = meet.matches.filter(m => m.resultType === 'Unknown').length
  console.log(`│`)
  console.log(`│  Summary: ${doubleForfeitCount} double forfeits, ${forfeitWinCount} forfeit wins, ${nullResults} unparsed`)
  console.log('└' + '─'.repeat(66))
}

// Spot-check specific fields
console.log('\n── Spot checks ──────────────────────────────────────────────────────')

const meetA = meets.find(m => m.team1Name === 'Garfield' && !m.isDuplicate)
const meetB = meets.find(m => m.team1Name === 'Kearny')
const dupMeet = meets.find(m => m.isDuplicate)

console.log(`\nFormat A — Garfield 120lb (forfeit win):`)
const garf120 = meetA?.matches.find(m => m.weightClass === 120)
console.log(JSON.stringify(garf120, null, 2))

console.log(`\nFormat B — Kearny 132lb (forfeit win):`)
const kear132 = meetB?.matches.find(m => m.weightClass === 132)
console.log(JSON.stringify(kear132, null, 2))

console.log(`\nDuplicate meet flagged: ${dupMeet?.isDuplicate === true ? 'YES ✓' : 'NO ✗'}  (${dupMeet?.team1Name} vs ${dupMeet?.team2Name} ${dupMeet?.date})`)

console.log(`\nFormat B — Kearny 138lb (TF with time):`)
const kear138 = meetB?.matches.find(m => m.weightClass === 138)
console.log(JSON.stringify(kear138, null, 2))

console.log(`\nHoboken forfeit-win count: ${meets.find(m => m.team1Name === 'Hoboken')?.matches.filter(m => m.isForfeitWin).length ?? '?'} (expected 6)`)
console.log(`Hoboken double-forfeit count: ${meets.find(m => m.team1Name === 'Hoboken')?.matches.filter(m => m.isDoubleForfeit).length ?? '?'} (expected 5)`)
