'use client'

// One year of a hub tournament: its podiums by weight (folkstyle and freestyle kept apart), the bouts
// with each kid's record, and the import (paste → choose who each kid is → save).
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useAdminGender } from '@/components/admin/AdminGenderContext'
import { UploadPanel, type UploadInfo } from './UploadPanel'
import { HUBS, ordinal, placeLabel, hubSeasonLabel, hubPool, type HubKey, type HubStyle, type HubGender } from '@/lib/hub'

type Prospect = { id: number; first_name: string; last_name: string; state: string | null; class_year: number | null; club_id: number | null; wrestler_id: string | null }
type Placement = { id: number; style: HubStyle; division: string | null; weight: string; place: number; place_to: number | null; name_listed: string; club_listed: string | null; prospect_id: number }
type Bout = { id: number; style: HubStyle; division: string | null; weight: string; round: string | null; winner_prospect_id: number; loser_prospect_id: number; winner_club_listed: string | null; loser_club_listed: string | null; win_type: string | null; score: string | null }
type EventData = {
  event: { id: number; season: number; label: string | null; start_date: string | null }
  tournament: { id: number; name: string; hub: HubKey; format: string | null }
  placements: Placement[]; bouts: Bout[]
  prospects: Record<number, Prospect>; clubs: Record<number, { id: number; name: string }>
  wrestlers: Record<string, { id: string; first_name: string; last_name: string }>
}

const th = 'px-3 py-1 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500'
const td = 'px-3 py-1'
const weightOrder = (w: string) => (/^\d+$/.test(w) ? Number(w) : 9999)

export function EventClient({ eventId, hub }: { eventId: number; hub: HubKey }) {
  const { gender: sideGender, side, loaded } = useAdminGender()
  const gender = hubPool(hub, sideGender)   // Middle School: the mixed pool
  const [data, setData] = useState<EventData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [style, setStyle] = useState<HubStyle>('folkstyle')

  const load = useCallback(() => {
    // the Middle School Hub's mixed pool: this side's kids only
    fetch(`/api/admin/hub/event?gender=${gender}&id=${eventId}${gender === 'X' ? `&sex=${side === 'girls' ? 'F' : 'M'}` : ''}`).then(r => r.json())
      .then(d => d.error ? setError(d.error) : setData(d)).catch(() => setError('Could not load this year'))
  }, [gender, eventId, side])
  useEffect(() => { if (loaded) load() }, [load, loaded])

  if (error) return <div className="max-w-6xl mx-auto px-6 py-8 text-sm text-red-600">{error}</div>
  if (!data) return <div className="max-w-6xl mx-auto px-6 py-8 text-sm text-slate-400">Loading…</div>
  const { event, tournament } = data
  const hubPath = tournament.hub === 'ms' ? 'ms-hub' : 'offseason-hub'
  const nPod = (s: HubStyle) => data.placements.filter(p => p.style === s).length
  const nBout = (s: HubStyle) => data.bouts.filter(b => b.style === s).length

  async function clear(what: 'podium' | 'bouts', n: number) {
    // the mixed pool's clear removes both sides' rows (one import holds both)
    if (!confirm(`Remove all ${gender === 'X' ? '' : `${n} `}${style} ${what === 'podium' ? 'podium places' : 'bouts'} for this year${gender === 'X' ? ', boys and girls,' : ''} so they can be imported again? The kids stay on the prospect list.`)) return
    const res = await fetch(`/api/admin/hub/event?gender=${gender}&id=${eventId}&what=${what}&style=${style}`, { method: 'DELETE' })
    const d = await res.json()
    if (!res.ok) setError(d.error); else load()
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <Link href={`/admin/${side}/${hubPath}?season=${event.season}`} className="text-xs text-slate-500 hover:text-black">← {HUBS[tournament.hub].label} Hub · {hubSeasonLabel(tournament.hub, event.season)}</Link>
      <h1 className="text-lg font-bold text-slate-900 mt-1">{tournament.name} · {hubSeasonLabel(tournament.hub, event.season)}{event.label ? ` · ${event.label}` : ''}</h1>
      <p className="text-sm text-slate-500 mb-4">{[event.start_date, tournament.format, deepest(data.placements) && `placed through ${ordinal(deepest(data.placements)!)}`].filter(Boolean).join(' · ')}</p>

      <div className="flex gap-1 border-b border-slate-200 mb-4">
        {(['folkstyle', 'freestyle'] as const).map(s => (
          <button key={s} onClick={() => setStyle(s)}
            className={`px-3 py-1.5 text-sm -mb-px border-b-2 capitalize ${style === s ? 'border-black font-semibold text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
            {s} {nPod(s) + nBout(s) ? <span className="text-xs text-slate-400">({nPod(s)} places{nBout(s) ? `, ${nBout(s)} bouts` : ''})</span> : null}
          </button>
        ))}
      </div>

      <Podium data={data} style={style} onClear={n => clear('podium', n)} />
      <Bouts data={data} style={style} onClear={n => clear('bouts', n)} />
      <ImportPanel gender={gender} eventId={eventId} style={style} eventDate={event.start_date} onSaved={load} />
    </div>
  )
}

/** How deep the event was placed: its lowest place, counting tied groups to their end (25th–32nd = 32). */
function deepest(rows: Placement[]): number | null {
  return rows.length ? Math.max(...rows.map(r => r.place_to ?? r.place)) : null
}

function who(data: EventData, prospectId: number) {
  const p = data.prospects[prospectId]
  if (!p) return { name: '?', sub: '' }
  const w = p.wrestler_id ? data.wrestlers[p.wrestler_id] : null
  return {
    name: `${p.first_name} ${p.last_name}`,
    sub: [p.club_id ? data.clubs[p.club_id]?.name : null, p.state, p.class_year ? `'${String(p.class_year).slice(2)}` : null, w ? 'HS ✓' : null].filter(Boolean).join(' · '),
  }
}

function Podium({ data, style, onClear }: { data: EventData; style: HubStyle; onClear: (n: number) => void }) {
  const rows = data.placements.filter(p => p.style === style)
  const groups = useMemo(() => {
    const m = new Map<string, Placement[]>()
    for (const p of rows) { const k = `${p.division ?? ''}|${p.weight}`; m.set(k, [...(m.get(k) ?? []), p]) }
    return [...m.entries()].map(([k, ps]) => ({ division: k.split('|')[0], weight: k.split('|')[1], places: ps.sort((a, b) => a.place - b.place) }))
      .sort((a, b) => a.division.localeCompare(b.division) || weightOrder(a.weight) - weightOrder(b.weight) || a.weight.localeCompare(b.weight))
  }, [rows])
  if (!rows.length) return <p className="text-sm text-slate-400 mb-6">No {style} podium loaded.</p>
  const singles = rows.filter(r => !r.place_to)
  const maxPlace = Math.max(0, ...singles.map(r => r.place))
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-semibold text-slate-800">Podium <span className="font-normal text-slate-400">· placed through {ordinal(deepest(rows)!)}</span></h2>
        <button onClick={() => onClear(rows.length)} className="text-xs text-slate-400 hover:text-red-600">Clear to re-import</button>
      </div>
      <div className="overflow-x-auto">
        <table className="text-sm border border-slate-200 w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr><th className={th}>Weight</th>{Array.from({ length: maxPlace }, (_, i) => <th key={i} className={th}>{ordinal(i + 1)}</th>)}</tr>
          </thead>
          <tbody>
            {groups.map(g => (
              <tr key={`${g.division}|${g.weight}`} className="border-b border-slate-100 align-top">
                <td className={`${td} font-medium whitespace-nowrap`}>{g.division ? `${g.division} ` : ''}{g.weight}</td>
                {Array.from({ length: maxPlace }, (_, i) => {
                  const p = g.places.find(x => x.place === i + 1 && !x.place_to)
                  if (!p) return <td key={i} className={td} />
                  const w = who(data, p.prospect_id)
                  return <td key={i} className={td}><div className="font-medium">{w.name}</div><div className="text-[11px] text-slate-400">{w.sub || p.club_listed}</div></td>
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.some(r => r.place_to) && (
        <div className="mt-2 text-xs text-slate-600 space-y-1">
          <p className="font-semibold text-slate-700">Tied places (everyone eliminated in the same round)</p>
          {groups.map(g => {
            const tied = g.places.filter(x => x.place_to)
            if (!tied.length) return null
            const byGroup = new Map<string, Placement[]>()
            for (const t of tied) { const k = placeLabel(t.place, t.place_to); byGroup.set(k, [...(byGroup.get(k) ?? []), t]) }
            return (
              <p key={`${g.division}|${g.weight}`}><b>{g.division ? `${g.division} ` : ''}{g.weight}:</b>{' '}
                {[...byGroup].map(([k, ps]) => <span key={k} className="mr-3">{k}: {ps.map(x => who(data, x.prospect_id).name).join(', ')}</span>)}
              </p>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Bouts({ data, style, onClear }: { data: EventData; style: HubStyle; onClear: (n: number) => void }) {
  const [showAll, setShowAll] = useState(false)
  const rows = data.bouts.filter(b => b.style === style)
  const records = useMemo(() => {
    const m = new Map<number, { w: number; l: number; weights: Set<string> }>()
    const g = (id: number) => m.get(id) ?? m.set(id, { w: 0, l: 0, weights: new Set() }).get(id)!
    for (const b of rows) { g(b.winner_prospect_id).w++; g(b.loser_prospect_id).l++; g(b.winner_prospect_id).weights.add(b.weight); g(b.loser_prospect_id).weights.add(b.weight) }
    return [...m.entries()].map(([id, r]) => ({ id, ...r })).sort((a, b) => b.w - a.w || a.l - b.l)
  }, [rows])
  if (!rows.length) return null
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-semibold text-slate-800">Records ({rows.length} bouts)</h2>
        <div className="flex gap-3">
          <button onClick={() => setShowAll(v => !v)} className="text-xs underline text-slate-500 hover:text-black">{showAll ? 'Hide bouts' : 'Show every bout'}</button>
          <button onClick={() => onClear(rows.length)} className="text-xs text-slate-400 hover:text-red-600">Clear to re-import</button>
        </div>
      </div>
      <table className="text-sm border border-slate-200 w-full mb-2">
        <thead className="bg-slate-50 border-b border-slate-200"><tr><th className={th}>Wrestler</th><th className={th}>Weight</th><th className={th}>W-L</th></tr></thead>
        <tbody>
          {records.map(r => { const w = who(data, r.id); return (
            <tr key={r.id} className="border-b border-slate-100"><td className={td}><span className="font-medium">{w.name}</span> <span className="text-[11px] text-slate-400">{w.sub}</span></td><td className={td}>{[...r.weights].join(', ')}</td><td className={td}>{r.w}-{r.l}</td></tr>
          ) })}
        </tbody>
      </table>
      {showAll && (
        <table className="text-sm border border-slate-200 w-full">
          <thead className="bg-slate-50 border-b border-slate-200"><tr><th className={th}>Wt</th><th className={th}>Round</th><th className={th}>Winner</th><th className={th}>Loser</th><th className={th}>Result</th></tr></thead>
          <tbody>
            {rows.map(b => (
              <tr key={b.id} className="border-b border-slate-100"><td className={td}>{b.weight}</td><td className={td}>{b.round}</td><td className={td}>{who(data, b.winner_prospect_id).name}</td><td className={td}>{who(data, b.loser_prospect_id).name}</td><td className={td}>{[b.win_type, b.score].filter(Boolean).join(' ')}</td></tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

// ── Import ───────────────────────────────────────────────────────────────────

type Choice = { type: 'prospect'; id: number } | { type: 'wrestler'; id: string } | { type: 'new' }
type PreviewPerson = {
  key: string; name: string; club_listed: string | null; club: { id: number; name: string; state: string } | null; state: string | null
  suggestion: Choice | null
  prospects: { id: number; name: string; state: string | null; class_year: number | null; club: string | null; wrestler: string | null; finishes: string[] }[]
  wrestlers: { id: string; name: string; class_year: number | null; is_oos: boolean; schools: string[] }[]
}
type Preview = { rows: unknown[]; skipped: { line: number; text: string; why: string }[]; clashes: string[]; people: PreviewPerson[] }
const choiceValue = (c: Choice | null | undefined) => !c ? '' : c.type === 'new' ? 'new' : `${c.type}:${c.id}`
const parseChoice = (v: string): Choice | null => v === 'new' ? { type: 'new' } : v.startsWith('prospect:') ? { type: 'prospect', id: Number(v.slice(9)) } : v.startsWith('wrestler:') ? { type: 'wrestler', id: v.slice(9) } : null

function ImportPanel({ gender, eventId, style, eventDate, onSaved }: { gender: HubGender; eventId: number; style: HubStyle; eventDate: string | null; onSaved: () => void }) {
  const [kind, setKind] = useState<'podium' | 'bouts'>('podium')
  const [text, setText] = useState('')
  const [preview, setPreview] = useState<Preview | null>(null)
  const [res, setRes] = useState<Record<string, { choice: Choice | null; state: string }>>({})
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [onlyOpen, setOnlyOpen] = useState(false)
  const [showPaste, setShowPaste] = useState(false)
  const [upload, setUpload] = useState<UploadInfo | null>(null)   // the files a review came from; none when pasted

  async function run(action: 'preview' | 'save', textNow = text, kindNow = kind) {
    setBusy(true); setMsg(null)
    const people = Object.fromEntries(Object.entries(res).map(([k, v]) => [k, { choice: v.choice, state: v.state || null, club_id: preview?.people.find(p => p.key === k)?.club?.id ?? null }]))
    const r = await fetch('/api/admin/hub/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ gender, event_id: eventId, kind: kindNow, style, text: textNow, action, people, upload }) })
    const d = await r.json().catch(() => ({ error: 'The server did not answer' }))
    setBusy(false)
    if (!r.ok) return setMsg({ ok: false, text: d.error })
    if (action === 'preview') {
      setPreview(d)
      setRes(Object.fromEntries((d.people as PreviewPerson[]).map(p => [p.key, { choice: p.suggestion, state: p.state ?? '' }])))
    } else {
      setMsg({ ok: true, text: `Saved ${d.saved} ${kind === 'podium' ? 'podium places' : 'bouts'}${d.duplicates_skipped ? ` (${d.duplicates_skipped} already loaded, skipped)` : ''}. New prospects: ${d.prospects_created}; linked to a high school wrestler: ${d.prospects_linked}.` })
      setPreview(null); setText(''); setRes({}); setUpload(null); onSaved()
    }
  }

  const open = preview ? preview.people.filter(p => !res[p.key]?.choice) : []
  // NJ kids first, then anyone still to choose
  const shown = preview ? preview.people.filter(p => !onlyOpen || !res[p.key]?.choice || (p.prospects.length + p.wrestlers.length > 1))
    .sort((a, z) => Number(z.state === 'NJ') - Number(a.state === 'NJ') || Number(!res[z.key]?.choice) - Number(!res[a.key]?.choice)) : []

  return (
    <div className="border border-slate-200 p-4 bg-slate-50/50">
      <h2 className="text-sm font-semibold text-slate-800 mb-2">Add results</h2>
      {/* Individual tournaments only (Kyle 2026-11-12: "i don't care about duals"): uploads, or a pasted podium */}
      <UploadPanel pool={gender} eventDate={eventDate} onUse={(csv, _n, up, k = 'podium') => { setUpload(up); setKind(k); setText(csv); setPreview(null); setShowPaste(false); run('preview', csv, k) }} />
      <button onClick={() => setShowPaste(v => !v)} className="text-xs underline text-slate-500 hover:text-black">{showPaste ? 'Hide' : 'Or paste a podium'}</button>
      {showPaste && (
        <>
          <p className="text-xs text-slate-500 my-2">A table with a header row (Weight, Place, Name, Club; State, Division, Style and Class optional; places like 9-12 for a tie), or a weight line (&ldquo;120&rdquo; or &ldquo;Cadet 120&rdquo;) followed by lines like &ldquo;1st - John Smith (Iron Horse)&rdquo;. Rows without a Style are {style}.</p>
          <textarea value={text} onChange={e => { setText(e.target.value); setPreview(null); setUpload(null) }} rows={8} className="w-full border border-slate-300 p-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-black" />
        </>
      )}
      <div className="flex gap-2 items-center mt-2">
        {showPaste && <button onClick={() => run('preview')} disabled={busy || !text.trim()} className="px-3 py-1 text-sm bg-black text-white disabled:opacity-40">{busy && !preview ? 'Reading…' : 'Preview'}</button>}
        {busy && !preview && !showPaste && <span className="text-sm text-slate-500">Matching names…</span>}
        {msg && <span className={`text-sm ${msg.ok ? 'text-emerald-700' : 'text-red-600'}`}>{msg.text}</span>}
      </div>

      {preview && (
        <div className="mt-4">
          <p className="text-sm text-slate-700 mb-1">
            {preview.rows.length} {kind === 'podium' ? 'places' : 'bouts'} read · {preview.people.length} kids
            {preview.skipped.length ? ` · ${preview.skipped.length} lines skipped` : ''}
          </p>
          {preview.clashes.length > 0 && <p className="text-sm text-red-600 mb-1">Can&apos;t save: {preview.clashes.slice(0, 6).join('; ')}{preview.clashes.length > 6 ? ` (+${preview.clashes.length - 6} more)` : ''}</p>}
          {preview.skipped.length > 0 && (
            <details className="text-xs text-slate-500 mb-2"><summary className="cursor-pointer">Skipped lines</summary>
              {preview.skipped.slice(0, 50).map(s => <div key={s.line}>Line {s.line}: {s.why} — <span className="font-mono">{s.text.slice(0, 120)}</span></div>)}
            </details>
          )}
          <label className="text-xs text-slate-600 flex items-center gap-1 mb-1"><input type="checkbox" checked={onlyOpen} onChange={e => setOnlyOpen(e.target.checked)} /> Only kids still to choose or with more than one match</label>
          <table className="w-full text-sm border border-slate-200 bg-white">
            <thead className="bg-slate-50 border-b border-slate-200"><tr><th className={th}>As listed</th><th className={th}>Club</th><th className={th}>Who it is</th><th className={th}>State</th></tr></thead>
            <tbody>
              {shown.map(p => {
                const r = res[p.key]
                return (
                  <Fragment key={p.key}>
                    <tr className={`border-b border-slate-100 align-top ${!r?.choice ? 'bg-amber-50' : ''}`}>
                      <td className={`${td} font-medium`}>{p.name}</td>
                      <td className={td}>{p.club_listed ?? '—'}{p.club_listed && !p.club && <div className="text-[11px] text-slate-400">not on the club list</div>}</td>
                      <td className={td}>
                        <select value={choiceValue(r?.choice)} onChange={e => setRes({ ...res, [p.key]: { ...r, choice: parseChoice(e.target.value) } })} className="border border-slate-300 px-1 py-0.5 text-sm max-w-[28rem]">
                          <option value="">Choose…</option>
                          {p.prospects.map(x => <option key={`p${x.id}`} value={`prospect:${x.id}`}>Prospect: {x.name}{x.club ? ` · ${x.club}` : ''}{x.state ? ` · ${x.state}` : ''}{x.wrestler ? ' · HS linked' : ''}{x.finishes.length ? ` · ${x.finishes.slice(0, 2).join('; ')}` : ''}</option>)}
                          {p.wrestlers.map(w => <option key={`w${w.id}`} value={`wrestler:${w.id}`}>HS wrestler: {w.name}{w.class_year ? ` · class of ${w.class_year}` : ''}{w.schools.length ? ` · ${w.schools.join(', ')}` : ''}{w.is_oos ? ' · out of state' : ''}</option>)}
                          <option value="new">New prospect</option>
                        </select>
                        {p.prospects.length + p.wrestlers.length > 1 && <div className="text-[11px] text-amber-700">{p.prospects.length + p.wrestlers.length} exact name matches</div>}
                      </td>
                      <td className={td}>
                        <input value={r?.state ?? ''} maxLength={2} onChange={e => setRes({ ...res, [p.key]: { ...r, state: e.target.value.toUpperCase() } })} className="border border-slate-300 px-1 py-0.5 text-sm w-12 uppercase" />
                      </td>
                    </tr>
                  </Fragment>
                )
              })}
            </tbody>
          </table>
          <div className="flex gap-2 items-center mt-2">
            <button onClick={() => run('save')} disabled={busy || open.length > 0 || preview.clashes.length > 0 || !preview.rows.length} className="px-3 py-1 text-sm bg-black text-white disabled:opacity-40">{busy ? 'Saving…' : `Save ${preview.rows.length} ${kind === 'podium' ? 'places' : 'bouts'}`}</button>
            {open.length > 0 && <span className="text-xs text-amber-700">{open.length} kids still to choose</span>}
          </div>
        </div>
      )}
    </div>
  )
}
