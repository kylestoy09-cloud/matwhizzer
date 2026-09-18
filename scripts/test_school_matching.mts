import { matchSchoolNames } from '../src/lib/matchSchools'
import { readFileSync } from 'fs'

const envFile = readFileSync('.env.local', 'utf8')
for (const line of envFile.split('\n')) {
  const m = line.match(/^([^=]+)=(.*)$/); if (m) process.env[m[1].trim()] = m[2].trim()
}

const names = [
  "Belmont Hill School", "Bergenfield HS", "Bishop Hendricken High School",
  "Blair Academy (B Team)", "College Achieve Paterson Charter", "Council Rock South Hs",
  "East Brunswick H.S.", "Frisch", "Governor Livingston Regional Hs",
  "Green Farms Academy", "Iona Prep", "Jackson Township H.S.",
  "Kittatinny Regional Jr/Sr", "Kushner Academy", "Monsignor Farrell",
  "Morris Knolls Hs", "Perry (Massillon)", "Ponaganset High School",
  "South Brunswick Hs", "The Peddie School", "Torah Academy", "Wyoming Seminary",
]

for (const name of names) {
  const result = await matchSchoolNames(name)
  const flag = result.confidence === 'none' ? '❌ NONE' :
               result.confidence === 'oos'  ? '⛳ OOS ' :
               result.confidence === 'low'  ? '🟡 LOW ' : '✅     '
  console.log(`${flag}  ${name} → ${result.displayName ?? '(null)'} [${result.confidence}]`)
}
