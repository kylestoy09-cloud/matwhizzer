'use client'
import { COLLEGE_LEVELS } from '@/lib/ncaa/stats'
// College results (Kyle 2026-11-17): Progress — every championship by year, what we have and what's reviewed
// (ProgressGrid.tsx); Review — entrants who might be ours, with each candidate; Matched — the ones
// tied to our wrestlers (automatic = certain, or confirmed by Kyle), with undo; Championships — what's loaded, and a
// new upload (the PDFs are read here in the browser: src/lib/ncaa/parse.ts). API: /api/admin/college

import { useAdminGender } from '@/components/admin/AdminGenderContext'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { parseNcaa, mergeParses, parseOfficialBouts, parseStatsBouts, checkBouts, type Item, type NcaaBout, type NcaaParse } from '@/lib/ncaa/parse'
import { applyPlaceFixes } from '@/lib/ncaa/corrections'
import { CollegeReviewCard } from '@/components/admin/CollegeReviewCard'
import type { ReviewRow } from '@/lib/ncaa/reviewShared'
import { ProgressGrid, type ProgressEv } from './ProgressGrid'

type Cand = { wrestler_id: string; name: string; schools: string; hs: string; gap: string; why: string }
type Row = { id: number; level: string; year: number; weight: number; name: string; college_raw: string; college: { name: string; primary_color: string | null; secondary_color: string | null } | null; seed: number | null; place: number | null; wrestler_id: string | null; wrestler: string | null; match_status: string; note: string | null; candidates: Cand[]; reviewed_by: string | null }
type Ev = ProgressEv & { imported_at: string }
// the same list the site's college tabs use (src/lib/ncaa/stats.ts)
const LEVELS = { M: COLLEGE_LEVELS.M.map(l => l.level), F: COLLEGE_LEVELS.F.map(l => l.level) }
const ord = (n: number) => `${n}${['th', 'st', 'nd', 'rd'][n % 100 >= 11 && n % 100 <= 13 ? 0 : Math.min(n % 10, 4) > 3 ? 0 : n % 10] ?? 'th'}`
const th = 'px-2 py-1 text-left text-[11px] font-semibold uppercase text-slate-500 whitespace-nowrap'

function CollegeChip({ c, raw }: { c: Row['college']; raw: string }) {
  return c ? <span className="inline-block px-1.5 py-0.5 text-[11px] font-semibold" style={{ background: c.primary_color ?? '#334155', color: c.secondary_color ?? '#fff' }}>{c.name}</span> : <span className="text-xs text-slate-500">{raw}</span>
}

export function CollegeClient() {
  const { gender } = useAdminGender()
  const side = gender === 'F' ? 'girls' : 'boys'
  const [tab, setTab] = useState<'progress' | 'review' | 'matched' | 'events'>('progress')
  const [rows, setRows] = useState<Row[]>([])
  const [events, setEvents] = useState<Ev[]>([])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const d = await (await fetch(`/api/admin/college?gender=${gender}&view=${tab === 'events' || tab === 'progress' ? 'events' : tab}`)).json()
      if (d.error) { setMsg({ ok: false, text: d.error }); return }
      if (tab === 'events' || tab === 'progress') setEvents(d.events); else setRows(d.rows)
    } finally { setLoading(false) }
  }, [gender, tab])
  useEffect(() => { load() }, [load])

  async function act(id: number, action: string, wrestler_id?: string) {
    const d = await (await fetch('/api/admin/college', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ gender, id, action, wrestler_id }) })).json()
    if (d.error) { setMsg({ ok: false, text: d.error }); return }
    setMsg({ ok: true, text: action === 'accept' ? `Matched${d.also ? ` (and ${d.also} more year${d.also > 1 ? 's' : ''} of the same wrestler)` : ''}.` : action === 'not_ours' ? `Marked not ours${d.also ? ` (and his ${d.also} other year${d.also > 1 ? 's' : ''} at that college)` : ''}.` : 'Back to review.' })
    load()
  }

  return (
    <div className="space-y-4">
      {msg && <div className={`border px-3 py-2 text-sm ${msg.ok ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-800'}`}>{msg.text} <button onClick={() => setMsg(null)} className="ml-2 text-xs underline">dismiss</button></div>}
      <div className="flex gap-1 border-b border-slate-200">
        {([['progress', 'Progress'], ['review', 'Review'], ['matched', 'Matched'], ['events', 'Championships']] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`-mb-px border-b-2 px-4 py-2 text-xs font-semibold ${tab === k ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-700'}`}>{l}</button>
        ))}
      </div>
      {loading && <p className="text-sm text-slate-400">Loading…</p>}

      {tab === 'review' && !loading && (rows.length === 0 ? <p className="text-sm text-slate-400">Nothing waiting.</p> : (
        <div className="space-y-2">
          <p className="text-xs text-slate-500">{rows.length} college entrants might be ours. These are also dealt in Microcheck (College review).</p>
          {rows.map(r => <CollegeReviewCard key={r.id} row={r as unknown as ReviewRow} gender={gender} onAct={(a, w) => act(r.id, a, w)} />)}
        </div>
      ))}

      {tab === 'matched' && !loading && (
        <div className="overflow-x-auto border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50"><tr>{['Year', 'Level', 'Wt', 'Entrant', 'College', 'Place', 'Our wrestler', 'How', ''].map(h => <th key={h} className={th}>{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map(r => (
                <tr key={r.id}>
                  <td className="px-2 py-1 tabular-nums">{r.year}</td><td className="px-2 py-1 text-xs text-slate-500">{r.level}</td><td className="px-2 py-1 tabular-nums">{r.weight}</td>
                  <td className="px-2 py-1">{r.name}</td><td className="px-2 py-1"><CollegeChip c={r.college} raw={r.college_raw} /></td>
                  <td className="px-2 py-1 tabular-nums">{r.place ? ord(r.place) : ''}</td>
                  <td className="px-2 py-1">{r.wrestler_id && <Link href={`/admin/${side}/wrestlers/${r.wrestler_id}`} className="hover:underline">{r.wrestler}</Link>}</td>
                  <td className="px-2 py-1 text-xs text-slate-500">{r.match_status === 'auto' ? 'automatic' : 'confirmed'}</td>
                  <td className="px-2 py-1 text-right"><button onClick={() => act(r.id, 'undo')} className="text-xs text-slate-500 underline hover:text-red-700">Undo</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'progress' && !loading && <ProgressGrid events={events} gender={gender} onChanged={load} setMsg={setMsg} />}

      {tab === 'events' && !loading && <Championships events={events} gender={gender} onSaved={load} setMsg={setMsg} />}
    </div>
  )
}

function Championships({ events, gender, onSaved, setMsg }: { events: Ev[]; gender: 'M' | 'F'; onSaved: () => void; setMsg: (m: { ok: boolean; text: string }) => void }) {
  const [level, setLevel] = useState(LEVELS[gender][0])
  const [files, setFiles] = useState<File[]>([])
  const [parsed, setParsed] = useState<NcaaParse | null>(null)
  const [bouts, setBouts] = useState<NcaaBout[]>([])
  const [year, setYear] = useState<number | ''>('')
  const [busy, setBusy] = useState(false)

  async function read(list: File[]) {
    setFiles(list); setParsed(null)
    if (!list.length) return
    setBusy(true)
    try {
      const { getDocumentProxy } = await import('unpdf')
      const parts: NcaaParse[] = []
      const found: NcaaBout[] = []
      for (const f of list) {
        const pdf = await getDocumentProxy(new Uint8Array(await f.arrayBuffer()))
        const items: Item[] = []
        for (let p = 1; p <= pdf.numPages; p++) {
          const tc = await (await pdf.getPage(p)).getTextContent()
          for (const it of tc.items as { str: string; transform: number[]; width: number }[]) if (it.str?.trim()) items.push({ p, s: it.str.trim(), x: it.transform[4], y: it.transform[5], w: it.width })
        }
        const one = parseNcaa(items)
        parts.push(one)
        if (one.format === 'official') found.push(...parseOfficialBouts(items, one.weights))
        else if (one.format === 'stats') found.push(...parseStatsBouts(items, one.weights))
      }
      const y = parts.find(p => p.year)?.year ?? Number(list[0].name.match(/(19|20)\d{2}/)?.[0]) ?? null
      setYear(y ?? '')
      setParsed(y ? applyPlaceFixes(level, y, mergeParses(parts)) : mergeParses(parts))
      setBouts(found)
    } finally { setBusy(false) }
  }

  async function save() {
    if (!parsed || !year) return
    setBusy(true)
    try {
      const d = await (await fetch('/api/admin/college', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gender, action: 'import', level, year, weights: parsed.weights, bouts, files: files.map(f => f.name) }) })).json()
      if (d.error) { setMsg({ ok: false, text: d.error }); return }
      setMsg({ ok: true, text: `${year} ${level}: ${d.entrants} entrants, ${d.bouts} bouts — ${d.auto} matched, ${d.review} to review${d.kept ? `, ${d.kept} earlier decisions kept` : ''}${d.unknown_colleges.length ? `. Colleges not on the list: ${d.unknown_colleges.join(', ')}` : ''}.` })
      setFiles([]); setParsed(null); onSaved()
    } finally { setBusy(false) }
  }

  const probs = [...(parsed?.weights.flatMap(w => w.problems) ?? []), ...(parsed && bouts.length ? checkBouts(parsed.weights, bouts) : [])]
  return (
    <div className="space-y-4">
      <div className="border border-slate-200 p-3">
        <h3 className="mb-2 text-sm font-semibold text-slate-800">Load a championship</h3>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs text-slate-500">Level<select value={level} onChange={e => setLevel(e.target.value)} className="mt-0.5 block border border-slate-300 px-2 py-1 text-sm">{LEVELS[gender].map(l => <option key={l}>{l}</option>)}</select></label>
          <label className="text-xs text-slate-500">PDF(s) for one year<input type="file" accept="application/pdf" multiple onChange={e => read([...(e.target.files ?? [])])} className="mt-0.5 block text-sm" /></label>
          <label className="text-xs text-slate-500">Year<input value={year} onChange={e => setYear(Number(e.target.value) || '')} className="mt-0.5 block w-20 border border-slate-300 px-2 py-1 text-sm" /></label>
          <button onClick={save} disabled={busy || !parsed?.weights.length || !year} className="bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40">{busy ? 'Working…' : 'Save and match'}</button>
        </div>
        {parsed && (
          <div className="mt-2 text-xs text-slate-600">
            Read as <strong>{parsed.format}</strong>: {parsed.weights.length} weights, {parsed.weights.reduce((n, w) => n + w.entrants.length, 0)} entrants, {parsed.weights.reduce((n, w) => n + w.placers.length, 0)} places, {bouts.length} bouts{bouts.length ? '' : ' (this layout gives places only so far)'}.
            {probs.length > 0 && <ul className="mt-1 list-disc pl-5 text-amber-700">{probs.map((p, i) => <li key={i}>{p}</li>)}</ul>}
            {parsed.format === 'unknown' && <p className="text-red-700">This layout isn&apos;t one the import knows yet.</p>}
          </div>
        )}
      </div>
      <div className="overflow-x-auto border border-slate-200">
        <table className="min-w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50"><tr>{['Level', 'Year', 'Entrants', 'Places', 'Automatic', 'Confirmed', 'To review', 'Not ours', 'Files'].map(h => <th key={h} className={th}>{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">
            {events.map(e => (
              <tr key={e.id}>
                <td className="px-2 py-1">{e.level}</td><td className="px-2 py-1 tabular-nums">{e.year}</td>
                <td className="px-2 py-1 tabular-nums">{e.entrants}</td><td className="px-2 py-1 tabular-nums">{e.places}</td>
                <td className="px-2 py-1 tabular-nums">{e.auto}</td><td className="px-2 py-1 tabular-nums">{e.confirmed}</td>
                <td className={`px-2 py-1 tabular-nums ${e.review ? 'font-semibold text-amber-700' : ''}`}>{e.review}</td><td className="px-2 py-1 tabular-nums">{e.not_ours}</td>
                <td className="px-2 py-1 text-xs text-slate-500">{(e.source_files ?? []).join(', ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
