'use client'

// Wrestling clubs (the same list on both sides and both hubs). A club's state is how a kid listed
// under it is known to be from NJ; "Other spellings" are the ways results write the club's name.
import { useCallback, useEffect, useState } from 'react'
import type { HubGender } from '@/lib/hub'

type Club = {
  id: number; name: string; town: string | null; state: string; region: string | null; website: string | null
  leadership: string | null; pipelines: string | null; tournaments: string | null; notes: string | null; aliases: string[]
}
const FIELDS: { k: keyof Club; label: string; wide?: boolean }[] = [
  { k: 'name', label: 'Club name *' }, { k: 'town', label: 'Town' }, { k: 'state', label: 'State' }, { k: 'region', label: 'Region' },
  { k: 'website', label: 'Website' }, { k: 'leadership', label: 'Leadership & staff' }, { k: 'pipelines', label: 'High schools it feeds', wide: true },
  { k: 'tournaments', label: 'Notable tournaments', wide: true }, { k: 'notes', label: 'Notes', wide: true }, { k: 'aliases', label: 'Other spellings (separate with ;)', wide: true },
]
const input = 'border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-black'
const th = 'px-3 py-1 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500'
const td = 'px-3 py-1'

export function ClubsTab({ gender }: { gender: HubGender }) {
  const [clubs, setClubs] = useState<Club[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState<number | 'new' | null>(null)
  const [unlisted, setUnlisted] = useState<{ name: string; kids: number; nj: number }[]>([])
  const [newName, setNewName] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [allUnlisted, setAllUnlisted] = useState(false)   // clubs with NJ kids first; the rest on request

  const load = useCallback(() => {
    fetch(`/api/admin/hub/clubs?gender=${gender}`).then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else { setClubs(d.clubs); setUnlisted(d.unlisted ?? []) } }).catch(() => setError('Could not load clubs'))
  }, [gender])
  useEffect(() => { load() }, [load])

  // "Same as" a club on the list: the name becomes one of its other spellings, and its kids are linked
  async function sameAs(name: string, clubId: number) {
    const c = clubs!.find(x => x.id === clubId)!
    const res = await fetch('/api/admin/hub/clubs', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ gender, id: c.id, aliases: [...(c.aliases ?? []), name] }) })
    const d = await res.json()
    setMsg(res.ok ? `"${name}" is now another spelling of ${c.name}` : d.error)
    if (res.ok) load()
  }

  if (error) return <p className="text-sm text-red-600">{error}</p>
  if (!clubs) return <p className="text-sm text-slate-400">Loading…</p>
  const term = q.trim().toLowerCase()
  const shown = clubs.filter(c => !term || [c.name, c.town, c.region, ...(c.aliases ?? [])].some(v => v?.toLowerCase().includes(term)))
  const saved = (c: Club) => { setEditing(null); setNewName(''); load(); setClubs(clubs.some(x => x.id === c.id) ? clubs.map(x => x.id === c.id ? c : x) : [...clubs, c].sort((a, b) => a.name.localeCompare(b.name))) }

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <button onClick={() => setEditing('new')} className="px-3 py-1 text-sm bg-black text-white hover:bg-slate-800">Add club</button>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search clubs" className={`${input} w-56`} />
        <span className="text-xs text-slate-400">{clubs.length} clubs · {clubs.filter(c => c.state === 'NJ').length} in NJ</span>
      </div>
      {(() => { const shownUnlisted = allUnlisted ? unlisted : unlisted.filter(u => u.nj > 0); return unlisted.length > 0 && (
        <div className="border border-amber-200 bg-amber-50/50 p-3 mb-3">
          <p className="text-sm font-semibold text-slate-800">Seen in results, not on the club list ({allUnlisted ? unlisted.length : `${shownUnlisted.length} with NJ kids`})
            <button onClick={() => setAllUnlisted(v => !v)} className="ml-2 text-xs font-normal underline text-slate-500 hover:text-black">{allUnlisted ? 'Only clubs with NJ kids' : `Show all ${unlisted.length}`}</button></p>
          <p className="text-xs text-slate-500 mb-2">Add each as a club, or mark it as another spelling of one we have. The kids already loaded under it are linked either way. Kids linked to a high school show their school instead.</p>
          {msg && <p className="text-xs text-slate-700 mb-1">{msg}</p>}
          <table className="text-sm">
            <tbody>{shownUnlisted.slice(0, 100).map(u => (
              <tr key={u.name} className="border-b border-amber-100">
                <td className={`${td} font-medium`}>{u.name}</td>
                <td className={`${td} text-xs text-slate-500`}>{u.kids} kid{u.kids === 1 ? '' : 's'}{u.nj ? ` · ${u.nj} NJ` : ''}</td>
                <td className={td}><button onClick={() => { setNewName(u.name); setEditing('new') }} className="text-xs underline text-slate-600 hover:text-black">Add as a club</button></td>
                <td className={td}>
                  <select value="" onChange={e => e.target.value && sameAs(u.name, Number(e.target.value))} className="border border-slate-300 text-xs px-1 py-0.5 max-w-[14rem]">
                    <option value="">Same as…</option>
                    {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </td>
              </tr>
            ))}</tbody>
          </table>
          {shownUnlisted.length > 100 && <p className="text-xs text-slate-500 mt-1">and {shownUnlisted.length - 100} more</p>}
        </div>
      ) })()}
      {editing === 'new' && <ClubForm key={newName} gender={gender} initialName={newName} onDone={c => c ? saved(c) : setEditing(null)} />}
      <table className="w-full text-sm border border-slate-200">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr><th className={th}>Club</th><th className={th}>Town</th><th className={th}>St</th><th className={th}>Feeds</th><th className={th}>Notes</th><th className={th} /></tr>
        </thead>
        <tbody>
          {shown.map(c => editing === c.id ? (
            <tr key={c.id}><td colSpan={6} className="p-2"><ClubForm gender={gender} initial={c} onDone={x => x ? saved(x) : setEditing(null)} /></td></tr>
          ) : (
            <tr key={c.id} className="border-b border-slate-100 align-top">
              <td className={`${td} font-medium`}>
                {c.website ? <a href={/^https?:/.test(c.website) ? c.website : `https://${c.website}`} target="_blank" rel="noreferrer" className="hover:underline">{c.name}</a> : c.name}
                {c.aliases?.length ? <div className="text-[11px] text-slate-400 font-normal">also {c.aliases.join(', ')}</div> : null}
              </td>
              <td className={td}>{c.town ?? c.region ?? '—'}</td>
              <td className={td}>{c.state}</td>
              <td className={`${td} text-slate-600`}>{c.pipelines ?? ''}</td>
              <td className={`${td} text-slate-500 text-xs`}>{[c.leadership, c.notes].filter(Boolean).join(' · ')}</td>
              <td className={td}><button onClick={() => setEditing(c.id)} className="text-xs underline text-slate-500 hover:text-black">Edit</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ClubForm({ gender, initial, initialName, onDone }: { gender: HubGender; initial?: Club; initialName?: string; onDone: (c: Club | null) => void }) {
  const [f, setF] = useState<Record<string, string>>(Object.fromEntries(FIELDS.map(({ k }) => [k,
    k === 'aliases' ? (initial?.aliases ?? []).join('; ') : k === 'state' ? initial?.state ?? 'NJ' : k === 'name' && !initial ? initialName ?? '' : (initial?.[k] as string | null) ?? ''])))
  const [err, setErr] = useState<string | null>(null)
  async function save() {
    const res = await fetch('/api/admin/hub/clubs', { method: initial ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gender, ...(initial ? { id: initial.id } : {}), ...f }) })
    const d = await res.json()
    if (!res.ok) return setErr(d.error)
    onDone(d.club)
  }
  return (
    <div className="border border-slate-200 bg-slate-50 p-3 mb-3 grid grid-cols-1 sm:grid-cols-4 gap-2">
      {FIELDS.map(({ k, label, wide }) => (
        <label key={k} className={`text-xs text-slate-500 ${wide ? 'sm:col-span-2' : ''}`}>{label}
          <input value={f[k]} onChange={e => setF({ ...f, [k]: e.target.value })} maxLength={k === 'state' ? 2 : undefined} className={`${input} w-full mt-0.5`} />
        </label>
      ))}
      <div className="sm:col-span-4 flex gap-2 items-center">
        <button onClick={save} disabled={!f.name.trim()} className="px-3 py-1 text-sm bg-black text-white disabled:opacity-40">Save</button>
        <button onClick={() => onDone(null)} className="px-3 py-1 text-sm border border-slate-300">Cancel</button>
        {err && <span className="text-xs text-red-600">{err}</span>}
      </div>
    </div>
  )
}
