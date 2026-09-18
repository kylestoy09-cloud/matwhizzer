import { readFileSync } from 'fs'

const raw = readFileSync('/Users/thebrain/Desktop/wrestling_brackets/whizzer upload/Tournament Scores.rtf', 'latin1')

function stripRtf(rtf: string): string {
  let s = rtf
  // Preserve nested table structure by converting to readable format
  s = s.replace(/\\nestcell\s*/g, '\t')
  s = s.replace(/\\nestrow\s*/g, '\n')
  // Unicode line separator
  s = s.replace(/\\uc0\\u8232\s*/g, '\n')
  // Smart dashes
  s = s.replace(/\\'96/g, '–')
  s = s.replace(/\\'97/g, '—')
  s = s.replace(/\\'a0/g, '\xa0')
  s = s.replace(/\\'[0-9a-f]{2}/gi, '')
  // Hyperlinks — extract display text
  s = s.replace(/\{\\field\{\\fldinst[^}]*\}\{\\fldrslt ([^}]*)\}\}/gs, (_, inner) => {
    return inner.replace(/\\[a-z0-9 ]+/gi, '').replace(/\s+/g, ' ').trim()
  })
  // Remove all RTF control words and groups
  s = s.replace(/\{[^{}]*\}/gs, ' ')
  s = s.replace(/\\[a-z*]+[-]?\d*\s*/gi, '')
  s = s.replace(/[{}]/g, '')
  // Normalize whitespace
  s = s.replace(/[ \t]+/g, ' ')
  s = s.replace(/\n[ \t]*/g, '\n')
  s = s.replace(/\n{3,}/g, '\n\n')
  return s.trim()
}

const text = stripRtf(raw)
// Print first 3000 chars to understand structure
console.log(text.substring(0, 3000))
console.log('\n\n--- AROUND LINE 1000 ---')
const lines = text.split('\n')
console.log(lines.slice(0, 100).join('\n'))
