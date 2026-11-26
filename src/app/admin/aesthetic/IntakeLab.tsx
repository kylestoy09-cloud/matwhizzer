'use client'
// Import review (Kyle 2026-11-26: "add a tab so that i can see how the import works when there's a discrepancy in the
// data and you show us the actual pdf and what you are getting tripped up on"). A mock of the bracket intake's
// review step: the real importer (src/lib/bracketIntake/) reads a Flo bracket PDF and results CSV in the browser,
// and every bout that doesn't fit is shown beside the zoomed PDF section, with the lines it's tripping on boxed.
// Practice files: the 2024 NJSIAA State Championships with mistakes put in on purpose (practice.ts), or any
// tournament's own files. Nothing is saved.
import { useEffect, useRef, useState } from 'react'
import { pdfPages } from '@/lib/bracketIntake/pdfText'
import { readFloDraws, type WeightDraw } from '@/lib/bracketIntake/flo'
import { readFloResults, type ResultRow } from '@/lib/bracketIntake/results'
import { reviewIntake, type IntakeReport, type ReviewItem } from '@/lib/bracketIntake/review'
import { PRACTICE } from '@/lib/bracketIntake/practice'

type PdfJs = typeof import('pdfjs-dist')
type PdfDoc = Awaited<ReturnType<PdfJs['getDocument']>['promise']>

let pdfjsP: Promise<PdfJs> | null = null
// pdf.js runs on the page itself: importing its worker module sets globalThis.pdfjsWorker, which pdf.js then uses
// (no separate worker file to serve)
const loadPdfJs = () => (pdfjsP ??= (async () => { await import('pdfjs-dist/build/pdf.worker.min.mjs'); return import('pdfjs-dist') })())

const SCALE = 2
// each page is drawn once and the crops are cut from it
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

const TONE = { red: '#dc2626', amber: '#d97706' }

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
      const top = s.top * SCALE, h = Math.min((s.bottom - s.top) * SCALE, full.height - top)
      c.width = full.width; c.height = h
      const g = c.getContext('2d')!
      g.drawImage(full, 0, top, full.width, h, 0, 0, full.width, h)
      const x0 = (s.x - 5) * SCALE, x1 = full.width * 0.335
      g.font = `bold ${11 * SCALE}px system-ui, sans-serif`
      for (const m of item.marks) {
        const y = m.top * SCALE - top - 3 * SCALE
        g.strokeStyle = TONE[m.tone]; g.lineWidth = 2.5 * SCALE / 2
        g.strokeRect(x0, y, x1 - x0, 15 * SCALE)
        g.fillStyle = TONE[m.tone]
        g.fillText(`line ${m.line + 1} · ${m.label}`, x1 + 6 * SCALE, y + 11 * SCALE)
      }
    }).catch(e => alive && setErr(String(e)))
    return () => { alive = false }
  }, [doc, s, item.marks])
  if (!s) return <p className="p-3 text-xs text-slate-500">No bracket in the PDF to show for this one.</p>
  if (err) return <p className="p-3 text-xs text-red-700">Couldn’t draw the PDF: {err}</p>
  return (
    <div>
      <p className="mb-1 text-[11px] text-slate-500">PDF page {s.page} · the {s.weight} bracket</p>
      <canvas ref={ref} className="block w-full border border-slate-200 bg-white" />
    </div>
  )
}

function BoutLine({ r }: { r: ResultRow }) {
  return (
    <span>
      <span className="text-slate-500">{r.round || '(no round)'}:</span>{' '}
      <b>{r.winner}</b> <span className="text-slate-500">({r.winnerTeam})</span> over {r.loser} <span className="text-slate-500">({r.loserTeam})</span>
      {r.result && <> · {r.result}</>}
    </span>
  )
}

function ItemCard({ doc, item, followers }: { doc: PdfDoc; item: ReviewItem; followers: ReviewItem[] }) {
  return (
    <div className="border border-slate-300 bg-white">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-200 bg-amber-50 px-3 py-1.5">
        <span className="text-sm font-bold text-slate-900">{item.weight} · {item.title}</span>
        <span className="text-[11px] text-slate-500">results file row {item.row.row}</span>
      </div>
      <div className="space-y-3 p-3">
        <PdfCrop doc={doc} item={item} />
        <div className="grid gap-x-6 gap-y-3 text-xs text-slate-700 md:grid-cols-2">
          <div>
            <h4 className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">The results file says</h4>
            <p><BoutLine r={item.row} /></p>
          </div>
          <div>
            <h4 className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">What doesn’t fit</h4>
            <p>{item.reason}</p>
          </div>
          {item.hint && (
            <div>
              <h4 className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">Why, most likely</h4>
              <p>{item.hint}</p>
            </div>
          )}
          {item.related.length > 0 && (
            <div>
              <h4 className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">Their other championship bouts in the file</h4>
              <ul className="space-y-0.5">{item.related.map(r => <li key={r.row}><BoutLine r={r} /> <span className="text-slate-400">· row {r.row}</span></li>)}</ul>
            </div>
          )}
          <div>
            <h4 className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">Fix</h4>
            <div className="flex flex-wrap gap-1.5">
              {item.fixes.map(f => <button key={f} disabled title="Mock: the real Load results step saves this" className="border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 disabled:cursor-not-allowed">{f}</button>)}
            </div>
          </div>
          {followers.length > 0 && (
            <div className="border-t border-slate-200 pt-2 md:col-span-2">
              <h4 className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">Also flagged because of this one ({followers.length})</h4>
              <ul className="space-y-0.5 text-slate-600">{followers.map(f => <li key={f.id}><BoutLine r={f.row} /> <span className="text-slate-400">· row {f.row.row}</span></li>)}</ul>
              <p className="mt-1 text-[11px] text-slate-500">These fit on their own once this is fixed.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

type Run = { report: IntakeReport; doc: PdfDoc; draws: WeightDraw[]; label: string; missed: { label: string; bout: ResultRow }[] }

export function IntakeLab() {
  const [mode, setMode] = useState<'practice' | 'files'>('practice')
  const [on, setOn] = useState<Set<string>>(() => new Set(PRACTICE.map(p => p.key)))
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [run, setRun] = useState<Run | null>(null)

  const go = async () => {
    try {
      setRun(null)
      let pdfBytes: Uint8Array, csvText: string, label: string
      if (mode === 'practice') {
        setStatus('Getting the 2024 State files…')
        const [p, c] = await Promise.all([fetch('/api/admin/bracket-intake/sample?f=pdf'), fetch('/api/admin/bracket-intake/sample?f=csv')])
        if (!p.ok || !c.ok) throw new Error('Could not load the practice files')
        pdfBytes = new Uint8Array(await p.arrayBuffer()); csvText = await c.text(); label = '2024 NJSIAA State Championships (practice)'
      } else {
        if (!pdfFile || !csvFile) { setStatus('Pick the bracket PDF and the results CSV.'); return }
        pdfBytes = new Uint8Array(await pdfFile.arrayBuffer()); csvText = await csvFile.text(); label = pdfFile.name.replace(/\.pdf$/i, '')
      }
      setStatus('Reading the bracket PDF…')
      const pdfjs = await loadPdfJs()
      const draws = readFloDraws(await pdfPages(pdfjs as never, pdfBytes.slice()))   // pdf.js takes the bytes it's given
      const { rows, problems } = readFloResults(csvText)
      if (problems.length && !rows.length) throw new Error(problems[0])
      const missed: Run['missed'] = []
      if (mode === 'practice') for (const p of PRACTICE.filter(p => on.has(p.key))) {
        const bout = p.apply(rows)
        if (bout && !p.caught) missed.push({ label: p.label, bout: { ...bout } })
      }
      const report = reviewIntake(draws, rows)
      const doc = await pdfjs.getDocument({ data: pdfBytes.slice() }).promise
      setRun({ report, doc, draws, label, missed })
      setStatus(null)
    } catch (e) { setStatus(e instanceof Error ? e.message : String(e)) }
  }

  const items = run?.report.items ?? []
  const roots = items.filter(i => !i.knockOn)
  const followersOf = (id: string): ReviewItem[] => items.filter(i => i.knockOn === id).flatMap(i => [i, ...followersOf(i.id)])
  const placed = run?.report.fits.reduce((n, f) => n + f.placed.length, 0) ?? 0

  return (
    <div className="space-y-4">
      <div className="border border-slate-200 bg-white p-4 text-xs text-slate-700 space-y-3">
        <p className="text-sm text-slate-600">
          How the bracket import shows a problem: the bracket PDF is read first, then every bout in the results file has
          to fit it. Anything that doesn’t is listed here beside the part of the PDF it’s about. <b>Red</b> boxes are the
          wrestlers the results file names; <b>amber</b> boxes are who the importer thinks it should be. Nothing here is saved.
        </p>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-1.5"><input type="radio" checked={mode === 'practice'} onChange={() => setMode('practice')} /> Practice: 2024 State with mistakes put in</label>
          <label className="flex items-center gap-1.5"><input type="radio" checked={mode === 'files'} onChange={() => setMode('files')} /> My own files (Flo PDF + CSV)</label>
        </div>
        {mode === 'practice' ? (
          <div className="space-y-1">
            {PRACTICE.map(p => (
              <label key={p.key} className="flex items-center gap-2">
                <input type="checkbox" checked={on.has(p.key)} onChange={e => setOn(s => { const n = new Set(s); if (e.target.checked) n.add(p.key); else n.delete(p.key); return n })} />
                {p.label}
              </label>
            ))}
            <p className="text-[11px] text-slate-500">Leave them all off to see the real file go through clean.</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-4">
            <label className="flex flex-col gap-1">Bracket PDF<input type="file" accept="application/pdf,.pdf" onChange={e => setPdfFile(e.target.files?.[0] ?? null)} /></label>
            <label className="flex flex-col gap-1">Results CSV<input type="file" accept=".csv,text/csv" onChange={e => setCsvFile(e.target.files?.[0] ?? null)} /></label>
          </div>
        )}
        <div className="flex items-center gap-3">
          <button onClick={go} className="bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-700">Run the import</button>
          {status && <span className="text-slate-600">{status}</span>}
        </div>
      </div>

      {run && (
        <>
          <div className="border border-slate-200 bg-white p-4 text-sm text-slate-700">
            <h3 className="font-bold text-slate-900">{run.label}</h3>
            <p className="mt-1">
              {run.draws.length} weights read from the PDF · {placed} bouts fit the bracket ·{' '}
              {roots.length ? <b className="text-amber-700">{roots.length} to review{items.length > roots.length ? ` (+${items.length - roots.length} that follow from them)` : ''}</b> : <b className="text-emerald-700">nothing to review: it would save</b>}
            </p>
            {run.report.noDraw.length > 0 && <p className="mt-1 text-xs text-slate-500">Results at a weight with no bracket in the PDF: {run.report.noDraw.map(n => `${n.weight} (${n.bouts})`).join(', ')}</p>}
            {run.missed.map(m => (
              <p key={m.label} className="mt-2 border-l-4 border-red-500 bg-red-50 px-2 py-1 text-xs text-red-900">
                <b>Not caught:</b> {m.label}. The file now says <BoutLine r={m.bout} />. It still fits the bracket, because nothing comes after a final to contradict it.
              </p>
            ))}
          </div>
          {roots.map(it => <ItemCard key={it.id} doc={run.doc} item={it} followers={followersOf(it.id)} />)}
          <details className="border border-slate-200 bg-white p-3 text-xs text-slate-700">
            <summary className="cursor-pointer font-semibold">Every weight</summary>
            <table className="mt-2 w-full text-[12px]">
              <thead><tr className="text-left text-slate-500"><th className="px-3 py-1">Weight</th><th className="px-3 py-1">PDF page</th><th className="px-3 py-1">Bracket lines</th><th className="px-3 py-1">Championship bouts</th><th className="px-3 py-1">Consolation bouts</th><th className="px-3 py-1">To review</th></tr></thead>
              <tbody>
                {run.report.fits.map(f => {
                  const d = run.draws.find(x => x.weight === f.weight)
                  return (
                    <tr key={f.weight} className="border-t border-slate-100">
                      <td className="px-3 py-1 font-semibold">{f.weight}</td>
                      <td className="px-3 py-1">{d?.page}</td>
                      <td className="px-3 py-1">{d?.lines.length}</td>
                      <td className="px-3 py-1">{f.placed.filter(p => p.side === 'champ').length}</td>
                      <td className="px-3 py-1">{f.placed.filter(p => p.side === 'cons').length}</td>
                      <td className={`px-3 py-1 ${f.flags.length ? 'font-semibold text-amber-700' : 'text-slate-400'}`}>{f.flags.length || '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </details>
        </>
      )}
    </div>
  )
}
