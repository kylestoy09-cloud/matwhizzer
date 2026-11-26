'use client'
// Import review (Kyle 2026-11-26: "empty bracket fills the names in, csv moves those names along as the record shows
// and with each step, if there is an issue, it will be in red and we can fix"). The bracket import as a worker runs it,
// shown on the site's own bracket: 1 · the bracket PDF puts the names on the draw; 2 · the results CSV moves winners
// along — bouts that fit turn green, problems red; 3 · the completed brackets (asked for when anything is red) check
// every championship bout. Click any bout: its section of the PDF opens with what the file says, what the bracket
// shows, suggested fixes, and the bout to set by hand. Uses the real importer (src/lib/bracketIntake/). Nothing is
// saved (a mock). Practice: 2024 NJSIAA State with mistakes written into its results file (practice.ts = answer key).
import { useEffect, useMemo, useRef, useState } from 'react'
import { SplitBracket, BracketMarks, BRACKET_LOOK_DEFAULT } from '@/components/bracket/SplitBracket'
import { pdfPages } from '@/lib/bracketIntake/pdfText'
import { readFloDraws, type WeightDraw } from '@/lib/bracketIntake/flo'
import { readFloResults, type ResultRow } from '@/lib/bracketIntake/results'
import { readFloCompleted, type CompletedWeight } from '@/lib/bracketIntake/completed'
import { reviewIntake, levelName, meet, type Fix, type Mark, type ReviewItem } from '@/lib/bracketIntake/review'
import { buildIntakeBracket, type Cell } from '@/lib/bracketIntake/slots'
import { norm, type Placed } from '@/lib/bracketIntake/fit'
import { PRACTICE } from '@/lib/bracketIntake/practice'

type PdfJs = typeof import('pdfjs-dist')
type PdfDoc = Awaited<ReturnType<PdfJs['getDocument']>['promise']>
let pdfjsP: Promise<PdfJs> | null = null
// pdf.js runs on the page itself: importing its worker module sets globalThis.pdfjsWorker, which pdf.js then uses
const loadPdfJs = () => (pdfjsP ??= (async () => { await import('pdfjs-dist/build/pdf.worker.min.mjs'); return import('pdfjs-dist') })())

const SCALE = 2
const pageCache = new WeakMap<PdfDoc, Map<number, Promise<HTMLCanvasElement>>>()
function drawPage(doc: PdfDoc, n: number) {
  let m = pageCache.get(doc)
  if (!m) { m = new Map(); pageCache.set(doc, m) }
  let p = m.get(n)
  if (!p) {
    p = (async () => {
      const page = await doc.getPage(n)
      const vp = page.getViewport({ scale: SCALE })
      const c = document.createElement('canvas')
      c.width = vp.width; c.height = vp.height
      await page.render({ canvas: c, viewport: vp }).promise
      return c
    })()
    m.set(n, p)
  }
  return p
}
const TONE = { red: '#dc2626', amber: '#d97706', green: '#059669' }
type Show = { page: number; top: number; bottom: number; label: string }

function PdfCrop({ doc, show, marks }: { doc: PdfDoc; show: Show; marks: Mark[] }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const [err, setErr] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    drawPage(doc, show.page).then(full => {
      const c = ref.current
      if (!alive || !c) return
      const top = Math.max(0, show.top * SCALE), h = Math.max(60, Math.min((show.bottom - show.top) * SCALE, full.height - top))
      c.width = full.width; c.height = h
      const g = c.getContext('2d')!
      g.drawImage(full, 0, top, full.width, h, 0, 0, full.width, h)
      g.font = `bold ${10 * SCALE}px system-ui, sans-serif`
      for (const m of marks) {
        const y0 = m.top * SCALE - top, y1 = m.bottom * SCALE - top
        g.strokeStyle = TONE[m.tone]; g.lineWidth = 2.5
        g.strokeRect(m.x0 * SCALE, y0, (m.x1 - m.x0) * SCALE, y1 - y0)
        const tw = g.measureText(m.label).width
        g.fillStyle = 'rgba(255,255,255,0.92)'; g.fillRect(m.x1 * SCALE + 4, y0, tw + 8, 13 * SCALE)
        g.fillStyle = TONE[m.tone]; g.fillText(m.label, m.x1 * SCALE + 8, y0 + 10 * SCALE)
      }
    }).catch(e => alive && setErr(String(e)))
    return () => { alive = false }
  }, [doc, show, marks])
  if (err) return <p className="p-3 text-xs text-red-700">Couldn’t draw the PDF: {err}</p>
  return (
    <div>
      <p className="mb-1 text-[11px] text-slate-500">{show.label}</p>
      <canvas ref={ref} className="block w-full border border-slate-200 bg-white" />
    </div>
  )
}

type Pdf = { name: string; pages: Awaited<ReturnType<typeof pdfPages>>; draws: WeightDraw[]; doc: PdfDoc }
async function readPdf(name: string, bytes: Uint8Array): Promise<Pdf> {
  const pdfjs = await loadPdfJs()
  const pages = await pdfPages(pdfjs as never, bytes.slice(), { weights: true })        // pdf.js takes the bytes it's given
  const doc = await pdfjs.getDocument({ data: bytes.slice() }).promise
  return { name, pages, draws: readFloDraws(pages), doc }
}
const fetchPractice = async (f: 'pdf' | 'practice') => {
  const r = await fetch(`/api/admin/bracket-intake/sample?f=${f}`)
  if (!r.ok) throw new Error('Could not load the practice file')
  return f === 'pdf' ? new Uint8Array(await r.arrayBuffer()) : await r.text()
}
const boutText = (r: ResultRow) => `${r.round || '(no round)'}: ${r.winner} (${r.winnerTeam}) over ${r.loser} (${r.loserTeam})${r.winType || r.result ? ` · ${r.winType} ${r.result}` : ''}`
const H4 = ({ children }: { children: React.ReactNode }) => <h4 className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">{children}</h4>
const WIN_TYPES = ['DEC', 'MD', 'TF', 'F', 'FOR', 'DEF', 'DQ', 'INJ']

/** a step's file: pick a file, or the practice one */
function Loader({ n, title, done, accept, onFile, practiceLabel, onPractice, disabled }: { n: number; title: string; done: string | null; accept: string; onFile: (f: File) => void; practiceLabel: string; onPractice: () => void; disabled?: boolean }) {
  return (
    <div className={`border p-3 text-xs ${done ? 'border-emerald-400 bg-emerald-50/40' : 'border-slate-300 bg-white'} ${disabled ? 'opacity-40 pointer-events-none' : ''}`}>
      <p className="mb-1.5 font-bold text-slate-900">{n} · {title}</p>
      {done ? <p className="mb-1.5 text-emerald-800">✓ {done}</p> : null}
      <input type="file" accept={accept} className="block w-full text-[11px]" onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = '' }} />
      <button onClick={onPractice} className="mt-1.5 border border-slate-300 bg-white px-2 py-0.5 font-semibold text-slate-700 hover:bg-slate-50">{practiceLabel}</button>
    </div>
  )
}

type State = { rows: ResultRow[]; manual: Set<number>; label: string }

export function IntakeLab() {
  const [bracket, setBracket] = useState<Pdf | null>(null)
  const [results, setResults] = useState<{ name: string; practice: boolean } | null>(null)
  const [states, setStates] = useState<State[]>([])                 // [0] = as loaded; each fix adds one (undo = drop it)
  const [completed, setCompleted] = useState<(Pdf & { weights: CompletedWeight[] }) | null>(null)
  const [weight, setWeight] = useState<number | null>(null)
  const [picked, setPickedRaw] = useState<string | null>(null)
  const [savedNote, setSavedNote] = useState<string | null>(null)     // the last change, shown in the open panel
  const setPicked = (id: string | null) => { setPickedRaw(id); setSavedNote(null) }
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const guard = async (label: string, f: () => Promise<void>) => {
    setError(null); setBusy(label)
    try { await f() } catch (e) { setError(e instanceof Error ? e.message : String(e)) } finally { setBusy(null) }
  }
  const loadBracket = (name: string, bytes: Uint8Array) => guard('Reading the bracket PDF…', async () => {
    const p = await readPdf(name, bytes)
    if (!p.draws.length) throw new Error('No brackets found in that PDF. Is it the FloWrestling bracket printout?')
    setBracket(p); setResults(null); setStates([]); setCompleted(null); setPicked(null); setWeight(p.draws[0].weight)
  })
  const loadResults = (name: string, text: string, practice: boolean) => guard('Reading the results…', async () => {
    const { rows, problems } = readFloResults(text)
    if (!rows.length) throw new Error(problems[0] ?? 'No bouts in that file.')
    setResults({ name, practice }); setStates([{ rows, manual: new Set(), label: 'loaded' }]); setCompleted(null); setPicked(null)
  })
  const loadCompleted = (name: string, bytes: Uint8Array) => guard('Reading the completed brackets…', async () => {
    if (!bracket) return
    const p = await readPdf(name, bytes)
    if (!p.draws.length) throw new Error('No brackets found in that PDF.')
    setCompleted({ ...p, weights: readFloCompleted(p.pages, bracket.draws, p.draws) }); setPicked(null)
  })

  const cur = states[states.length - 1] ?? null
  const report = useMemo(() => (bracket && cur ? reviewIntake(bracket.draws, cur.rows, completed ? { weights: completed.weights, draws: completed.draws } : undefined) : null), [bracket, cur, completed])
  const firstReport = useMemo(() => (bracket && states[0] ? reviewIntake(bracket.draws, states[0].rows) : null), [bracket, states])
  const draw = bracket?.draws.find(d => d.weight === weight) ?? null
  const view = useMemo(() => {
    if (!draw) return null
    const fit = report?.fits.find(f => f.weight === draw.weight) ?? null
    return buildIntakeBracket(draw, fit, report?.items ?? [], completed?.weights.find(w => w.weight === draw.weight) ?? null, cur?.manual ?? new Set())
  }, [draw, report, completed, cur])
  // per weight: problems (red) to settle
  // each problem is counted once, on the weight whose bracket it's on; a bout filed under another weight is also marked
  // on the weight it's filed under as "to move" (so the badges add up to the banner)
  const problemsAt = (w: number) => (report?.items ?? []).filter(i => !i.knockOn && (i.slot ? i.slot.weight === w : i.weight === w)).length
  const toMoveAt = (w: number) => (report?.items ?? []).filter(i => !i.knockOn && i.slot && i.slot.weight !== w && i.row.weight === w).length
  // in the file under this weight but in no box on this bracket: misfiled bouts (red), and knock-ons with no box anywhere (amber)
  const unplaced = (report?.items ?? []).filter(i => i.row.weight === weight && (!i.slot || i.slot.weight !== weight) && (!i.knockOn || !i.slot))
  const totalProblems = (report?.items ?? []).filter(i => !i.knockOn).length
  const missing = view ? Object.values(view.status).filter(s => s === 'missing').length : 0

  const apply = (label: string, f: (rows: ResultRow[]) => void, manualRow?: number) => {
    if (!cur) return
    const rows = cur.rows.map(r => ({ ...r }))
    f(rows)
    const manual = new Set(cur.manual); if (manualRow != null) manual.add(manualRow)
    setStates(s => [...s, { rows, manual, label }])
    setSavedNote(label)          // the panel stays open and shows where the bout stands now
  }
  const teamOf = (name: string, code: string) => {
    for (const r of cur?.rows ?? []) { if (norm(r.winner) === norm(name)) return r.winnerTeam; if (norm(r.loser) === norm(name)) return r.loserTeam }
    return code
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">
        The bracket import, step by step, on the bracket itself. Bouts that check out turn <b className="text-emerald-700">green</b>.
        Anything that doesn’t is <b className="text-red-700">red</b>: click it to see that part of the PDF and fix it. Nothing here is saved.
      </p>
      {busy && <p className="text-xs font-semibold text-slate-700">{busy}</p>}
      {error && <p className="border-l-4 border-red-500 bg-red-50 px-2 py-1 text-xs text-red-900">{error}</p>}

      <div className="grid gap-2 md:grid-cols-3">
        <Loader n={1} title="Bracket PDF (before)" done={bracket ? `${bracket.name}: ${bracket.draws.length} weights` : null} accept="application/pdf,.pdf"
          onFile={async f => loadBracket(f.name, new Uint8Array(await f.arrayBuffer()))}
          practiceLabel="Practice: 2024 State bracket" onPractice={() => guard('Getting the practice bracket…', async () => { await loadBracket('2024 State bracket (practice)', await fetchPractice('pdf') as Uint8Array) })} />
        <Loader n={2} title="Results CSV (after)" disabled={!bracket} done={results && firstReport ? `${results.name}: ${firstReport.placed} bouts fit${firstReport.items.length ? `, ${firstReport.items.length} don’t` : ''}` : null} accept=".csv,text/csv"
          onFile={async f => loadResults(f.name, await f.text(), false)}
          practiceLabel="Practice: 2024 State results" onPractice={() => guard('Getting the practice results…', async () => { await loadResults('practice results', await fetchPractice('practice') as string, true) })} />
        <Loader n={3} title="Completed brackets PDF (only if anything is red)" disabled={!results || !firstReport?.items.length} done={completed && report ? `${completed.name}: ${report.checked} bouts compared` : null} accept="application/pdf,.pdf"
          onFile={async f => loadCompleted(f.name, new Uint8Array(await f.arrayBuffer()))}
          practiceLabel="Practice: 2024 State completed" onPractice={() => guard('Getting the practice completed brackets…', async () => { await loadCompleted('2024 State completed (practice)', await fetchPractice('pdf') as Uint8Array) })} />
      </div>

      {results && report && (
        totalProblems === 0
          ? <p className="border-l-4 border-emerald-500 bg-emerald-50 px-3 py-1.5 text-xs text-emerald-900"><b>Every bout fits{completed ? ' and matches the completed brackets' : ''}.</b> {report.placed} bouts ready to save. <button disabled className="ml-2 bg-emerald-700 px-2 py-0.5 font-semibold text-white opacity-60" title="Mock: nothing is saved here">Save results</button></p>
          : <p className="border-l-4 border-red-500 bg-red-50 px-3 py-1.5 text-xs text-red-900"><b>{totalProblems} to fix</b> (red). A bout filed under the wrong weight is counted on the weight it belongs to; the weight it’s filed under says “to move”. Nothing is saved until they’re fixed.{!completed && ' Load the completed brackets (step 3) to check them against what was wrestled.'}</p>
      )}

      {bracket && (
        <div className="border border-slate-300 bg-white">
          <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 p-2">
            {bracket.draws.map(d => {
              const n = results ? problemsAt(d.weight) : 0
              const mv = results ? toMoveAt(d.weight) : 0
              return (
                <button key={d.weight} onClick={() => { setWeight(d.weight); setPicked(null) }} className={`px-2 py-0.5 text-xs border ${d.weight === weight ? 'bg-slate-900 text-white border-slate-900' : n || mv ? 'border-red-500 text-red-700 bg-red-50' : results ? 'border-emerald-400 text-emerald-800' : 'border-slate-300 text-slate-700'}`}>
                  {d.weight}{n ? ` · ${n}` : ''}{mv ? ` · ${mv} to move` : ''}
                </button>
              )
            })}
            <span className="ml-auto flex flex-wrap gap-2 text-[10px] text-slate-500">
              <span><i className="inline-block h-2.5 w-2.5 border border-emerald-500 bg-emerald-50 align-middle" /> fits{completed ? ' + matches' : ''}</span>
              <span><i className="inline-block h-2.5 w-2.5 border border-red-600 bg-red-50 align-middle" /> fix this</span>
              <span><i className="inline-block h-2.5 w-2.5 border border-amber-500 bg-amber-50 align-middle" /> fits once the red one is fixed</span>
              <span><i className="inline-block h-2.5 w-2.5 border border-sky-600 bg-sky-50 align-middle" /> set by hand</span>
              <span><i className="inline-block h-2.5 w-2.5 border border-dashed border-slate-500 align-middle" /> no bout in the file</span>
            </span>
          </div>
          {view && (
            <div className="max-h-[72vh] overflow-auto p-3">
              <BracketMarks.Provider value={{ status: view.status, onPick: id => setPicked(id), selected: picked }}>
                <SplitBracket bracket={view.bracket} look={{ ...BRACKET_LOOK_DEFAULT, fit: false, cardW: 128, hover: false }} mixed={false} />
              </BracketMarks.Provider>
              {missing > 0 && <p className="mt-2 text-[11px] text-slate-500">{missing} box{missing === 1 ? '' : 'es'} with both wrestlers known but no bout in the file (dashed). Click to enter it.</p>}
              {unplaced.length > 0 && (
                <div className="mt-3 border-t border-slate-200 pt-2">
                  <H4>In the results under {weight}, but not on the {weight} bracket</H4>
                  <div className="flex flex-wrap gap-2">
                    {unplaced.map(it => it.knockOn
                      ? <button key={it.id} onClick={() => setPicked(`u-${it.id}`)} className="border border-amber-500 bg-amber-50 px-2 py-1 text-left text-[11px] text-amber-900 hover:bg-amber-100">row {it.row.row}: {it.row.round ? `${it.row.round}, ` : ''}{it.row.winner} over {it.row.loser}<br /><span className="text-amber-700">Follows from another problem; check it once that’s fixed</span></button>
                      : <button key={it.id} onClick={() => setPicked(`u-${it.id}`)} className="border border-red-600 bg-red-50 px-2 py-1 text-left text-[11px] text-red-900 hover:bg-red-100">row {it.row.row}: {it.row.round ? `${it.row.round}, ` : ''}{it.row.winner} over {it.row.loser}<br /><span className="text-red-700">{it.slot && it.slot.weight !== weight ? `Both wrestlers are on the ${it.slot.weight} bracket` : it.title}</span></button>)}
                  </div>
                </div>
              )}
            </div>
          )}
          {states.length > 1 && (
            <div className="border-t border-slate-200 p-2 text-[11px] text-slate-600">
              <b>Fixed so far:</b> {states.slice(1).map(s => s.label).join(' · ')}{' '}
              <button onClick={() => setStates(s => s.slice(0, -1))} className="ml-2 border border-slate-300 px-2 py-0.5 font-semibold hover:bg-slate-50">Undo the last fix</button>
            </div>
          )}
        </div>
      )}

      {picked && bracket && view && draw && (
        <BoutPanel
          key={picked} id={picked} view={view} draw={draw} bracket={bracket} completed={completed} report={report}
          rows={cur?.rows ?? []} unplaced={unplaced} teamOf={teamOf} savedNote={savedNote}
          placed={report?.fits.find(f => f.weight === draw.weight)?.placed.filter(p => p.side === 'champ') ?? []}
          onClose={() => setPicked(null)} onApply={apply}
        />
      )}

      {results?.practice && (
        <details className="border border-slate-200 bg-white p-3 text-xs text-slate-600">
          <summary className="cursor-pointer font-semibold">Answer key: what’s wrong in the practice results file</summary>
          <ul className="mt-2 list-disc pl-5">{PRACTICE.map(p => <li key={p.key}>{p.label}</li>)}</ul>
        </details>
      )}
    </div>
  )
}

/** The bout you clicked: its section of the PDF, what the file says, what the completed bracket shows, the problem
 *  and its suggested fixes, and the bout to set by hand */
function BoutPanel({ id, view, draw, bracket, completed, report, rows, unplaced, teamOf, savedNote, placed, onClose, onApply }: {
  id: string; view: ReturnType<typeof buildIntakeBracket>; draw: WeightDraw; bracket: Pdf; completed: (Pdf & { weights: CompletedWeight[] }) | null
  report: ReturnType<typeof reviewIntake> | null; rows: ResultRow[]; unplaced: ReviewItem[]; teamOf: (name: string, code: string) => string
  savedNote: string | null; placed: Placed[]
  onClose: () => void; onApply: (label: string, f: (rows: ResultRow[]) => void, manualRow?: number) => void
}) {
  const cell: Cell | null = view.cells.get(id) ?? null
  const consRow = view.consRows.get(id) ?? null
  const loose = id.startsWith('u-') ? unplaced.find(i => `u-${i.id}` === id) ?? null : null
  const items = cell?.items ?? (loose ? [loose] : [])
  const D = Math.log2(draw.lines.length)
  // the bout filed under this weight first (matches the box: slots.ts), a misfiled one only when there's no other
  const root = items.find(i => !i.knockOn && i.row.weight === draw.weight) ?? items.find(i => !i.knockOn) ?? items[0] ?? null
  const follows = items.find(i => i.knockOn)
  const rootOf = follows ? report?.items.find(i => i.id === follows.knockOn) : null

  // the PDF section: the problem's own crop, else this box on the completed bracket (or the draw lines on the blank)
  const cdraw = completed?.draws.find(d => d.weight === draw.weight) ?? null
  let show: Show | null = null, marks: Mark[] = [], doc: PdfDoc = bracket.doc
  if (root?.show) {
    show = { page: root.show.page, top: root.show.top, bottom: root.show.bottom, label: `${root.show.source === 'completed' ? 'Completed bracket' : 'Bracket'} PDF, page ${root.show.page} · ${root.show.weight}` }
    marks = root.marks; doc = root.show.source === 'completed' && completed ? completed.doc : bracket.doc
  } else if (cell) {
    const d = cdraw ?? draw
    for (const [k, l] of cell.sides.entries()) if (l != null) { const t = d.tops[l] ?? 0; marks.push({ top: t - 3, bottom: t + 11, x0: d.x - 5, x1: d.x + 122, tone: 'amber', label: `line ${l + 1} · ${draw.lines[l]!.name}${k ? '' : ''}` }) }
    if (cell.box) marks.push({ top: cell.box.tops[0] - 3, bottom: cell.box.tops[1] + 22, x0: cell.box.x - 5, x1: cell.box.x + 118, tone: 'green', label: 'the completed bracket' })
    const ys = marks.flatMap(m => [m.top, m.bottom])
    if (ys.length) { show = { page: d.page, top: Math.min(...ys) - 30, bottom: Math.max(...ys) + 30, label: `${cdraw ? 'Completed bracket' : 'Bracket'} PDF, page ${d.page} · ${draw.weight}` }; doc = cdraw && completed ? completed.doc : bracket.doc }
  }
  const row = cell?.row ?? consRow ?? loose?.row ?? null
  const title = cell ? `${draw.weight} · ${levelName(cell.level, D)}` : consRow ? `${draw.weight} · ${consRow.round || 'Consolation'}` : loose?.slot && loose.slot.weight !== loose.row.weight ? `${loose.row.weight} · belongs on the ${loose.slot.weight} bracket` : `${loose?.row.weight} · not on the bracket`
  const boxShows = cell?.box && cell.box.winner != null ? (() => { const b = cell.box!; const l = b.lines[0] === b.winner ? b.lines[1] : b.lines[0]; return `${draw.lines[b.winner!]!.name} over ${l != null ? draw.lines[l]!.name : '?'}${b.result ? ` · ${b.result}` : ''}` })() : root?.bracketShows ?? null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-5xl border border-slate-900 bg-white shadow-xl" onClick={e => e.stopPropagation()}>
        <div className={`flex items-center justify-between border-b px-3 py-2 ${root && !root.knockOn ? 'bg-red-50' : follows ? 'bg-amber-50' : 'bg-slate-50'}`}>
          <span className="text-sm font-bold text-slate-900">{title}{root && !root.knockOn ? ` · ${root.title}` : ''}</span>
          <button onClick={onClose} className="px-2 text-lg leading-none text-slate-500 hover:text-slate-900">×</button>
        </div>
        <div className="space-y-3 p-3">
          {savedNote && (() => {
            const st = view.status[id]
            const gone = !cell && !consRow && !loose
            const ok = gone || st === 'ok' || st === 'manual'
            return (
              <p className={`border-l-4 px-2 py-1 text-xs ${ok ? 'border-emerald-500 bg-emerald-50 text-emerald-900' : 'border-red-500 bg-red-50 text-red-900'}`}>
                <b>Saved:</b> {savedNote}. {gone ? 'This one is settled.' : ok ? 'This bout now fits the bracket.' : st === 'follows' ? 'This bout will fit once the red box it follows from is fixed.' : 'This bout still doesn’t fit. The reason is below.'}
              </p>
            )
          })()}
          {show ? <PdfCrop doc={doc} show={show} marks={marks} /> : <p className="text-xs text-slate-500">{consRow ? 'Consolation bouts aren’t checked against the PDF yet.' : 'No PDF section for this one.'}</p>}
          <div className="grid gap-x-6 gap-y-3 text-xs text-slate-700 md:grid-cols-2">
            <div><H4>The results file says</H4><p>{row ? <>{row.weight !== draw.weight && cell ? <b className="text-red-700">Filed under {row.weight}, not {draw.weight}: </b> : null}{boutText(row)} <span className="text-slate-400">· row {row.row}, under {row.weight}</span></> : <span className="text-slate-500">No bout for this box.</span>}</p></div>
            <div><H4>The completed bracket shows</H4><p>{boxShows ?? <span className="text-slate-400">{completed ? 'Nothing readable here.' : 'Not loaded.'}</span>}</p></div>
            {root && !root.knockOn && <div><H4>What doesn’t fit</H4><p>{root.reason}</p></div>}
            {root && !root.knockOn && root.hint && <div><H4>Why, most likely</H4><p>{root.hint}</p></div>}
            {follows && <div className="md:col-span-2"><H4>Why it’s amber</H4><p>{follows.hint}{rootOf?.slot ? ` It’s the red box at ${rootOf.slot.weight} (${levelName(rootOf.slot.level, D)}).` : ''}</p></div>}
          </div>
          {root && !root.knockOn && root.fixes.length > 0 && (
            <div className="text-xs"><H4>Suggested fix</H4>
              <div className="flex flex-wrap gap-1.5">{root.fixes.map((f: Fix) => <button key={f.label} onClick={() => onApply(`${root.weight} row ${root.row.row}: ${f.label}`, f.apply)} className="bg-slate-900 px-2 py-1 text-[11px] font-semibold text-white hover:bg-slate-700">{f.label}</button>)}</div>
            </div>
          )}
          {cell && <ByHand cell={cell} draw={draw} D={D} row={row} rows={rows} placed={placed} teamOf={teamOf} onApply={onApply} />}
        </div>
      </div>
    </div>
  )
}

/** Set the box's bout by hand: who wrestled (from the lines that can reach this box), who won, how */
function ByHand({ cell, draw, D, row, rows, placed, teamOf, onApply }: { cell: Cell; draw: WeightDraw; D: number; row: ResultRow | null; rows: ResultRow[]; placed: Placed[]; teamOf: (name: string, code: string) => string; onApply: (label: string, f: (rows: ResultRow[]) => void, manualRow?: number) => void }) {
  const span = 1 << cell.level
  const half = (k: 0 | 1) => { const from = (2 * cell.block + k) * span; return Array.from({ length: span }, (_, i) => from + i).filter(i => draw.lines[i]) }
  const lineOfName = (n: string | undefined) => (n ? draw.lines.findIndex(l => l && norm(l.name) === norm(n)) : -1)
  const rowWin = lineOfName(row?.winner), rowLose = lineOfName(row?.loser)
  const startTop = cell.sides[0] ?? ([rowWin, rowLose].find(l => l >= 0 && half(0).includes(l)) ?? half(0)[0])
  const startBot = cell.sides[1] ?? ([rowWin, rowLose].find(l => l >= 0 && half(1).includes(l)) ?? half(1)[0])
  const [top, setTop] = useState<number>(startTop)
  const [bot, setBot] = useState<number>(startBot)
  const [win, setWin] = useState<'top' | 'bottom'>(rowWin === startBot ? 'bottom' : 'top')
  const [type, setType] = useState(row?.winType || 'DEC')
  const [score, setScore] = useState(row?.result ?? '')
  const name = (l: number) => draw.lines[l]!.name
  // putting a wrestler in this box means they won every earlier box on the way here. Where the file says they lost one
  // of those, that result is turned around too (Kyle 2026-11-26: a hand fix to a semifinal "didn't save" — the file's
  // quarterfinal still had the wrestler losing, so the box stayed red)
  const earlier = (L: number) => {
    const flip: { row: ResultRow; lvl: number }[] = [], odd: { row: ResultRow; lvl: number }[] = []
    for (let lv = 0; lv < cell.level; lv++) {
      const p = placed.find(x => meet(x.lines[0], x.lines[1]) === lv && x.lines[0] >> (lv + 1) === L >> (lv + 1))
      if (!p) continue
      if (p.lines[1] === L) flip.push({ row: p.row, lvl: lv })
      else if (p.lines[0] !== L) odd.push({ row: p.row, lvl: lv })
    }
    return { flip, odd }
  }
  const chain = [top, bot].map(earlier)
  const flips = chain.flatMap(c => c.flip), odds = chain.flatMap(c => c.odd)
  const save = () => {
    const w = win === 'top' ? top : bot, l = win === 'top' ? bot : top
    const wl = draw.lines[w]!, ll = draw.lines[l]!
    const target = row?.row ?? Math.max(0, ...rows.map(r => r.row)) + 1
    onApply(`${draw.weight} ${levelName(cell.level, D).toLowerCase()}: ${wl.name} over ${ll.name}${flips.length ? ` (and ${flips.length} earlier result${flips.length === 1 ? '' : 's'} turned around)` : ''}, by hand`, rs => {
      for (const f of flips) {
        const r = rs.find(x => x.row === f.row.row)
        if (r) { [r.winner, r.loser] = [r.loser, r.winner]; [r.winnerTeam, r.loserTeam] = [r.loserTeam, r.winnerTeam] }
      }
      let r = rs.find(x => x.row === target)
      if (!r) { const tpl = rs[0]; r = { ...tpl, row: target }; rs.push(r) }
      Object.assign(r, { weight: draw.weight, round: levelName(cell.level, D), winner: wl.name, winnerTeam: teamOf(wl.name, wl.code), loser: ll.name, loserTeam: teamOf(ll.name, ll.code), winType: type, result: score })
    }, target)
  }
  const sel = 'border border-slate-300 px-1 py-0.5 text-xs'
  return (
    <div className="border-t border-slate-200 pt-3 text-xs">
      <H4>Set this bout by hand</H4>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-0.5"><span className="flex items-center gap-1"><input type="radio" checked={win === 'top'} onChange={() => setWin('top')} /> winner?</span>
          <select value={top} onChange={e => setTop(Number(e.target.value))} className={sel}>{half(0).map(l => <option key={l} value={l}>line {l + 1}: {name(l)} ({draw.lines[l]!.code})</option>)}</select></label>
        <span className="pb-1 text-slate-400">vs</span>
        <label className="flex flex-col gap-0.5"><span className="flex items-center gap-1"><input type="radio" checked={win === 'bottom'} onChange={() => setWin('bottom')} /> winner?</span>
          <select value={bot} onChange={e => setBot(Number(e.target.value))} className={sel}>{half(1).map(l => <option key={l} value={l}>line {l + 1}: {name(l)} ({draw.lines[l]!.code})</option>)}</select></label>
        <label className="flex flex-col gap-0.5">How<select value={type} onChange={e => setType(e.target.value)} className={sel}>{WIN_TYPES.map(t => <option key={t}>{t}</option>)}</select></label>
        <label className="flex flex-col gap-0.5">Score / time<input value={score} onChange={e => setScore(e.target.value)} placeholder="6-5 or 1:36" className={`${sel} w-24`} /></label>
        <button onClick={save} className="bg-sky-700 px-3 py-1 font-semibold text-white hover:bg-sky-800">Save this bout</button>
      </div>
      {flips.length > 0 && (
        <div className="mt-2 border-l-4 border-sky-500 bg-sky-50 px-2 py-1 text-[11px] text-sky-900">
          <b>Saving also changes:</b>
          <ul className="list-disc pl-4">{flips.map(f => <li key={f.row.row}>row {f.row.row}, {levelName(f.lvl, D).toLowerCase()}: the file has {f.row.winner} beating {f.row.loser}. It becomes {f.row.loser} over {f.row.winner} ({f.row.winType} {f.row.result}), since {f.row.loser} wrestles in this box.</li>)}</ul>
        </div>
      )}
      {odds.length > 0 && (
        <p className="mt-2 border-l-4 border-amber-500 bg-amber-50 px-2 py-1 text-[11px] text-amber-900">
          The file has {odds.map(o => `${o.row.winner} over ${o.row.loser} (${levelName(o.lvl, D).toLowerCase()}, row ${o.row.row})`).join('; ')}: neither is who you picked, so that box will need fixing too.
        </p>
      )}
      {row && row.weight !== draw.weight && (
        <p className="mt-2 border-l-4 border-sky-500 bg-sky-50 px-2 py-1 text-[11px] text-sky-900"><b>Saving moves row {row.row} from {row.weight} to {draw.weight}</b>: it leaves the {row.weight} results.</p>
      )}
      <p className="mt-1 text-[11px] text-slate-500">This changes {row ? `row ${row.row} of the results` : 'the results (a new row)'}; the bracket then checks again. Undo is under the bracket.</p>
    </div>
  )
}
