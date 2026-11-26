'use client'
// Import review (Kyle 2026-11-26): the bracket import run exactly as a worker will run it, so a problem shows up the
// way it really would. 1 · load the bracket PDF. 2 · load the results CSV: every bout must fit; if any don't, nothing
// is saved and the page asks for the completed brackets. 3 · load the completed brackets: every championship bout is
// compared with them, each problem sits beside its section of the completed bracket, and the fixes change the file
// and run the check again. Uses the real importer (src/lib/bracketIntake/). Nothing is saved here (a mock).
// Practice files: 2024 NJSIAA State, with a results file that has mistakes written into it (practice.ts is the
// answer key; the page isn't told about them).
import { useEffect, useRef, useState } from 'react'
import { pdfPages } from '@/lib/bracketIntake/pdfText'
import { readFloDraws, type WeightDraw } from '@/lib/bracketIntake/flo'
import { readFloResults, type ResultRow } from '@/lib/bracketIntake/results'
import { readFloCompleted, type CompletedWeight } from '@/lib/bracketIntake/completed'
import { reviewIntake, type ReviewItem } from '@/lib/bracketIntake/review'
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

function PdfCrop({ doc, item }: { doc: PdfDoc; item: ReviewItem }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const [err, setErr] = useState<string | null>(null)
  const s = item.show
  useEffect(() => {
    if (!s) return
    let alive = true
    drawPage(doc, s.page).then(full => {
      const c = ref.current
      if (!alive || !c) return
      const top = s.top * SCALE, h = Math.max(40, Math.min((s.bottom - s.top) * SCALE, full.height - top))
      c.width = full.width; c.height = h
      const g = c.getContext('2d')!
      g.drawImage(full, 0, top, full.width, h, 0, 0, full.width, h)
      g.font = `bold ${10 * SCALE}px system-ui, sans-serif`
      for (const m of item.marks) {
        const y0 = m.top * SCALE - top, y1 = m.bottom * SCALE - top
        g.strokeStyle = TONE[m.tone]; g.lineWidth = 2.5
        g.strokeRect(m.x0 * SCALE, y0, (m.x1 - m.x0) * SCALE, y1 - y0)
        const tw = g.measureText(m.label).width
        g.fillStyle = 'rgba(255,255,255,0.9)'; g.fillRect(m.x1 * SCALE + 4, y0, tw + 8, 13 * SCALE)
        g.fillStyle = TONE[m.tone]; g.fillText(m.label, m.x1 * SCALE + 8, y0 + 10 * SCALE)
      }
    }).catch(e => alive && setErr(String(e)))
    return () => { alive = false }
  }, [doc, s, item.marks])
  if (!s) return <p className="p-3 text-xs text-slate-500">No bracket in the PDF for this one.</p>
  if (err) return <p className="p-3 text-xs text-red-700">Couldn’t draw the PDF: {err}</p>
  return (
    <div>
      <p className="mb-1 text-[11px] text-slate-500">{s.source === 'completed' ? 'Completed bracket' : 'Bracket'} PDF, page {s.page} · {s.weight}</p>
      <canvas ref={ref} className="block w-full border border-slate-200 bg-white" />
    </div>
  )
}

const boutText = (r: ResultRow) => `${r.round || '(no round)'}: ${r.winner} (${r.winnerTeam}) over ${r.loser} (${r.loserTeam})${r.winType || r.result ? ` · ${r.winType} ${r.result}` : ''}`
const H4 = ({ children }: { children: React.ReactNode }) => <h4 className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">{children}</h4>

function ItemCard({ doc, item, followers, onFix }: { doc: PdfDoc | null; item: ReviewItem; followers: ReviewItem[]; onFix: (i: number) => void }) {
  return (
    <div className="border border-slate-300 bg-white">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-200 bg-amber-50 px-3 py-1.5">
        <span className="text-sm font-bold text-slate-900">{item.weight} · {item.title}</span>
        <span className="text-[11px] text-slate-500">results file row {item.row.row}</span>
      </div>
      <div className="space-y-3 p-3">
        {doc && <PdfCrop doc={doc} item={item} />}
        <div className="grid gap-x-6 gap-y-3 text-xs text-slate-700 md:grid-cols-2">
          <div><H4>The results file says</H4><p>{boutText(item.row)}</p></div>
          <div><H4>The completed bracket shows</H4><p>{item.bracketShows ?? <span className="text-slate-400">—</span>}</p></div>
          <div><H4>What doesn’t fit</H4><p>{item.reason}</p></div>
          {item.hint && <div><H4>Why, most likely</H4><p>{item.hint}</p></div>}
          {item.related.length > 0 && (
            <div className="md:col-span-2"><H4>Their other bouts in the file</H4>
              <ul className="space-y-0.5">{item.related.map(r => <li key={r.row}>{boutText(r)} <span className="text-slate-400">· row {r.row}</span></li>)}</ul>
            </div>
          )}
          <div className="md:col-span-2"><H4>Fix</H4>
            <div className="flex flex-wrap gap-1.5">
              {item.fixes.map((f, i) => <button key={f.label + i} onClick={() => onFix(i)} className="border border-slate-900 bg-slate-900 px-2 py-1 text-[11px] font-semibold text-white hover:bg-slate-700">{f.label}</button>)}
              {!item.fixes.length && <span className="text-slate-500">Nothing the page can suggest: correct the file and load it again.</span>}
            </div>
          </div>
          {followers.length > 0 && (
            <div className="border-t border-slate-200 pt-2 md:col-span-2">
              <H4>Also don’t fit because of this one ({followers.length})</H4>
              <ul className="space-y-0.5 text-slate-600">{followers.map(f => <li key={f.id}>{boutText(f.row)} <span className="text-slate-400">· row {f.row.row}</span></li>)}</ul>
              <p className="mt-1 text-[11px] text-slate-500">These fit on their own once this is fixed.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

type Pdf = { name: string; bytes: Uint8Array; pages: Awaited<ReturnType<typeof pdfPages>>; draws: WeightDraw[]; doc: PdfDoc }
const fetchPractice = async (f: 'pdf' | 'practice') => {
  const r = await fetch(`/api/admin/bracket-intake/sample?f=${f}`)
  if (!r.ok) throw new Error('Could not load the practice file')
  return f === 'pdf' ? new Uint8Array(await r.arrayBuffer()) : await r.text()
}
async function readPdf(name: string, bytes: Uint8Array): Promise<Pdf> {
  const pdfjs = await loadPdfJs()
  const pages = await pdfPages(pdfjs as never, bytes.slice(), { weights: true })        // pdf.js takes the bytes it's given
  const doc = await pdfjs.getDocument({ data: bytes.slice() }).promise
  return { name, bytes, pages, draws: readFloDraws(pages), doc }
}

function Step({ n, title, active, children }: { n: number; title: string; active: boolean; children: React.ReactNode }) {
  return (
    <section className={`border bg-white p-4 ${active ? 'border-slate-300' : 'border-slate-200 opacity-50'}`}>
      <h3 className="mb-2 text-sm font-bold text-slate-900">{n} · {title}</h3>
      {active ? children : <p className="text-xs text-slate-500">After step {n - 1}.</p>}
    </section>
  )
}
function Loader({ accept, onFile, practiceLabel, onPractice }: { accept: string; onFile: (f: File) => void; practiceLabel: string; onPractice: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs">
      <input type="file" accept={accept} onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = '' }} />
      <span className="text-slate-400">or</span>
      <button onClick={onPractice} className="border border-slate-300 px-2 py-1 font-semibold text-slate-700 hover:bg-slate-50">{practiceLabel}</button>
    </div>
  )
}

export function IntakeLab() {
  const [bracket, setBracket] = useState<Pdf | null>(null)
  const [results, setResults] = useState<{ name: string; rows: ResultRow[]; practice: boolean } | null>(null)
  const [history, setHistory] = useState<{ rows: ResultRow[]; label: string }[]>([])   // fixes applied (for undo)
  const [completed, setCompleted] = useState<(Pdf & { weights: CompletedWeight[] }) | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const guard = async (label: string, f: () => Promise<void>) => {
    setError(null); setBusy(label)
    try { await f() } catch (e) { setError(e instanceof Error ? e.message : String(e)) } finally { setBusy(null) }
  }
  const loadBracket = (name: string, bytes: Uint8Array) => guard('Reading the bracket PDF…', async () => {
    const p = await readPdf(name, bytes)
    if (!p.draws.length) throw new Error('No brackets found in that PDF. Is it the FloWrestling bracket printout?')
    setBracket(p); setResults(null); setCompleted(null); setHistory([])
  })
  const loadResults = (name: string, text: string, practice: boolean) => guard('Reading the results…', async () => {
    const { rows, problems } = readFloResults(text)
    if (!rows.length) throw new Error(problems[0] ?? 'No bouts in that file.')
    setResults({ name, rows, practice }); setCompleted(null); setHistory([])
  })
  const loadCompleted = (name: string, bytes: Uint8Array) => guard('Reading the completed brackets…', async () => {
    if (!bracket) return
    const p = await readPdf(name, bytes)
    if (!p.draws.length) throw new Error('No brackets found in that PDF.')
    setCompleted({ ...p, weights: readFloCompleted(p.pages, bracket.draws, p.draws) })
  })

  const rows = history.length ? history[history.length - 1].rows : results?.rows ?? []
  const step2 = bracket && results ? reviewIntake(bracket.draws, results.rows) : null
  const now = bracket && results ? reviewIntake(bracket.draws, rows, completed ? { weights: completed.weights, draws: completed.draws } : undefined) : null
  const items = now?.items ?? []
  const roots = items.filter(i => !i.knockOn)
  const followersOf = (id: string) => items.filter(i => i.knockOn === id)
  const fix = (item: ReviewItem, i: number) => {
    const next = rows.map(r => ({ ...r }))
    item.fixes[i].apply(next)
    setHistory(h => [...h, { rows: next, label: `${item.weight} row ${item.row.row}: ${item.fixes[i].label}` }])
  }
  const needCompleted = !!step2 && step2.items.length > 0
  const unreadable = completed?.weights.filter(w => w.problem) ?? []

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        The bracket import, run the way a worker will run it. Use your own files, or the practice files: 2024 NJSIAA
        State, with a results file that has mistakes in it. Nothing here is saved.
      </p>
      {busy && <p className="text-xs font-semibold text-slate-700">{busy}</p>}
      {error && <p className="border-l-4 border-red-500 bg-red-50 px-2 py-1 text-xs text-red-900">{error}</p>}

      <Step n={1} title="Load the bracket (before the tournament)" active>
        <Loader accept="application/pdf,.pdf" onFile={async f => loadBracket(f.name, new Uint8Array(await f.arrayBuffer()))}
          practiceLabel="Practice: 2024 State bracket PDF" onPractice={() => guard('Getting the practice bracket…', async () => { await loadBracket('2024 NJSIAA State (practice)', await fetchPractice('pdf') as Uint8Array) })} />
        {bracket && (
          <div className="mt-3 text-xs text-slate-700">
            <p><b>{bracket.name}</b>: {bracket.draws.length} weights read: {bracket.draws.map(d => `${d.weight} (${d.lines.length})`).join(' · ')}</p>
            {bracket.name.includes('practice') && <p className="mt-1 text-[11px] text-slate-500">There’s no blank printout of 2024 State on file, so the practice uses the finished one. The import reads only the first round of a bracket, which is the same on both.</p>}
          </div>
        )}
      </Step>

      <Step n={2} title="Load the results (after the tournament)" active={!!bracket}>
        <Loader accept=".csv,text/csv" onFile={async f => loadResults(f.name, await f.text(), false)}
          practiceLabel="Practice: 2024 State results (Flo CSV)" onPractice={() => guard('Getting the practice results…', async () => { await loadResults('2024 NJSIAA State results (practice)', await fetchPractice('practice') as string, true) })} />
        {step2 && (
          <div className="mt-3 space-y-2 text-xs text-slate-700">
            <p><b>{results!.name}</b>: {results!.rows.length} rows · {step2.placed} bouts fit the bracket</p>
            {step2.items.length === 0 ? (
              <p className="border-l-4 border-emerald-500 bg-emerald-50 px-2 py-1 text-emerald-900"><b>Every bout fits the bracket.</b> They’d be saved now. Done.</p>
            ) : (
              <>
                <p className="border-l-4 border-amber-500 bg-amber-50 px-2 py-1 text-amber-900">
                  <b>{step2.items.length} bout{step2.items.length === 1 ? '' : 's'} don’t fit the bracket. Nothing has been saved.</b> Print the whole
                  tournament to PDF again now that the bouts are in, and load it in step 3.
                </p>
                <ul className="space-y-0.5">
                  {step2.items.filter(i => !i.knockOn).map(i => <li key={i.id}><b>{i.weight}</b> row {i.row.row} · {i.title}: {i.reason}</li>)}
                  {step2.items.some(i => i.knockOn) && <li className="text-slate-500">+ {step2.items.filter(i => i.knockOn).length} more that follow from these</li>}
                </ul>
              </>
            )}
          </div>
        )}
      </Step>

      {(!step2 || needCompleted) && (
        <Step n={3} title="Load the completed brackets (only when something doesn’t fit)" active={needCompleted}>
          <Loader accept="application/pdf,.pdf" onFile={async f => loadCompleted(f.name, new Uint8Array(await f.arrayBuffer()))}
            practiceLabel="Practice: 2024 State completed brackets PDF" onPractice={() => guard('Getting the practice completed brackets…', async () => { await loadCompleted('2024 NJSIAA State completed (practice)', await fetchPractice('pdf') as Uint8Array) })} />
          {completed && now && (
            <div className="mt-3 space-y-3">
              <p className="text-xs text-slate-700">
                <b>{completed.name}</b>: {now.checked} championship bouts compared with the completed bracket.
                {unreadable.length > 0 && <> Couldn’t read: {unreadable.map(w => `${w.weight} (${w.problem})`).join('; ')}</>}
              </p>
              {history.length > 0 && (
                <div className="text-xs text-slate-600">
                  <H4>Fixed so far</H4>
                  <ol className="list-decimal pl-5">{history.map((h, i) => <li key={i}>{h.label}</li>)}</ol>
                  <button onClick={() => setHistory(h => h.slice(0, -1))} className="mt-1 border border-slate-300 px-2 py-0.5 font-semibold hover:bg-slate-50">Undo the last fix</button>
                </div>
              )}
              {roots.length === 0 ? (
                <div className="border-l-4 border-emerald-500 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
                  <p><b>Everything fits the bracket and matches the completed bracket.</b> {now.placed} bouts ready to save.</p>
                  <button disabled title="Mock: nothing is saved here" className="mt-2 bg-emerald-700 px-3 py-1 text-xs font-semibold text-white opacity-60">Save results</button>
                </div>
              ) : (
                <>
                  <p className="text-xs font-semibold text-amber-800">{roots.length} to settle{items.length > roots.length ? ` (+${items.length - roots.length} that fit once these are fixed)` : ''}</p>
                  {roots.map(it => <ItemCard key={it.id} doc={it.show?.source === 'completed' ? completed.doc : bracket!.doc} item={it} followers={followersOf(it.id)} onFix={i => fix(it, i)} />)}
                </>
              )}
            </div>
          )}
        </Step>
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
