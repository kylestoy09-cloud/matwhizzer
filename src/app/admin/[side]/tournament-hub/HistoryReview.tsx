'use client'
// Tournament history review (Kyle 2026-11-20: "put these reviews in the history tab so that i can match with a school,
// same with the wrestlers. make it easier"). Teams: search an NJ school or pick a state. Wrestlers: the candidate profiles
// as buttons, or a new wrestler; the suggestion is marked, and "Accept all suggestions" takes every one at once. Each
// click saves (history_import_review); the history import reads the decisions.
import { useEffect, useMemo, useState } from 'react'

type Decision = { njSchoolId?: number; schoolId?: number; state?: string; wrestlerId?: string; new?: boolean } | null
type TeamItem = { name: string; bouts: number; tournaments: string[]; years: string[]; note: string; guessId: number | null; guess: string | null; guessOos?: boolean; stateGuess?: string | null; guessUnsure?: boolean; states: string[]; samples?: { name: string; tournament: string; season: string; weight: number }[] }
type PersonItem = { name: string; school: string; schoolId: number; season: string; tournament: string; weight: string; candidates: { id: string; name: string; years?: string }[]; suggestion: string }
type Row = { id: number; kind: 'team' | 'wrestler'; key: string; item: TeamItem | PersonItem; decision: Decision; decided_by: string | null }

const STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY']

export function HistoryReview({ gender }: { gender: 'M' | 'F' }) {
  const [rows, setRows] = useState<Row[] | null>(null)
  const [schools, setSchools] = useState<{ id: number; name: string }[]>([])
  const [kind, setKind] = useState<'team' | 'wrestler'>('team')
  const [showDone, setShowDone] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const load = () => fetch(`/api/admin/history-review?gender=${gender}`).then(r => r.json()).then(d => {
    if (d.error) { setMsg(d.error); return }
    setRows(d.items); setSchools(d.schools)
  })
  useEffect(() => { load() }, [gender]) // eslint-disable-line react-hooks/exhaustive-deps
  const schoolName = useMemo(() => new Map(schools.map(s => [s.id, s.name])), [schools])
  const byName = useMemo(() => new Map(schools.map(s => [s.name.toLowerCase(), s.id])), [schools])

  async function decide(r: Row, decision: Decision) {
    setRows(rs => rs!.map(x => (x.id === r.id ? { ...x, decision } : x)))   // show it at once
    const d = await (await fetch('/api/admin/history-review', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: r.id, decision }) })).json()
    if (d.error) { setMsg(d.error); load() }
  }
  async function acceptAllTeams() {
    setBusy(true)
    try {
      const d = await (await fetch('/api/admin/history-review', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ gender, acceptTeamSuggestions: true }) })).json()
      setMsg(d.error ?? `Accepted ${d.accepted} school suggestions.`); await load()
    } finally { setBusy(false) }
  }
  async function acceptAll() {
    setBusy(true)
    try {
      const d = await (await fetch('/api/admin/history-review', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ gender, acceptSuggestions: true }) })).json()
      setMsg(d.error ?? `Accepted ${d.accepted} suggestions.`); await load()
    } finally { setBusy(false) }
  }

  if (!rows) return <p className="text-sm text-slate-400">{msg ?? 'Loading…'}</p>
  const teams = rows.filter(r => r.kind === 'team'), people = rows.filter(r => r.kind === 'wrestler')
  const left = (rs: Row[]) => rs.filter(r => !r.decision).length
  const shown = (kind === 'team' ? teams : people).filter(r => showDone || !r.decision)
  const suggested = people.filter(r => !r.decision && (r.item as PersonItem).suggestion).length

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {(['team', 'wrestler'] as const).map(k => (
          <button key={k} onClick={() => setKind(k)} className={`px-3 py-1 border ${kind === k ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 text-slate-700'}`}>
            {k === 'team' ? `Teams — ${left(teams)} left of ${teams.length}` : `Wrestlers — ${left(people)} left of ${people.length}`}
          </button>
        ))}
        <label className="ml-2 flex items-center gap-1 text-xs text-slate-600"><input type="checkbox" checked={showDone} onChange={e => setShowDone(e.target.checked)} />show decided</label>
        {kind === 'team' && teams.some(r => !r.decision && ((r.item as TeamItem).guessId || (r.item as TeamItem).stateGuess)) && (
          <button disabled={busy} onClick={acceptAllTeams} className="ml-auto bg-emerald-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-40">Accept all {teams.filter(r => !r.decision && ((r.item as TeamItem).guessId || (r.item as TeamItem).stateGuess)).length} school suggestions</button>
        )}
        {kind === 'wrestler' && suggested > 0 && (
          <button disabled={busy} onClick={acceptAll} className="ml-auto bg-emerald-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-40">Accept all {suggested} suggestions</button>
        )}
      </div>
      {msg && <p className="text-xs text-slate-600">{msg}</p>}
      {shown.length === 0 && <p className="text-sm text-slate-500">Nothing left to decide here.</p>}

      <div className="divide-y divide-slate-100 border border-slate-200">
        {shown.map(r => r.kind === 'team'
          ? <TeamRow key={r.id} r={r} schools={schools} schoolName={schoolName} byName={byName} decide={decide} />
          : <PersonRow key={r.id} r={r} decide={decide} />)}
      </div>
    </div>
  )
}

function TeamRow({ r, schools, schoolName, byName, decide }: { r: Row; schools: { id: number; name: string }[]; schoolName: Map<number, string>; byName: Map<string, number>; decide: (r: Row, d: Decision) => void }) {
  const t = r.item as TeamItem
  const [q, setQ] = useState('')
  const listId = `nj-schools-${r.id}`
  const d = r.decision
  return (
    <div className="space-y-1 px-3 py-2">
      <div className="flex flex-wrap items-baseline gap-x-3">
        <span className="font-semibold text-slate-900">{t.name}</span>
        <span className="text-xs text-slate-500">{t.bouts} bouts · {t.tournaments.join(', ')} · {t.years[0]}{t.years.length > 1 ? `–${t.years[t.years.length - 1]}` : ''}</span>
        {t.note && <span className="text-xs text-amber-700">{t.note}</span>}
      </div>
      {t.samples?.length ? (
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="text-slate-400">Search:</span>
          {t.samples.map(w => (
            <a key={w.name} target="_blank" rel="noopener noreferrer"
              href={`https://www.google.com/search?q=${encodeURIComponent(`"${w.name}" "${t.name}" wrestling ${w.tournament.replace(/ Tournament$/, '')} ${w.season.slice(0, 4)}`)}`}
              className="border border-slate-300 px-1.5 py-0.5 text-blue-700 hover:bg-slate-50">{w.name} · {t.name} ↗</a>
          ))}
          <a target="_blank" rel="noopener noreferrer" href={`https://www.google.com/search?q=${encodeURIComponent(`"${t.name}" high school wrestling`)}`}
            className="border border-slate-300 px-1.5 py-0.5 text-blue-700 hover:bg-slate-50">{t.name} high school wrestling ↗</a>
        </div>
      ) : null}
      {d ? (
        <div className="flex items-center gap-3 text-sm text-green-800">
          {d.njSchoolId ? <>NJ: <strong>{schoolName.get(d.njSchoolId) ?? d.njSchoolId}</strong></>
            : d.schoolId ? <>School: <strong>{schoolName.get(d.schoolId) ?? (d.schoolId === t.guessId ? t.guess : d.schoolId)}</strong></>
            : <>Out of state: <strong>{t.name} ({d.state})</strong></>}
          <button onClick={() => decide(r, null)} className="text-xs text-slate-500 underline">change</button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {t.guessId && t.guess && <button onClick={() => decide(r, { schoolId: t.guessId! })} className={`border px-2 py-0.5 text-xs ${t.guessUnsure ? 'border-amber-400 bg-amber-50 text-amber-800' : 'border-emerald-500 bg-emerald-50 text-emerald-800'}`}>{t.guess}?{t.guessUnsure ? ' (less sure)' : ''}</button>}
          {!t.guessId && t.stateGuess && <button onClick={() => decide(r, { state: t.stateGuess! })} className={`border px-2 py-0.5 text-xs ${t.guessUnsure ? 'border-amber-400 bg-amber-50 text-amber-800' : 'border-emerald-500 bg-emerald-50 text-emerald-800'}`}>Out of state: {t.name} ({t.stateGuess})?{t.guessUnsure ? ' (less sure)' : ''}</button>}
          <input list={listId} value={q} onChange={e => { setQ(e.target.value); const id = byName.get(e.target.value.toLowerCase()); if (id) decide(r, { njSchoolId: id }) }}
            placeholder="Search NJ schools…" className="w-56 border border-slate-300 px-2 py-0.5 text-sm" />
          <datalist id={listId}>{schools.filter(s => !q || s.name.toLowerCase().includes(q.toLowerCase())).slice(0, 40).map(s => <option key={s.id} value={s.name} />)}</datalist>
          <span className="text-xs text-slate-400">or out of state:</span>
          {t.states.filter(st => st !== 'NJ').map(st => <button key={st} onClick={() => decide(r, { state: st })} className="border border-slate-300 px-2 py-0.5 text-xs text-slate-700 hover:bg-slate-50">{st}</button>)}
          <select value="" onChange={e => e.target.value && decide(r, { state: e.target.value })} className="border border-slate-300 px-1 py-0.5 text-xs">
            <option value="">state…</option>
            {STATES.map(st => <option key={st} value={st}>{st}</option>)}
          </select>
        </div>
      )}
    </div>
  )
}

function PersonRow({ r, decide }: { r: Row; decide: (r: Row, d: Decision) => void }) {
  const p = r.item as PersonItem
  const d = r.decision
  const sameFirst = p.suggestion?.startsWith('same'), newSugg = p.suggestion?.startsWith('new')
  return (
    <div className="space-y-1 px-3 py-2">
      <div className="flex flex-wrap items-baseline gap-x-3">
        <span className="font-semibold text-slate-900">{p.name}</span>
        <span className="text-xs text-slate-500">{p.school} · <strong className="text-slate-700">{p.season}</strong> {p.tournament} · {p.weight}</span>
        {p.suggestion && !d && <span className="text-xs text-emerald-700">suggested: {p.suggestion}</span>}
      </div>
      {d ? (
        <div className="flex items-center gap-3 text-sm text-green-800">
          {d.new ? 'New wrestler' : <>Same as <a href={`/wrestler/${d.wrestlerId}`} target="_blank" className="font-semibold underline">{p.candidates.find(c => c.id === d.wrestlerId)?.name ?? 'profile'}</a></>}
          {r.decided_by?.includes('(suggestion)') && <span className="text-xs text-slate-400">(suggestion)</span>}
          <button onClick={() => decide(r, null)} className="text-xs text-slate-500 underline">change</button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {p.candidates.map((c, i) => (
            <span key={c.id} className="inline-flex items-center">
              <button onClick={() => decide(r, { wrestlerId: c.id })} className={`border px-2 py-0.5 text-xs ${i === 0 && sameFirst ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-slate-300 text-slate-700 hover:bg-slate-50'}`}>Same as {c.name}{c.years ? <span className="ml-1 text-slate-400">({c.years})</span> : <span className="ml-1 text-slate-400">(no years on record)</span>}</button>
              <a href={`/wrestler/${c.id}`} target="_blank" title="Open the profile" className="ml-0.5 text-xs text-blue-700">↗</a>
            </span>
          ))}
          <button onClick={() => decide(r, { new: true })} className={`border px-2 py-0.5 text-xs ${newSugg ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-slate-300 text-slate-700 hover:bg-slate-50'}`}>New wrestler</button>
        </div>
      )}
    </div>
  )
}
