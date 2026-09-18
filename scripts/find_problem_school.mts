import { parseDualMeetText } from '../src/lib/parseDualMeet'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const envFile = readFileSync('.env.local', 'utf8')
for (const line of envFile.split('\n')) {
  const m = line.match(/^([^=]+)=(.*)$/); if (m) process.env[m[1].trim()] = m[2].trim()
}

const raw = readFileSync('../Whizzer Upload/December 2025 Dual Results.rtf', 'latin1')
const text = raw
  .replace(/\\'([0-9a-fA-F]{2})/g, (_: string, h: string) => String.fromCharCode(parseInt(h, 16)))
  .replace(/\\par[d ]?/g, '\n')
  .replace(/\\[a-z]+[-]?[0-9]* ?/g, '')
  .replace(/[{}]/g, '')

const meets = parseDualMeetText(text)

// The schools without any DB record (NJ schools only — OOS would be skipped)
const probableUnresolvable = new Set([
  'Kittatinny Regional Jr/Sr',
  'Frisch',
  'Kushner Academy',
  'Torah Academy',
  'Blair Academy (B Team)',
  'The Peddie School',
])

console.log('Meets containing unresolvable NJ schools:')
for (const m of meets) {
  const bad = [m.team1Name, m.team2Name].filter(n => probableUnresolvable.has(n ?? ''))
  if (bad.length === 0) continue
  console.log(`\n  ${m.team1Name} vs ${m.team2Name} (${m.date})`)
  for (const match of m.matches) {
    const ws = [
      match.winnerName && match.winnerSchoolRaw ? `${match.winnerName} (${match.winnerSchoolRaw})` : null,
      match.loserName  && match.loserSchoolRaw  ? `${match.loserName} (${match.loserSchoolRaw})`   : null,
    ].filter(Boolean)
    if (ws.length) console.log(`    ${match.weightClass}lb: ${ws.join(' vs ')}`)
  }
}
