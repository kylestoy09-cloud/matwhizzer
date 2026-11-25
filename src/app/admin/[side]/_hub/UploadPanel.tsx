'use client'

// Upload results files to a hub event (Kyle 2026-11-12). Files are read here in the browser (src/lib/hubFiles.ts):
// bout exports become brackets and places, a roster names their divisions, USA Bracketing placements come in
// as they are, Mobbin bracket PDFs need their weight and division typed. Each division found is listed with
// its style and where it belongs; ticked ones go to the import review as podium rows.
import { useState } from 'react'
import {
  rtfToText, detectKind, podiumsFromBouts, parseRoster, rosterIndex,
  parsePlacements, parseFloPlacements, parseFloResults, parseDualCopy, mobbinPlaces, mobbinFromName, styleOf, destinationOf, classYear, type FileKind, type PodiumOut,
} from '@/lib/hubFiles'

type Loaded = { name: string; kind: FileKind; text?: string; items?: { s: string; x: number; y: number }[]; pdfWeight?: string; pdfDivision?: string }
const DEST: Record<string, string> = { M: 'Boys (Offseason Hub)', F: 'Girls (Offseason Hub)', X: 'Middle School Hub (mixed)' }
const KIND: Record<FileKind, string> = { bouts: 'bout export', roster: 'roster', placements: 'placements list', 'bracket-pdf': 'bracket PDF', duals: 'duals page (bouts only)', unknown: 'not recognized' }
const input = 'border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-black'
const csvCell = (v: string | number | null) => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }

async function readFile(f: File): Promise<Loaded> {
  if (/\.pdf$/i.test(f.name)) {
    const { getDocumentProxy } = await import('unpdf')
    const pdf = await getDocumentProxy(new Uint8Array(await f.arrayBuffer()))
    const items: { s: string; x: number; y: number }[] = []
    for (let p = 1; p <= pdf.numPages; p++) {
      const tc = await (await pdf.getPage(p)).getTextContent()
      for (const it of tc.items as { str: string; transform: number[] }[]) if (it.str?.trim()) items.push({ s: it.str.trim(), x: Math.round(it.transform[4]), y: Math.round(it.transform[5]) - p * 10000 })
    }
    const guess = mobbinFromName(f.name)
    return { name: f.name, kind: 'bracket-pdf', items, pdfWeight: guess.weight, pdfDivision: guess.division }
  }
  const raw = await f.text()
  const text = rtfToText(raw)
  return { name: f.name, kind: detectKind(f.name, text), text }
}

export type UploadInfo = { files: string[]; divisions: { division: string; style: string; weights: number; places: number; placed_through: number }[] }

export function UploadPanel({ pool, eventDate, onUse }: { pool: 'M' | 'F' | 'X'; eventDate: string | null; onUse: (csv: string, count: number, upload: UploadInfo, kind?: 'podium' | 'bouts') => void }) {
  const [files, setFiles] = useState<Loaded[]>([])
  const [busy, setBusy] = useState(false)
  const [pick, setPick] = useState<Record<string, boolean>>({})
  // per-division overrides: where it goes and its style
  const [destOver, setDestOver] = useState<Record<string, 'M' | 'F' | 'X'>>({})
  const [styleOver, setStyleOver] = useState<Record<string, 'folkstyle' | 'freestyle' | 'greco'>>({})

  async function add(list: FileList | null) {
    if (!list?.length) return
    setBusy(true)
    const loaded = await Promise.all([...list].map(readFile))
    setFiles(prev => [...prev, ...loaded])
    setPick({}); setDestOver({}); setStyleOver({})
    setBusy(false)
  }

  // Everything the files say, as podium rows
  const roster = files.filter(f => f.kind === 'roster').flatMap(f => parseRoster(f.text!))
  const byName = rosterIndex(roster)
  const rows: PodiumOut[] = [], merged: string[] = []
  for (const f of files) {
    if (f.kind === 'bouts') {
      const got = podiumsFromBouts(f.text!, byName)
      rows.push(...got.rows); merged.push(...got.merged)
    } else if (f.kind === 'placements') rows.push(...parsePlacements(f.text!), ...parseFloPlacements(f.text!), ...parseFloResults(f.text!))   // USA Bracketing or FloArena
    else if (f.kind === 'bracket-pdf' && f.items && f.pdfWeight && f.pdfDivision) {
      for (const p of mobbinPlaces(f.items)) rows.push({ division: f.pdfDivision, weight: f.pdfWeight, place: p.place, place_to: null, name: p.name, team: p.team, state: null, style: styleOf(f.pdfDivision), grade: null })
    }
  }
  const divisions = [...new Set(rows.map(r => r.division))].map(d => {
    const rs = rows.filter(r => r.division === d)
    // Where it goes: by the roster's grades when it has them (mostly 8th grade or below = the middle
    // school pool), else by the division's name; the dropdown has the final say
    const gs = rs.map(r => r.grade).filter((g): g is number => g != null).sort((a, z) => a - z)
    const byGrade = gs.length >= 3 ? (gs[Math.floor(gs.length / 2)] <= 8 ? 'X' : /\b(girls?|women)/i.test(d) ? 'F' : 'M') : null
    const style = styleOver[d] ?? rs[0].style, dest = destOver[d] ?? byGrade ?? destinationOf(d)
    return { d, style, dest, places: rs.length, weights: new Set(rs.map(r => r.weight)).size, nj: rs.some(r => r.state) ? rs.filter(r => r.state === 'NJ').length : null, deepest: Math.max(...rs.map(r => r.place_to ?? r.place)) }
  })
  // Duals pages: bouts only (duals have no places) — this hub's divisions go to the bout review
  const DUAL_POOL: Record<string, 'M' | 'F' | 'X'> = { 'High School Boys': 'M', 'High School Girls': 'F', 'Middle School': 'X', Elementary: 'X' }
  const duals = files.filter(f => f.kind === 'duals').map(f => ({ name: f.name, ...parseDualCopy(f.text!) }))
  const dualBouts = duals.flatMap(d => d.bouts)
  const dualHere = dualBouts.filter(b => DUAL_POOL[b.division] === pool)
  function useDuals() {
    const club = (t: string) => t.replace(/\s+-\s+(HSB|HSG|MS|EL)$/, '').trim()
    const lines = ['Weight,Winning Wrestler,Winning Team,Losing Wrestler,Losing Team,Win Type,Result,Division',
      ...dualHere.map(b => [b.weight, b.winner, club(b.winTeam), b.loser, club(b.loseTeam), b.winType, b.result, b.division].map(csvCell).join(','))]
    const divs = [...new Set(dualHere.map(b => b.division))]
    onUse(lines.join('\n'), dualHere.length, { files: duals.map(d => d.name), divisions: divs.map(d => ({ division: d, style: 'folkstyle', weights: new Set(dualHere.filter(b => b.division === d).map(b => b.weight)).size, places: 0, placed_through: 0 })) }, 'bouts')
  }
  const isOn = (d: { d: string; style: string; dest: string }) => d.style !== 'greco' && (pick[d.d] ?? d.dest === pool)
  const chosen = divisions.filter(isOn)

  function use() {
    const out = rows.filter(r => chosen.some(c => c.d === r.division))
    const styleFor = (d: string) => chosen.find(c => c.d === d)!.style
    const lines = ['Weight,Place,Name,Club,State,Division,Style,Class', ...out.map(r => [r.weight, r.place_to ? `${r.place}-${r.place_to}` : r.place, r.name, r.team, r.state ?? '', r.division, styleFor(r.division), classYear(r.grade, eventDate) ?? ''].map(csvCell).join(','))]
    onUse(lines.join('\n'), out.length, {
      files: files.filter(f => f.kind !== 'unknown').map(f => f.name),
      divisions: chosen.map(c => ({ division: c.d, style: c.style, weights: c.weights, places: c.places, placed_through: c.deepest })),
    })
  }

  return (
    <div className="border border-slate-200 bg-white p-3 mb-3">
      <div className="flex items-center gap-3 flex-wrap">
        <label className="px-3 py-1 text-sm bg-black text-white cursor-pointer">{busy ? 'Reading…' : 'Choose files'}
          <input type="file" multiple accept=".csv,.rtf,.txt,.pdf" className="hidden" onChange={e => { add(e.target.files); e.target.value = '' }} />
        </label>
        <span className="text-xs text-slate-500">Bout export (CSV), roster (RTF), USA Bracketing or FloArena placements (RTF / text), Mobbin bracket (PDF). Add a roster with a bout export to name its divisions. <a href="../../?tab=howto" target="_blank" rel="noreferrer" className="underline hover:text-black">How to get these files</a></span>
        {files.length > 0 && <button onClick={() => { setFiles([]); setPick({}) }} className="ml-auto text-xs text-slate-400 hover:text-red-600">Clear files</button>}
      </div>

      {files.length > 0 && (
        <ul className="mt-2 text-xs text-slate-600 space-y-1">
          {files.map((f, i) => (
            <li key={i} className="flex items-center gap-2 flex-wrap">
              <span className={f.kind === 'unknown' ? 'text-red-600' : ''}>{f.name} — {KIND[f.kind]}{f.kind === 'roster' ? ` (${parseRoster(f.text!).length} entries)` : ''}</span>
              {f.kind === 'bracket-pdf' && (
                <>
                  <input placeholder="Weight" value={f.pdfWeight ?? ''} onChange={e => setFiles(files.map((x, j) => (j === i ? { ...x, pdfWeight: e.target.value.trim() } : x)))} className={`${input} w-20`} />
                  <input placeholder="Division (e.g. Middle School)" value={f.pdfDivision ?? ''} onChange={e => setFiles(files.map((x, j) => (j === i ? { ...x, pdfDivision: e.target.value } : x)))} className={`${input} w-56`} />
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {duals.length > 0 && (
        <div className="mt-3 text-sm">
          <p className="text-slate-700">Duals: {dualBouts.length.toLocaleString()} bouts ({[...new Set(dualBouts.map(b => b.division))].map(d => `${d} ${dualBouts.filter(b => b.division === d).length}`).join(', ')}), forfeits left out.{duals.some(d => d.unresolved.length) && <span className="text-slate-500"> {duals.reduce((a, d) => a + d.unresolved.length, 0)} names stay as written (two kids on one team it could be).</span>}</p>
          <button onClick={useDuals} disabled={!dualHere.length} className="mt-1 px-3 py-1 text-sm bg-black text-white disabled:opacity-40">Review {dualHere.length.toLocaleString()} bouts for this hub</button>
          {!dualHere.length && <span className="text-xs text-slate-500 ml-2">None of this hub&apos;s divisions are in these files.</span>}
        </div>
      )}
      {merged.length > 0 && (
        <p className="mt-2 text-xs text-amber-700">Left out, {merged.length} bracket{merged.length === 1 ? '' : 's'} that mix two draws (kids in both freestyle and Greco, or two pools of the same kids; the file doesn&apos;t say which bout was which): {merged.join(', ')}. Copy their placers from the results site and paste them instead.</p>
      )}
      {divisions.length > 0 && (
        <>
          <table className="w-full text-sm border border-slate-200 mt-3">
            <thead className="bg-slate-50 border-b border-slate-200"><tr className="text-[11px] uppercase text-slate-500 text-left">
              <th className="px-3 py-1">Here</th><th className="px-3 py-1">Division</th><th className="px-3 py-1">Style</th><th className="px-3 py-1">Belongs on</th><th className="px-3 py-1">Weights</th><th className="px-3 py-1">Places</th><th className="px-3 py-1">Placed through</th><th className="px-3 py-1">NJ</th>
            </tr></thead>
            <tbody>{divisions.map(d => (
              <tr key={d.d} className={`border-b border-slate-100 ${d.style === 'greco' ? 'text-slate-400' : ''}`}>
                <td className="px-3 py-1"><input type="checkbox" checked={isOn(d)} onChange={e => setPick({ ...pick, [d.d]: e.target.checked })} /></td>
                <td className="px-3 py-1 font-medium">{d.d}</td>
                <td className="px-3 py-1">
                  <select value={d.style} onChange={e => setStyleOver({ ...styleOver, [d.d]: e.target.value as 'folkstyle' | 'freestyle' | 'greco' })} className="border border-slate-300 text-xs px-1 py-0.5">
                    <option value="folkstyle">Folkstyle</option><option value="freestyle">Freestyle</option><option value="greco">Greco (not tracked)</option>
                  </select>
                </td>
                <td className="px-3 py-1">
                  <select value={d.dest} onChange={e => setDestOver({ ...destOver, [d.d]: e.target.value as 'M' | 'F' | 'X' })} className={`border border-slate-300 text-xs px-1 py-0.5 ${d.dest !== pool ? 'text-slate-400' : ''}`}>
                    {Object.entries(DEST).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </td>
                <td className="px-3 py-1">{d.weights}</td><td className="px-3 py-1">{d.places}</td><td className="px-3 py-1">{d.deepest}</td><td className="px-3 py-1">{d.nj == null ? <span className="text-slate-300" title="This file lists clubs, not states; NJ kids show in the review">—</span> : d.nj || ''}</td>
              </tr>
            ))}</tbody>
          </table>
          <div className="flex items-center gap-3 mt-2">
            <button onClick={use} disabled={!chosen.length} className="px-3 py-1 text-sm bg-black text-white disabled:opacity-40">Review {chosen.reduce((a, d) => a + d.places, 0)} places from {chosen.length} division{chosen.length === 1 ? '' : 's'}</button>
            <span className="text-xs text-slate-500">Ticked by default: divisions that belong on this event. Upload the same files on the other hub&apos;s event for the rest.</span>
          </div>
        </>
      )}
    </div>
  )
}
