'use client'
// School Data Review (preseason step 1): Track's season Teams page against our schools. See src/lib/trackIntake/.
import { useEffect, useMemo, useState } from 'react'
import { rtfToText } from '@/lib/hubFiles'
import { readTrackTeams } from '@/lib/trackIntake/teams'
import type { ReviewRow, ReviewSummary, Side } from '@/lib/trackIntake/teamReview'

type School = { id: number; name: string; program: boolean }
type Data = { season?: { id: number; label: string }; summary?: ReviewSummary; schools?: School[]; migrationPending?: boolean; error?: string }

const clean = (r: ReviewRow) => r.status === 'pending' && r.how === 'name' && !!r.schoolId && !r.noProgram && !r.skipHint && r.diffs.every(d => d.stale) && !r.aliasClash.length

export function TrackTeamsReview({ side }: { side: Side }) {
  const [data, setData] = useState<Data | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [paste, setPaste] = useState('')
  const [show, setShow] = useState<'review' | 'confirmed' | 'skipped' | 'missing'>('review')

  const load = () => fetch(`/api/admin/track-teams?side=${side}`).then(r => r.json()).then(setData)
  useEffect(() => { load() }, [side]) // eslint-disable-line react-hooks/exhaustive-deps

  const post = async (body: Record<string, unknown>, label: string) => {
    setBusy(label); setMsg(null)
    try {
      const r = await fetch('/api/admin/track-teams', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ side, ...body }) })
      const d = await r.json()
      if (d.error) { setMsg(d.error); return null }
      setData(prev => ({ ...prev, ...d }))
      return d
    } finally { setBusy(null) }
  }

  const read = async (text: string) => {
    const f = readTrackTeams(rtfToText(text))
    if (!f.teams.length) { setMsg('No teams found. Save Track’s Teams page (the table with Season Team, Global Team, Abbr …) as RTF, or copy the table.'); return }
    const d = await post({ action: 'load', teams: f.teams, total: f.total }, 'load')
    if (d) setMsg(`Read ${f.teams.length} teams${f.total ? ` (Track lists ${f.total})` : ''}: ${d.added} new, ${d.again} already here.${f.total && f.teams.length < f.total ? ` This file holds ${f.pages || 1} page${f.pages === 1 ? '' : 's'} of Track’s list: add the other pages (or show more rows per page on Track) to read the rest.` : ''}`)
  }

  const rows = useMemo(() => data?.summary?.rows ?? [], [data])
  const groups = useMemo(() => ({
    review: rows.filter(r => r.status === 'pending'),
    confirmed: rows.filter(r => r.status === 'confirmed' || r.status === 'added'),
    skipped: rows.filter(r => r.status === 'skipped'),
  }), [rows])
  const cleanCount = groups.review.filter(clean).length
  const readAll = data?.summary?.total != null && rows.length >= data.summary.total

  if (!data) return <p className="text-sm text-slate-500">Loading…</p>
  if (data.migrationPending) return (
    <div className="border-l-4 border-amber-500 bg-amber-50 p-3 text-sm text-amber-900">
      Run <code>docs/migrations/20261128_track_teams_review.sql</code> in the Supabase SQL editor first (it makes the table this review saves to).
    </div>
  )

  return (
    <div className="space-y-4 text-sm">
      <div className="border border-slate-300 bg-white p-3">
        <h2 className="mb-1 font-semibold text-slate-900">1. Track’s Teams page</h2>
        <p className="mb-2 text-xs text-slate-500">The {data.season?.label} list: Season Team, Global Team, Abbr, Gov. Body, Leagues. Each file adds what’s new; a team read again keeps its review.</p>
        <div className="flex flex-wrap items-start gap-3">
          <label className="cursor-pointer border border-slate-400 px-3 py-1.5 text-xs font-semibold hover:bg-slate-50">
            Choose the file (.rtf or .txt)
            <input type="file" accept=".rtf,.txt,text/plain,application/rtf" className="hidden" onChange={async e => { const f = e.target.files?.[0]; if (f) await read(await f.text()); e.target.value = '' }} />
          </label>
          <div className="flex flex-1 flex-col gap-1">
            <textarea value={paste} onChange={e => setPaste(e.target.value)} placeholder="…or paste the table here" className="h-16 w-full border border-slate-300 p-1 font-mono text-[11px]" />
            {paste.trim() && <button onClick={() => { read(paste); setPaste('') }} className="self-start bg-slate-800 px-3 py-1 text-xs font-semibold text-white">Read the pasted table</button>}
          </div>
        </div>
        {msg && <p className="mt-2 border-l-4 border-sky-500 bg-sky-50 px-2 py-1 text-xs text-sky-900">{msg}</p>}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {([['review', `To review · ${groups.review.length}`], ['confirmed', `Confirmed · ${groups.confirmed.length}`], ['skipped', `Skipped · ${groups.skipped.length}`], ['missing', `Ours, not on Track’s list${readAll ? ` · ${data.summary?.ourMissing.length ?? 0}` : ''}`]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setShow(k)} className={`border px-2 py-1 text-xs ${show === k ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 bg-white text-slate-700'}`}>{l}</button>
        ))}
        <span className="ml-auto text-xs text-slate-500">{rows.length} read{data.summary?.total ? ` of ${data.summary.total} on Track` : ''}</span>
      </div>

      {show === 'review' && (
        <>
          {cleanCount > 0 && (
            <div className="flex items-center gap-3 border-l-4 border-emerald-500 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
              <span><b>{cleanCount}</b> teams match one of our schools by name exactly, with the same district and region (or Track still showing last season’s).</span>
              <button disabled={!!busy} onClick={() => post({ action: 'confirm-clean' }, 'clean')} className="ml-auto bg-emerald-700 px-3 py-1 font-semibold text-white disabled:opacity-50">{busy === 'clean' ? 'Confirming…' : `Confirm all ${cleanCount}`}</button>
            </div>
          )}
          <p className="text-[11px] text-slate-500">Track hasn’t loaded the {data.season?.label} alignment yet: its districts are last season’s. Those show grey and are left as ours; only a Track value that’s neither ours nor last season’s is red.</p>
          {groups.review.filter(r => !clean(r)).map(r => <TeamCard key={r.key} row={r} schools={data.schools ?? []} busy={!!busy} post={post} />)}
          {groups.review.length > 0 && groups.review.every(clean) && <p className="text-xs text-slate-500">Nothing else to settle.</p>}
          {groups.review.length === 0 && <p className="text-xs text-slate-500">{rows.length ? 'Every team read so far is reviewed.' : 'Load Track’s Teams page to start.'}</p>}
        </>
      )}
      {show === 'confirmed' && <SimpleList rows={groups.confirmed} busy={!!busy} post={post} />}
      {show === 'skipped' && <SimpleList rows={groups.skipped} busy={!!busy} post={post} />}
      {show === 'missing' && (
        readAll
          ? <ul className="columns-3 text-xs">{(data.summary?.ourMissing ?? []).map(s => <li key={s.id}>{s.name}</li>)}</ul>
          : <p className="text-xs text-slate-500">Shown once every page of Track’s list is in ({rows.length} of {data.summary?.total ?? '?'} read): until then a school missing here may just be on a page not loaded yet.</p>
      )}
    </div>
  )
}

function SimpleList({ rows, busy, post }: { rows: ReviewRow[]; busy: boolean; post: (b: Record<string, unknown>, l: string) => Promise<unknown> }) {
  return (
    <table className="w-full border border-slate-200 bg-white text-xs">
      <thead><tr className="bg-slate-50 text-left"><th className="px-3 py-1">Track</th><th className="px-3 py-1">Abbr</th><th className="px-3 py-1">Ours</th><th className="px-3 py-1">Note</th><th className="px-3 py-1"></th></tr></thead>
      <tbody>{rows.map(r => (
        <tr key={r.key} className="border-t border-slate-100">
          <td className="px-3 py-1">{r.team.seasonName}{r.team.globalName !== r.team.seasonName && <span className="text-slate-400"> ({r.team.globalName})</span>}</td>
          <td className="px-3 py-1">{r.team.abbr}</td>
          <td className="px-3 py-1">{r.ourName ?? '—'}{r.status === 'added' && <span className="ml-1 text-sky-700">added</span>}</td>
          <td className="px-3 py-1 text-slate-500">{r.note}</td>
          <td className="px-3 py-1 text-right"><button disabled={busy} onClick={() => post({ action: 'reopen', key: r.key }, 'reopen')} className="text-slate-500 underline">reopen</button></td>
        </tr>
      ))}</tbody>
    </table>
  )
}

function TeamCard({ row, schools, busy, post }: { row: ReviewRow; schools: School[]; busy: boolean; post: (b: Record<string, unknown>, l: string) => Promise<unknown> }) {
  const [pick, setPick] = useState<number | null>(row.schoolId)
  const [q, setQ] = useState('')
  const [choice, setChoice] = useState<Record<string, 'ours' | 'track'>>(() => Object.fromEntries(row.diffs.filter(d => !d.stale).map(d => [d.field, d.ours == null ? 'track' : 'ours'])))
  const [newName, setNewName] = useState(row.team.seasonName)
  const t = row.team
  const picked = schools.find(s => s.id === pick)
  const hits = q.trim().length >= 2 ? schools.filter(s => s.name.toLowerCase().includes(q.toLowerCase())).slice(0, 8) : []
  const settle = row.diffs.filter(d => !d.stale)
  const flags = { district: choice.district === 'track' ? 'track' : undefined, region: choice.region === 'track' ? 'track' : undefined }
  const howText: Record<string, string> = { name: 'same name', abbreviation: 'by Track’s abbreviation', 'close name': 'by a close spelling', 'co-op part': 'by one school of the co-op', reviewed: 'reviewed before' }

  return (
    <div className={`border bg-white p-3 ${row.schoolId ? 'border-slate-300' : 'border-red-400'}`}>
      <div className="flex flex-wrap items-baseline gap-x-3">
        <b className="text-slate-900">{t.seasonName}</b>
        {t.globalName !== t.seasonName && <span className="text-xs text-slate-500">global team: {t.globalName}</span>}
        <span className="text-xs text-slate-500">{t.abbr}</span>
        <span className="text-xs text-slate-400">{t.leagues.join(' · ') || 'no leagues listed'}</span>
        {row.firstSeen && <span className="ml-auto text-[10px] text-slate-400">first read {new Date(row.firstSeen).toLocaleDateString()}</span>}
      </div>
      {row.skipHint && <p className="mt-1 text-xs text-amber-800">{row.skipHint}</p>}

      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
        <span className="text-slate-500">Our school:</span>
        {picked ? <b>{picked.name}</b> : <span className="text-red-700">no match</span>}
        {row.schoolId && row.schoolId === pick && row.how && <span className="text-slate-400">({howText[row.how]})</span>}
        {picked && !picked.program && <span className="text-amber-800">· no program on this side yet</span>}
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="find another school…" className="ml-2 w-44 border border-slate-300 px-1 py-0.5" />
        {[...row.suggestions.filter(s => s.id !== pick).map(s => ({ ...s, program: schools.find(x => x.id === s.id)?.program ?? false })), ...hits.filter(h => !row.suggestions.some(s => s.id === h.id))].slice(0, 8).map(s => (
          <button key={s.id} onClick={() => { setPick(s.id); setQ('') }} className="border border-slate-300 px-1.5 py-0.5 hover:bg-slate-50">{s.name}{!s.program && <span className="text-slate-400"> (no program)</span>}</button>
        ))}
      </div>

      {row.schoolId === pick && settle.map(d => (
        <div key={d.field} className="mt-2 flex flex-wrap items-center gap-3 border-l-4 border-red-500 bg-red-50 px-2 py-1 text-xs text-red-900">
          <span className="capitalize">{d.field}:</span>
          <span>ours {d.ours ?? 'not set'} · Track {d.track.length ? d.track.join(' and ') : 'none listed'}{d.last != null && <span className="text-red-700"> · last season {d.last}</span>}</span>
          {d.ours != null && <label className="flex items-center gap-1"><input type="radio" checked={choice[d.field] === 'ours'} onChange={() => setChoice(c => ({ ...c, [d.field]: 'ours' }))} /> keep ours</label>}
          {d.track.length === 1 && <label className="flex items-center gap-1"><input type="radio" checked={choice[d.field] === 'track'} onChange={() => setChoice(c => ({ ...c, [d.field]: 'track' }))} /> use Track’s ({d.track[0]})</label>}
        </div>
      ))}
      {row.schoolId === pick && row.diffs.filter(d => d.stale).map(d => (
        <p key={d.field} className="mt-1 text-[11px] text-slate-400"><span className="capitalize">{d.field}</span>: ours {d.ours}; Track still has last season’s ({d.last})</p>
      ))}
      {row.info.map(i => <p key={i} className="mt-1 text-[11px] text-slate-500">{i}</p>)}
      {row.aliasClash.map(i => <p key={i} className="mt-1 text-[11px] text-amber-800">{i}: not saved as a name for this school</p>)}
      {row.schoolId === pick && row.newAliases.length > 0 && <p className="mt-1 text-[11px] text-slate-500">Saves {row.newAliases.map(a => `“${a}”`).join(', ')} as {row.newAliases.length === 1 ? 'a name' : 'names'} for {picked?.name}, so the roster and schedule imports find it.</p>}

      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
        {picked && picked.program && <button disabled={busy} onClick={() => post({ action: 'confirm', key: row.key, schoolId: pick, ...flags }, 'confirm')} className="bg-slate-900 px-3 py-1 font-semibold text-white disabled:opacity-50">Confirm {picked.name}</button>}
        {picked && !picked.program && <button disabled={busy} onClick={() => post({ action: 'add-program', key: row.key, schoolId: pick, ...flags }, 'program')} className="bg-sky-700 px-3 py-1 font-semibold text-white disabled:opacity-50">Add {picked.name} as a program</button>}
        {!picked && (
          <span className="flex items-center gap-1">
            <input value={newName} onChange={e => setNewName(e.target.value)} className="w-52 border border-slate-300 px-1 py-0.5" />
            <button disabled={busy || !newName.trim()} onClick={() => { if (confirm(`Add “${newName.trim()}” as a new school${t.districts.length === 1 ? ` in District ${t.districts[0]}` : ''}${t.regions.length === 1 ? `, Region ${t.regions[0]}` : ''}?`)) post({ action: 'new-school', key: row.key, name: newName.trim(), district: 'track', region: 'track' }, 'new') }} className="bg-sky-700 px-3 py-1 font-semibold text-white disabled:opacity-50">Add as a new school</button>
          </span>
        )}
        <button disabled={busy} onClick={() => post({ action: 'skip', key: row.key, note: row.skipHint ?? '' }, 'skip')} className="ml-auto border border-slate-300 px-2 py-1 text-slate-600 hover:bg-slate-50">Skip (not one of ours)</button>
      </div>
    </div>
  )
}
