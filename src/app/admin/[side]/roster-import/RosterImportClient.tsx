'use client'
// Roster Import (preseason step 3): this season's Track rosters against last season's rollover.
// Rules: src/lib/trackIntake/rosterReview.ts. Boys and girls each have their own page and tables.
import { Fragment, useEffect, useMemo, useState } from 'react'
import { rtfToText } from '@/lib/hubFiles'
import { readTrackRosters } from '@/lib/trackIntake/rosters'
import type { Suggestion } from '@/lib/trackIntake/rosterReview'
import type { Side } from '@/lib/trackIntake/teamReview'

type ReviewRow = {
  id: string; school_id: number; schoolName: string; name: string; weight: number | null; grade: string | null; track_gender: string | null
  wrestler_id: string | null; pool_id: string | null; match: 'wrestler' | 'pool' | 'new'; expected_grade: string | null; review_reason: string | null
  suggestions: Suggestion[]; round: number
}
type SchoolRow = { schoolId: number; name: string; team: string; round: number; loadedAt: string; listed: number; confirmed: number; review: number; shown: number; dropped: number; missing: { id: string; name: string; grade: string | null; kind: string }[] }
type Data = { season?: { id: number; label: string }; schools?: SchoolRow[]; review?: ReviewRow[]; total?: number; migrationPending?: boolean; error?: string }

export function RosterImportClient({ side }: { side: Side }) {
  const [data, setData] = useState<Data | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [unmatched, setUnmatched] = useState<{ team: string; count: number }[]>([])
  const [tab, setTab] = useState<'review' | 'schools'>('review')
  const [open, setOpen] = useState<number | null>(null)

  useEffect(() => { fetch(`/api/admin/season-roster?side=${side}`).then(r => r.json()).then(setData) }, [side])

  const post = async (body: Record<string, unknown>, label: string) => {
    setBusy(label); setMsg(null)
    try {
      const r = await fetch('/api/admin/season-roster', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ side, ...body }) })
      const d = await r.json()
      if (d.error) { setMsg(d.error); return null }
      setData(prev => ({ ...prev, ...d }))
      return d
    } finally { setBusy(null) }
  }
  const read = async (text: string) => {
    const rosters = readTrackRosters(rtfToText(text))
    if (!rosters.length) { setMsg('No rosters found. Save Track’s team roster pages (each starting “<School> Roster”) as RTF, or copy them.'); return }
    setMsg(`Matching ${rosters.length} rosters (${rosters.reduce((n, r) => n + r.rows.length, 0)} wrestlers) against last season… this takes a little while.`)
    const d = await post({ action: 'load', rosters }, 'load')
    if (d) {
      setUnmatched(d.unmatchedTeams ?? [])
      setMsg(`Loaded ${rosters.length - (d.unmatchedTeams?.length ?? 0)} schools: ${d.inserted} new lines, ${d.updated} read again.`)
    }
  }

  const review = useMemo(() => data?.review ?? [], [data])
  const bySchool = useMemo(() => {
    const m = new Map<string, ReviewRow[]>()
    for (const r of review) m.set(r.schoolName, [...(m.get(r.schoolName) ?? []), r])
    return [...m]
  }, [review])
  const plainNew = review.filter(r => r.match === 'new' && !r.suggestions.length && r.track_gender === (side === 'boys' ? 'M' : 'F'))
  const schools = data?.schools ?? []

  if (!data) return <p className="text-sm text-slate-500">Loading…</p>
  if (data.migrationPending) return <div className="border-l-4 border-amber-500 bg-amber-50 p-3 text-sm text-amber-900">Run <code>docs/migrations/20261128_season_rosters.sql</code> in the Supabase SQL editor first.</div>

  return (
    <div className="space-y-4 text-sm">
      <div className="border border-slate-300 bg-white p-3">
        <h2 className="mb-1 font-semibold text-slate-900">Track’s {data.season?.label} rosters</h2>
        <p className="mb-2 text-xs text-slate-500">Every school’s roster page, one after another. A school read again keeps what’s settled; new names are added. Load everyone at once so transfers can be spotted (a name new at one school and missing from another).</p>
        <label className={`inline-block cursor-pointer border border-slate-400 px-3 py-1.5 text-xs font-semibold hover:bg-slate-50 ${busy ? 'pointer-events-none opacity-50' : ''}`}>
          {busy === 'load' ? 'Matching…' : 'Choose the roster file (.rtf or .txt)'}
          <input type="file" accept=".rtf,.txt,text/plain,application/rtf" className="hidden" onChange={async e => { const f = e.target.files?.[0]; if (f) await read(await f.text()); e.target.value = '' }} />
        </label>
        {msg && <p className="mt-2 border-l-4 border-sky-500 bg-sky-50 px-2 py-1 text-xs text-sky-900">{msg}</p>}
        {unmatched.length > 0 && (
          <div className="mt-2 border-l-4 border-red-500 bg-red-50 px-2 py-1 text-xs text-red-900">
            <b>Not loaded: we don’t know {unmatched.length === 1 ? 'this team' : 'these teams'}.</b> Match {unmatched.length === 1 ? 'it' : 'them'} in the School Data Review (step 1), then load the file again: {unmatched.map(u => `${u.team} (${u.count})`).join(', ')}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => setTab('review')} className={`border px-2 py-1 text-xs ${tab === 'review' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 bg-white'}`}>To review · {review.length}</button>
        <button onClick={() => setTab('schools')} className={`border px-2 py-1 text-xs ${tab === 'schools' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 bg-white'}`}>Schools · {schools.length}</button>
        <span className="ml-auto text-xs text-slate-500">{data.total ?? 0} wrestlers on {schools.length} rosters · {schools.reduce((n, s) => n + s.shown, 0)} shown on school pages (wrestled varsity last season)</span>
      </div>

      {tab === 'review' && (
        <>
          {plainNew.length > 0 && (
            <div className="flex items-center gap-3 border-l-4 border-slate-400 bg-slate-50 px-3 py-2 text-xs text-slate-800">
              <span><b>{plainNew.length}</b> new names (not freshmen) that match nobody we have, here or anywhere. Kids start late, so most are simply new. Look them over, then store them all.</span>
              <button disabled={!!busy} onClick={() => post({ action: 'accept-new' }, 'accept')} className="ml-auto bg-slate-800 px-3 py-1 font-semibold text-white disabled:opacity-50">Store all {plainNew.length} as new</button>
            </div>
          )}
          {bySchool.map(([school, rows]) => (
            <div key={school} className="border border-slate-300 bg-white">
              <div className="flex items-center border-b border-slate-200 bg-slate-50 px-3 py-1.5"><b className="text-slate-900">{school}</b><span className="ml-2 text-xs text-slate-500">{rows.length} to review</span></div>
              {rows.map(r => <ReviewLine key={r.id} r={r} busy={!!busy} post={post} />)}
            </div>
          ))}
          {review.length === 0 && <p className="text-xs text-slate-500">{schools.length ? 'Nothing to review.' : 'Load the roster file to start.'}</p>}
        </>
      )}

      {tab === 'schools' && (
        <table className="w-full border border-slate-200 bg-white text-xs">
          <thead><tr className="bg-slate-50 text-left"><th className="px-3 py-1">School</th><th className="px-3 py-1">Round</th><th className="px-3 py-1 text-right">On Track</th><th className="px-3 py-1 text-right">Confirmed</th><th className="px-3 py-1 text-right">To review</th><th className="px-3 py-1 text-right">On site</th><th className="px-3 py-1 text-right">Missing</th></tr></thead>
          <tbody>{schools.map(s => (
            <Fragment key={s.schoolId}>
              <tr className="border-t border-slate-100">
                <td className="px-3 py-1">{s.name}{s.team !== s.name && <span className="text-slate-400"> ({s.team})</span>}</td>
                <td className="px-3 py-1">{s.round} · {new Date(s.loadedAt).toLocaleDateString()}</td>
                <td className="px-3 py-1 text-right">{s.listed}</td>
                <td className="px-3 py-1 text-right">{s.confirmed}</td>
                <td className={`px-3 py-1 text-right ${s.review ? 'text-red-700' : ''}`}>{s.review}</td>
                <td className="px-3 py-1 text-right">{s.shown}</td>
                <td className="px-3 py-1 text-right">{s.missing.length ? <button onClick={() => setOpen(open === s.schoolId ? null : s.schoolId)} className="text-sky-700 underline">{s.missing.length}</button> : 0}</td>
              </tr>
              {open === s.schoolId && (
                <tr><td colSpan={7} className="bg-slate-50 px-3 py-1 text-[11px] text-slate-600">
                  Expected from last season, not on Track’s new roster (left the team, transferred out of state, or not entered yet): {s.missing.map(m => `${m.name}${m.grade ? ` (${m.grade})` : ''}${m.kind === 'pool' ? ' · roster only' : ''}`).join(', ')}
                </td></tr>
              )}
            </Fragment>
          ))}</tbody>
        </table>
      )}
    </div>
  )
}

function ReviewLine({ r, busy, post }: { r: ReviewRow; busy: boolean; post: (b: Record<string, unknown>, l: string) => Promise<unknown> }) {
  const [grade, setGrade] = useState<'track' | 'ours'>('track')
  const own = r.match !== 'new' && (r.wrestler_id || r.pool_id) ? { kind: r.match as 'wrestler' | 'pool', id: (r.wrestler_id ?? r.pool_id)!, name: r.name, grade: r.expected_grade } : null
  const gradeDiff = (g: string | null) => !!(g && r.grade && g !== r.grade)
  return (
    <div className="border-t border-slate-100 px-3 py-2 text-xs first:border-t-0">
      <div className="flex flex-wrap items-baseline gap-x-3">
        <b>{r.name}</b><span className="text-slate-500">{r.grade ?? 'no grade'}{r.weight ? ` · ${r.weight}` : ''}{r.track_gender && r.track_gender !== 'M' && r.track_gender !== 'F' ? '' : ` · ${r.track_gender}`}</span>
        <span className="text-red-700">{r.review_reason}</span>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        {own && <button disabled={busy} onClick={() => post({ action: 'resolve', id: r.id, pick: { kind: own.kind, id: own.id }, grade }, 'resolve')} className="border border-slate-700 px-2 py-0.5 font-semibold hover:bg-slate-50">Confirm {own.kind === 'wrestler' ? 'our wrestler' : 'the stored roster player'}{own.grade ? ` (${own.grade})` : ''}</button>}
        {r.suggestions.map(s => (
          <button key={s.id} disabled={busy} onClick={() => post({ action: 'resolve', id: r.id, pick: { kind: s.kind, id: s.id }, grade }, 'resolve')} className="border border-sky-600 px-2 py-0.5 text-sky-900 hover:bg-sky-50">
            This is {s.name}{s.grade ? ` (${s.grade})` : ''}{s.school ? ` · ${s.school}` : ''} <span className="text-sky-600">— {s.why}{s.why.startsWith('transfer') || (s.schoolId != null && s.schoolId !== r.school_id) ? ', logs the transfer' : ''}</span>
          </button>
        ))}
        <button disabled={busy} onClick={() => post({ action: 'resolve', id: r.id, pick: 'new' }, 'resolve')} className="border border-slate-300 px-2 py-0.5 text-slate-700 hover:bg-slate-50">New: store {r.name.split(' ')[0]}</button>
        <button disabled={busy} onClick={() => { if (confirm(`Drop Track’s line for ${r.name} from this import?`)) post({ action: 'dismiss', id: r.id }, 'dismiss') }} className="ml-auto text-slate-400 underline">drop this line</button>
      </div>
      {(gradeDiff(own?.grade ?? null) || r.suggestions.some(s => gradeDiff(s.grade))) && (
        <div className="mt-1 flex items-center gap-3 text-[11px] text-slate-600">
          Grade:
          <label className="flex items-center gap-1"><input type="radio" checked={grade === 'track'} onChange={() => setGrade('track')} /> Track’s ({r.grade})</label>
          <label className="flex items-center gap-1"><input type="radio" checked={grade === 'ours'} onChange={() => setGrade('ours')} /> keep ours</label>
        </div>
      )}
    </div>
  )
}
