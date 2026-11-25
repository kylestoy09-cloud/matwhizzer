// Build hub podium CSVs from raw results files, the way the upload page does (UploadPanel.tsx), in Node.
import { readFileSync, writeFileSync } from 'fs'
import { getDocumentProxy } from 'unpdf'
import * as H from '../../src/lib/hubFiles'
const B = `${process.env.HOME}/Desktop/wrestling_brackets/Off Season Stuff/2026`
const csvCell = (v: string | number | null) => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }

export async function load(files: string[]) {
  const out: { name: string; kind: H.FileKind; text?: string; items?: any[]; pdfWeight?: string; pdfDivision?: string }[] = []
  for (const f of files) {
    if (/\.pdf$/i.test(f)) {
      const pdf = await getDocumentProxy(new Uint8Array(readFileSync(`${B}/${f}`)))
      const items: any[] = []
      for (let p = 1; p <= pdf.numPages; p++) for (const it of (await (await pdf.getPage(p)).getTextContent()).items as any[]) if (it.str?.trim()) items.push({ s: it.str.trim(), x: Math.round(it.transform[4]), y: Math.round(it.transform[5]) - p * 10000 })
      out.push({ name: f.split('/').pop()!, kind: 'bracket-pdf', items, ...(() => { const g = H.mobbinFromName(f.split('/').pop()!); return { pdfWeight: g.weight, pdfDivision: g.division } })() })
    } else { const text = f.endsWith('.rtfd') ? H.rtfToText(readFileSync(`${B}/${f}/TXT.rtf`, 'utf8')) : H.rtfToText(readFileSync(`${B}/${f}`, 'utf8')); out.push({ name: f.split('/').pop()!, kind: H.detectKind(f, text), text }) }
  }
  return out
}

export function rowsOf(files: Awaited<ReturnType<typeof load>>, leftOut: string[] = []) {
  const roster = files.filter(f => f.kind === 'roster').flatMap(f => H.parseRoster(f.text!))
  const byName = H.rosterIndex(roster)
  const rows: H.PodiumOut[] = []
  for (const f of files) {
    if (f.kind === 'bouts') { const got = H.podiumsFromBouts(f.text!, byName); rows.push(...got.rows); leftOut.push(...got.merged); if (got.merged.length) console.log(`  LEFT OUT (two draws mixed): ${got.merged.join(', ')}`)
    } else if (f.kind === 'placements') rows.push(...H.parsePlacements(f.text!), ...H.parseFloPlacements(f.text!), ...H.parseFloResults(f.text!))
    else if (f.kind === 'bracket-pdf' && f.pdfWeight) for (const p of H.mobbinPlaces(f.items!)) rows.push({ division: f.pdfDivision!, weight: f.pdfWeight, place: p.place, place_to: null, name: p.name, team: p.team, state: null, style: H.styleOf(f.pdfDivision!), grade: null })
  }
  return rows
}

export function divisions(rows: H.PodiumOut[]) {
  return [...new Set(rows.map(r => r.division))].map(d => {
    const rs = rows.filter(r => r.division === d)
    const gs = rs.map(r => r.grade).filter((g): g is number => g != null).sort((a, z) => a - z)
    const byGrade = gs.length >= 3 ? (gs[Math.floor(gs.length / 2)] <= 8 ? 'X' : /\b(girls?|women)/i.test(d) ? 'F' : 'M') : null
    return { d, style: rs[0].style, dest: byGrade ?? H.destinationOf(d), places: rs.length, weights: new Set(rs.map(r => r.weight)).size, deepest: Math.max(...rs.map(r => r.place_to ?? r.place)), nj: rs.filter(r => r.state === 'NJ').length, medGrade: gs.length ? gs[Math.floor(gs.length / 2)] : null }
  })
}

export function csvOf(rows: H.PodiumOut[], keep: { d: string; style: string }[], eventDate: string) {
  const out = rows.filter(r => keep.some(c => c.d === r.division))
  const styleFor = (d: string) => keep.find(c => c.d === d)!.style
  return ['Weight,Place,Name,Club,State,Division,Style,Class', ...out.map(r => [r.weight, r.place_to ? `${r.place}-${r.place_to}` : r.place, r.name, r.team, r.state ?? '', r.division, styleFor(r.division), H.classYear(r.grade, eventDate) ?? ''].map(csvCell).join(','))].join('\n')
}

if (process.argv[2] === 'survey') {
  const sets: Record<string, string[]> = JSON.parse(process.argv[3])
  for (const [label, files] of Object.entries(sets)) {
    const f = await load(files)
    const rows = rowsOf(f)
    console.log(`\n=== ${label}: files ${f.map(x => `${x.name}=${x.kind}`).join(', ')}`)
    for (const d of divisions(rows)) console.log(`  ${d.d.padEnd(34)} ${d.style.padEnd(9)} → ${d.dest} | ${d.weights} wts ${d.places} places through ${d.deepest} | NJ ${d.nj} | median grade ${d.medGrade}`)
    const dates = f.filter(x => x.kind === 'bouts').flatMap(x => [...x.text!.matchAll(/\b(\d{1,2}\/\d{1,2}\/20\d\d|20\d\d-\d\d-\d\d)\b/g)].map(m => m[1]))
    if (dates.length) console.log('  dates:', [...new Set(dates)].slice(0, 6).join(' '))
  }
}
