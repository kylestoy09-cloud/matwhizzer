'use client'

// Every kid seen on a hub podium or in a hub bout (both hubs, this side). Set a kid's state, class year
// and club, and link them to their high school wrestler once they show up in our system.
import { useCallback, useEffect, useState } from 'react'
import { ordinal } from '@/lib/hub'
import { useAdminGender } from '@/components/admin/AdminGenderContext'
import type { HubGender } from '@/lib/hub'

type Prospect = {
  id: number; first_name: string; last_name: string; state: string | null; class_year: number | null
  club_id: number | null; club: string | null; club_listed: string | null; wrestler_id: string | null; notes: string | null
  wrestler: { id: string; name: string; school: string | null; class_year: number | null } | null
  podiums: number; best: number | null; wins: number; losses: number
}
type Club = { id: number; name: string }
type HsHit = { id: string; first_name: string; last_name: string; graduation_year: number | null; is_oos: boolean }

const input = 'border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-black'
const th = 'px-3 py-1 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500'
const td = 'px-3 py-1'

export function ProspectsTab({ gender }: { gender: HubGender }) {
  const { side } = useAdminGender()
  const sideSex = side === 'girls' ? 'F' : 'M'
  const [q, setQ] = useState('')
  const [noState, setNoState] = useState(false)
  const [rows, setRows] = useState<Prospect[] | null>(null)
  const [clubs, setClubs] = useState<Club[]>([])
  const [error, setError] = useState<string | null>(null)
  const [linking, setLinking] = useState<number | null>(null)

  const load = useCallback(() => {
    const p = new URLSearchParams({ gender, ...(gender === 'X' ? { sex: sideSex } : {}) })   // the mixed pool: this side's kids
    if (q.trim()) p.set('q', q.trim())
    if (noState) p.set('unknown_state', '1')
    fetch(`/api/admin/hub/prospects?${p}`).then(r => r.json())
      .then(d => d.error ? setError(d.error) : (setError(null), setRows(d.prospects)))
      .catch(() => setError('Could not load prospects'))
  }, [gender, q, noState, sideSex])
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t) }, [load])
  useEffect(() => { fetch(`/api/admin/hub/clubs?gender=${gender}`).then(r => r.json()).then(d => setClubs(d.clubs ?? [])) }, [gender])

  async function patch(id: number, body: Record<string, unknown>) {
    const res = await fetch('/api/admin/hub/prospects', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ gender, id, ...body }) })
    const d = await res.json()
    if (!res.ok) { setError(d.error); return false }
    setError(null); load(); return true
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-3 text-sm">
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search a name" className={`${input} w-64`} />
        <label className="flex items-center gap-1 text-slate-600"><input type="checkbox" checked={noState} onChange={e => setNoState(e.target.checked)} /> No state yet</label>
        <span className="text-xs text-slate-400">Shows up to 200</span>
      </div>
      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
      {!rows ? <p className="text-sm text-slate-400">Loading…</p> : !rows.length ? <p className="text-sm text-slate-400">No prospects{q || noState ? ' match' : ' yet: they are added when a podium or bouts are imported'}.</p> : (
        <table className="w-full text-sm border border-slate-200">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr><th className={th}>Name</th><th className={th}>State</th><th className={th}>Class</th><th className={th}>Club</th><th className={th}>Podiums</th><th className={th}>Best</th><th className={th}>Bouts</th><th className={th}>High school wrestler</th></tr>
          </thead>
          <tbody>
            {rows.map(p => (
              <tr key={p.id} className="border-b border-slate-100 align-top">
                <td className={`${td} font-medium`}>{p.first_name} {p.last_name}</td>
                <td className={td}>
                  <input defaultValue={p.state ?? ''} maxLength={2} className={`${input} w-12 uppercase`}
                    onBlur={e => { const v = e.target.value.trim().toUpperCase(); if (v !== (p.state ?? '')) patch(p.id, { state: v }) }} />
                </td>
                <td className={td}>
                  {p.wrestler ? (p.wrestler.class_year ?? '—') : (
                    <input defaultValue={p.class_year ?? ''} className={`${input} w-16`} placeholder="2031"
                      onBlur={e => { const v = e.target.value.trim(); if (v !== String(p.class_year ?? '')) patch(p.id, { class_year: v || null }) }} />
                  )}
                </td>
                <td className={td}>
                  <select value={p.club_id ?? ''} onChange={e => patch(p.id, { club_id: e.target.value || null })} className={`${input} max-w-[12rem]`}>
                    <option value="">—</option>
                    {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  {!p.club_id && p.club_listed && <div className="text-[11px] text-slate-400" title="As the results list it; not on the club list yet">{p.club_listed}</div>}
                </td>
                <td className={td}>{p.podiums || '—'}</td>
                <td className={td}>{p.best ? ordinal(p.best) : '—'}</td>
                <td className={td}>{p.wins + p.losses ? `${p.wins}-${p.losses}` : '—'}</td>
                <td className={td}>
                  {p.wrestler ? (
                    <span>{p.wrestler.name}{p.wrestler.school ? <span className="text-slate-500"> · {p.wrestler.school}</span> : null} <button onClick={() => confirm(`Unlink ${p.first_name} ${p.last_name} from ${p.wrestler!.name}?`) && patch(p.id, { wrestler_id: null })} className="text-xs text-slate-400 hover:text-red-600 ml-1">unlink</button></span>
                  ) : linking === p.id ? (
                    <HsSearch gender={gender} initial={`${p.first_name} ${p.last_name}`} onPick={async w => { if (await patch(p.id, { wrestler_id: w.id })) setLinking(null) }} onCancel={() => setLinking(null)} />
                  ) : (
                    <button onClick={() => setLinking(p.id)} className="text-xs underline text-slate-500 hover:text-black">Link</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function HsSearch({ gender, initial, onPick, onCancel }: { gender: HubGender; initial: string; onPick: (w: HsHit) => void; onCancel: () => void }) {
  const { side } = useAdminGender()
  const [q, setQ] = useState(initial)
  const [hits, setHits] = useState<HsHit[]>([])
  useEffect(() => {
    if (q.trim().length < 2) return
    const t = setTimeout(() => {
      fetch(`/api/admin/hub/prospects?gender=${gender}&hs=${encodeURIComponent(q.trim())}${gender === 'X' ? `&sex=${side === 'girls' ? 'F' : 'M'}` : ''}`).then(r => r.json()).then(d => setHits(d.wrestlers ?? []))
    }, 250)
    return () => clearTimeout(t)
  }, [q, gender, side])
  return (
    <div className="space-y-1">
      <div className="flex gap-1">
        <input value={q} onChange={e => setQ(e.target.value)} className={`${input} w-44`} autoFocus />
        <button onClick={onCancel} className="text-xs text-slate-400 hover:text-black">cancel</button>
      </div>
      {(q.trim().length < 2 ? [] : hits).map(w => (
        <button key={w.id} onClick={() => onPick(w)} className="block text-left text-xs hover:underline">
          {w.first_name} {w.last_name}{w.graduation_year ? ` · class of ${w.graduation_year}` : ''}{w.is_oos ? ' · out of state' : ''}
        </button>
      ))}
    </div>
  )
}
