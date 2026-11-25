'use client'

// Playoff History Review (Kyle 2026-11-13), one per side. Past postseasons rebuilt from the TrackWrestling exports in
// History/<year>/ (boys, 2013 on) and History/Girls/<year>/ (girls, 2019 on), staged by
// scripts/playoff_history_stage.mts [--girls]. Here Kyle:
//   Seasons — what each season's files hold, the check against NJ Wrestling History, export gaps; load, then switch on
//   Schools — every team name as the exports print it → one of our schools (or an empty slot), co-ops named by season
//   Same wrestler — joins across seasons that aren't automatic (comes after the school list)
// A season stays hidden until it's switched on here; then the district, region and state pages offer it.
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { useAdminGender } from '@/components/admin/AdminGenderContext'

type Season = {
  season_id: number; label: string; status: 'staged' | 'loaded'; public: boolean; staged_at: string; loaded_at: string | null
  problems: string[]
  summary: {
    files: number; pdf: string | null; events: Record<string, number>; bouts: number; entrants: number; sites: Record<string, string>
    check: { state_placers: number; state_match: number; state_differ: string[]; region_champs: number; region_match: number; region_differ: string[] }
  }
}
type Name = { raw_name: string; school_id: number | null; decision: 'auto' | 'kyle' | 'placeholder' | 'pending'; coop_name: string | null; seasons: number[]; suggestion: number | null; note: string | null; decided_by: string | null }
type Data = { seasons: Season[]; history_seasons: number[]; names: Name[]; schools: { id: number; name: string }[] }

const TABS = ['Seasons', 'Schools', 'Same wrestler'] as const
const th = 'px-3 py-1 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap'
const td = 'px-3 py-1 align-top'
const input = 'border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-black'
const label = (y: number) => `${y - 1}-${String(y).slice(2)}`

export function PlayoffHistoryClient() {
  const { gender: g, side, loaded } = useAdminGender()
  const gender = g === 'F' ? 'F' : 'M'
  const [tab, setTab] = useState<typeof TABS[number]>('Seasons')
  const [data, setData] = useState<Data | null>(null)
  const [error, setError] = useState<string | null>(null)
  const load = useCallback(() => {
    if (!loaded) return
    fetch(`/api/admin/playoff-history?gender=${gender}`).then(r => r.json()).then(d => (d.error ? setError(d.error) : setData(d))).catch(() => setError('Could not load'))
  }, [gender, loaded])
  useEffect(() => { load() }, [load])

  const pending = data?.names.filter(n => n.decision === 'pending').length ?? 0
  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold mb-1">Tools · {side === 'girls' ? 'Girls' : 'Boys'}</p>
      <h1 className="text-lg font-bold text-slate-900">Playoff History Review</h1>
      <p className="text-sm text-slate-500 mt-1 mb-5">
        {gender === 'F'
          ? <>Past girls postseasons (regions and state, 2019 on) rebuilt from the TrackWrestling exports in <code>History/Girls/&lt;year&gt;</code>; state seeds from the FloWrestling brackets.</>
          : <>Past boys postseasons (districts, regions and state, 2013 on) rebuilt from the TrackWrestling exports in <code>History/&lt;year&gt;</code>; state seeds from the FloWrestling brackets.</>}{' '}
        Each season stays hidden until you switch it on; then the postseason pages offer it in their season picker. Team scores for these seasons are calculated with our formula.
      </p>
      <div className="flex gap-1 border-b border-slate-200 mb-5">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 text-sm -mb-px border-b-2 ${tab === t ? 'border-black text-slate-900 font-semibold' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
            {t}{t === 'Schools' && pending ? <span className="ml-1.5 text-[11px] bg-amber-100 text-amber-800 px-1.5 rounded-full">{pending}</span> : null}
          </button>
        ))}
      </div>
      {error ? <p className="text-sm text-red-600">{error}{/playoff_history|history_public/.test(error) ? ' — run docs/migrations/20261113_playoff_history.sql first.' : ''}</p>
        : !data ? <p className="text-sm text-slate-400">Loading…</p>
        : tab === 'Seasons' ? <SeasonsTab data={data} gender={gender} reload={load} />
        : tab === 'Schools' ? <SchoolsTab data={data} gender={gender} onSaved={(n, school) => setData({ ...data, schools: school ? [...data.schools, school] : data.schools, names: data.names.map(x => (x.raw_name === n.raw_name ? { ...x, ...n } : x)) })} />
        : <SameWrestlerTab gender={gender} side={side} pendingSchools={pending} />}
    </div>
  )
}

function SeasonsTab({ data, gender, reload }: { data: Data; gender: 'M' | 'F'; reload: () => void }) {
  const [open, setOpen] = useState<number | null>(null)
  const [busy, setBusy] = useState<number | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const staged = new Map(data.seasons.map(s => [s.season_id, s]))
  const pendingBySeason = (y: number) => data.names.filter(n => n.decision === 'pending' && n.seasons.includes(y)).length
  const publish = async (y: number, on: boolean) => {
    setBusy(y); setMsg(null)
    const res = await fetch('/api/admin/playoff-history', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ gender, action: 'publish', season_id: y, on }) })
    const d = await res.json().catch(() => ({ error: 'The server did not answer' }))
    setBusy(null)
    if (!res.ok) return setMsg(d.error)
    reload()
  }
  // Load writes the season's brackets (still hidden); Unload removes exactly that
  const loadOrUnload = async (y: number, action: 'load' | 'unload') => {
    if (action === 'unload' && !confirm(`Remove ${label(y)}'s brackets from the site tables? (Staging and profiles stay.)`)) return
    setBusy(y); setMsg(null)
    const res = await fetch('/api/admin/playoff-history', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ gender, action, season_id: y }) })
    const d = await res.json().catch(() => ({ error: 'The server did not answer (a load can take a minute — reload to see)' }))
    setBusy(null)
    if (!res.ok) return setMsg(d.error)
    setMsg(action === 'load' ? `${label(y)} loaded: ${d.tournaments} events, ${d.entries.toLocaleString()} entries, ${d.matches.toLocaleString()} bouts. Still hidden — check it, then switch it on.` : `${label(y)} unloaded.`)
    reload()
  }
  return (
    <div>
      {msg && <p className={`text-sm mb-2 ${/loaded:|unloaded/.test(msg) ? 'text-emerald-700' : 'text-red-600'}`}>{msg}</p>}
      <table className="w-full text-sm border border-slate-200">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr><th className={th}>Season</th><th className={th}>Files</th><th className={th}>Bouts</th><th className={th} title="State placers and region champions in the files vs NJ Wrestling History">vs NJ Wrestling History</th><th className={th}>Export gaps</th><th className={th}>Schools to decide</th><th className={th}>Status</th><th className={th}></th></tr>
        </thead>
        <tbody>
          {data.history_seasons.map(y => {
            const s = staged.get(y)
            if (!s) return (
              <tr key={y} className="border-b border-slate-100 text-slate-400"><td className={`${td} font-semibold text-slate-700`}>{label(y)}</td><td className={td} colSpan={7}>Not staged yet — files go in History/{y}</td></tr>
            )
            const c = s.summary.check, ev = s.summary.events
            const differ = c.state_differ.length + c.region_differ.length
            const pend = pendingBySeason(y)
            return (
              <Fragment key={y}>
                <tr className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer" onClick={() => setOpen(open === y ? null : y)}>
                  <td className={`${td} font-semibold`}>{s.label} {open === y ? '▾' : '▸'}</td>
                  <td className={td}>{gender === 'M' ? `${ev.district ?? 0} districts · ` : ''}{ev.region ?? 0} regions · {ev.state ? 'state' : <span className="text-red-600">no state</span>}{s.summary.pdf ? '' : <span className="text-amber-700"> · no bracket PDF</span>}</td>
                  <td className={`${td} tabular-nums`}>{s.summary.bouts.toLocaleString()}</td>
                  <td className={td}>state {c.state_match}/{c.state_placers} · region champs {c.region_match}/{c.region_champs}{differ ? <span className="text-slate-400"> ({differ} spelled differently)</span> : ''}</td>
                  <td className={td}>{s.problems.length || '—'}</td>
                  <td className={td}>{pend ? <span className="text-amber-700 font-semibold">{pend}</span> : '—'}</td>
                  <td className={td}>{s.public ? <span className="text-emerald-700 font-semibold">On the site</span> : s.status === 'loaded' ? 'Loaded, hidden' : 'Staged'}</td>
                  <td className={td} onClick={e => e.stopPropagation()}>
                    {s.status === 'loaded'
                      ? <span className="flex gap-1">
                          <button disabled={busy === y} onClick={() => publish(y, !s.public)} className={`px-2 py-0.5 text-xs ${s.public ? 'border border-slate-300' : 'bg-black text-white'}`}>{s.public ? 'Hide' : 'Switch on'}</button>
                          {!s.public && <button disabled={busy === y} onClick={() => loadOrUnload(y, 'unload')} className="px-2 py-0.5 text-xs border border-slate-300 hover:border-black">Unload</button>}
                        </span>
                      : pend ? <span className="text-xs text-slate-400">Schools first</span>
                      : <button disabled={busy === y} onClick={() => loadOrUnload(y, 'load')} className="px-2 py-0.5 text-xs bg-black text-white disabled:opacity-40">{busy === y ? 'Loading…' : 'Load'}</button>}
                  </td>
                </tr>
                {open === y && (
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <td colSpan={8} className="px-6 py-3 text-xs text-slate-700 space-y-2">
                      <p>Staged {new Date(s.staged_at).toLocaleString()}. {s.summary.entrants.toLocaleString()} entries, {s.summary.files} export files{s.summary.pdf ? ` + ${s.summary.pdf}` : ''}. Sites: districts at {Object.entries(s.summary.sites).filter(([k]) => k.startsWith('district')).length} sites, state at {s.summary.sites.state || '—'}.</p>
                      {s.problems.length > 0 && <div><p className="font-semibold">Export gaps and notes</p>{s.problems.map((p, i) => <div key={i}>• {p}</div>)}</div>}
                      {differ > 0 && <div><p className="font-semibold">Named differently than NJ Wrestling History (same placement, different spelling or nickname)</p>{[...c.state_differ, ...c.region_differ].map((p, i) => <div key={i}>• {p}</div>)}</div>}
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
      <p className="text-xs text-slate-400 mt-2">New files: run <code>npx tsx --tsconfig tsconfig.json scripts/playoff_history_stage.mts {'<year>'}{gender === 'F' ? ' --girls' : ''}</code> to stage them (a loaded season isn&apos;t restaged).</p>
    </div>
  )
}

type OnSaved = (n: Partial<Name> & { raw_name: string }, school?: { id: number; name: string }) => void
function SchoolsTab({ data, gender, onSaved }: { data: Data; gender: 'M' | 'F'; onSaved: OnSaved }) {
  const [show, setShow] = useState<'pending' | 'flagged' | 'decided' | 'all'>('pending')
  const [q, setQ] = useState('')
  const schoolName = useMemo(() => new Map(data.schools.map(s => [s.id, s.name])), [data.schools])
  const rows = data.names.filter(n =>
    (show === 'all' || (show === 'pending' && n.decision === 'pending') || (show === 'flagged' && n.decision === 'auto' && !!n.note?.includes('same school as')) || (show === 'decided' && (n.decision === 'kyle' || n.decision === 'placeholder'))) &&
    (!q || n.raw_name.toLowerCase().includes(q.toLowerCase()) || (n.school_id && schoolName.get(n.school_id)?.toLowerCase().includes(q.toLowerCase()))))
  const count = (k: typeof show) => data.names.filter(n => k === 'pending' ? n.decision === 'pending' : k === 'flagged' ? n.decision === 'auto' && !!n.note?.includes('same school as') : k === 'decided' ? n.decision === 'kyle' || n.decision === 'placeholder' : true).length
  return (
    <div>
      <p className="text-sm text-slate-500 mb-3">
        Each team name as the exports print it. Most matched a school on their own; the rest wait for you. <b>Flagged</b> = matched, but another spelling matched the same school in a different district (girls: region) the same season — one of them is probably a different school. A co-op gets its host school and the name it went by.
      </p>
      <div className="flex items-center gap-2 mb-3 text-sm flex-wrap">
        {(['pending', 'flagged', 'decided', 'all'] as const).map(k => (
          <button key={k} onClick={() => setShow(k)} className={`px-2 py-0.5 border text-xs ${show === k ? 'bg-black text-white border-black' : 'border-slate-300 hover:border-black'}`}>
            {k === 'pending' ? 'To decide' : k === 'flagged' ? 'Flagged' : k === 'decided' ? 'Your calls' : 'All'} ({count(k)})
          </button>
        ))}
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Find a name or school" className={`${input} ml-auto w-56`} />
      </div>
      <table className="w-full text-sm border border-slate-200">
        <thead className="bg-slate-50 border-b border-slate-200"><tr><th className={th}>As printed</th><th className={th}>Seasons</th><th className={th}>School</th><th className={th}>Note</th></tr></thead>
        <tbody>{rows.map(n => <NameRow key={n.raw_name} n={n} gender={gender} schools={data.schools} names={data.names} schoolName={schoolName} onSaved={onSaved} />)}</tbody>
      </table>
      {!rows.length && <p className="text-sm text-slate-400 mt-2">Nothing here.</p>}
    </div>
  )
}

// the same school under other spellings ("Bishop Ahr" / "Bishop Ahr H.S."): letters only, school-type words dropped
const core = (x: string) => x.toLowerCase().replace(/\bst\.?\s/g, 'saint ').replace(/\b(h\.?\s?s\.?|high|school|regional|reg|prep|academy|the|twp|township)\b/g, '').replace(/[^a-z]/g, '')

// School search: our own list (the browser's datalist doesn't pick up a school added after the page loads — Safari)
function SchoolPicker({ schools, value, onPick }: { schools: { id: number; name: string }[]; value: number | null; onPick: (id: number | null) => void }) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const name = value ? schools.find(s => s.id === value)?.name ?? `#${value}` : ''
  const hits = q.trim().length < 2 ? [] : schools.filter(s => s.name.toLowerCase().includes(q.trim().toLowerCase()) || core(s.name).includes(core(q))).slice(0, 10)
  return (
    <span className="relative inline-block">
      <input value={open ? q : name} onFocus={() => { setOpen(true); setQ('') }} onBlur={() => setTimeout(() => setOpen(false), 150)}
        onChange={e => { setQ(e.target.value); setOpen(true) }} placeholder="Find a school…" className={`${input} w-64 py-0.5`} />
      {open && hits.length > 0 && (
        <span className="absolute z-10 left-0 top-full mt-0.5 w-72 bg-white border border-slate-300 shadow-sm flex flex-col max-h-64 overflow-auto">
          {hits.map(s => <button key={s.id} type="button" onMouseDown={e => e.preventDefault()} onClick={() => { onPick(s.id); setOpen(false); setQ('') }} className="text-left px-2 py-1 text-xs hover:bg-slate-100">{s.name} <span className="text-slate-400">#{s.id}</span></button>)}
        </span>
      )}
    </span>
  )
}

function NameRow({ n, gender, schools, names, schoolName, onSaved }: { n: Name; gender: 'M' | 'F'; schools: { id: number; name: string }[]; names: Name[]; schoolName: Map<number, string>; onSaved: OnSaved }) {
  const [pickId, setPickId] = useState<number | null>(n.school_id)
  const [coop, setCoop] = useState(n.coop_name ?? '')
  const [msg, setMsg] = useState<string | null>(null)
  const isCoop = n.raw_name.includes('/') || !!n.note?.includes('co-op')
  const save = async (body: Record<string, unknown>) => {
    setMsg(null)
    const res = await fetch('/api/admin/playoff-history', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ gender, raw_name: n.raw_name, ...body }) })
    const d = await res.json().catch(() => ({ error: 'The server did not answer' }))
    if (!res.ok) return setMsg(d.error)
    onSaved(d.name); setMsg('Saved')
    if (body.school_id && n.decision === 'pending') await offerOthers(body.school_id as number, schoolName.get(body.school_id as number) ?? '')
  }
  const id = pickId ?? 0
  // after a school is made or picked: offer it for the other undecided spellings of the same name
  const offerOthers = async (schoolId: number, schoolNm: string) => {
    const others = names.filter(x => x.raw_name !== n.raw_name && x.decision === 'pending' && (core(x.raw_name) === core(n.raw_name) || core(x.raw_name) === core(schoolNm)))
    if (!others.length || !window.confirm(`Use ${schoolNm} for these spellings too?\n\n${others.map(x => `• ${x.raw_name}`).join('\n')}`)) return
    for (const x of others) {
      const res = await fetch('/api/admin/playoff-history', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ gender, raw_name: x.raw_name, school_id: schoolId }) })
      const d = await res.json().catch(() => null)
      if (res.ok && d?.name) onSaved(d.name)
    }
  }
  const newSchool = async () => {
    const name = window.prompt(`New school for “${n.raw_name}” — its name as the site should show it:`, n.raw_name.replace(/\s+/g, ' ').trim())
    if (!name?.trim()) return
    setMsg(null)
    const res = await fetch('/api/admin/playoff-history', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ gender, action: 'new_school', raw_name: n.raw_name, name }) })
    const d = await res.json().catch(() => ({ error: 'The server did not answer' }))
    if (!res.ok) return setMsg(d.error)
    onSaved(d.name, d.school); setPickId(d.school.id); setMsg('Saved')
    await offerOthers(d.school.id, d.school.name)
  }
  return (
    <tr className="border-b border-slate-100">
      <td className={`${td} font-medium`}>{n.raw_name}</td>
      <td className={`${td} text-xs text-slate-500 whitespace-nowrap`}>{n.seasons.map(label).join(', ')}</td>
      <td className={td}>
        {n.decision === 'placeholder' ? <span className="text-slate-500">Empty slot (not a team)</span>
          : n.decision === 'auto' ? <span>{schoolName.get(n.school_id!) ?? `#${n.school_id}`} <span className="text-[11px] text-slate-400">matched</span></span>
          : n.decision === 'kyle' ? <span className="font-semibold">{schoolName.get(n.school_id!) ?? `#${n.school_id}`}{n.coop_name ? <span className="font-normal text-slate-500"> · shown as “{n.coop_name}”</span> : ''}</span>
          : null}
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          <SchoolPicker schools={schools} value={pickId} onPick={x => { setPickId(x); setMsg(null) }} />
          {isCoop && <input value={coop} onChange={e => setCoop(e.target.value)} placeholder="Co-op name that season" className={`${input} w-52 py-0.5`} />}
          <button disabled={!id} onClick={() => save({ school_id: id, coop_name: isCoop ? coop : null })} className="px-2 py-0.5 bg-black text-white text-xs disabled:opacity-40">Save</button>
          {n.suggestion && n.decision === 'pending' && <button onClick={() => { setPickId(n.suggestion); if (isCoop && !coop) setCoop(n.raw_name.replace(/\s*\/\s*/g, '/')) }} className="px-2 py-0.5 border border-slate-300 text-xs hover:border-black">Suggest: {schoolName.get(n.suggestion)}</button>}
          {n.decision === 'pending' && <button onClick={newSchool} className="px-2 py-0.5 border border-slate-300 text-xs hover:border-black" title="A school that closed or has no record yet (Bishop Ahr, Queen of Peace …)">New school</button>}
          {n.decision !== 'placeholder' && <button onClick={() => save({ placeholder: true })} className="px-2 py-0.5 border border-slate-300 text-xs hover:border-black">Empty slot</button>}
          {(n.decision === 'kyle' || n.decision === 'placeholder') && <button onClick={() => save({ reset: true })} className="text-xs text-slate-400 hover:text-black underline">Undo</button>}
          {msg && <span className={`text-xs ${msg === 'Saved' ? 'text-emerald-700' : 'text-red-600'}`}>{msg}</span>}
        </div>
      </td>
      <td className={`${td} text-xs text-slate-500`}>{n.note}</td>
    </tr>
  )
}

// ── Same wrestler ────────────────────────────────────────────────────────────
type Side = { auto?: { id: string; name: string; graduation_year: number | null; schools: string[] } | null; bySeason?: { season: string; weights: number[]; school: string; finishes: string[] }[]; seasons?: string[]; schools?: string[]; weights?: string[]; places?: string[]; names?: string[]; profile?: boolean; graduation_year?: number | null; ours?: { season: string; weights: number[]; schools: string[]; finishes?: string[] }[]; gap?: 'overlap' | string[] | null }
type Join = { id: number; a_season: number; a_name: string; a_team: string; b_season: number; b_name: string; b_team: string; b_wrestler_id: string | null; reason: string; decision: 'pending' | 'same' | 'different'; decided_by: string | null; context: { a?: Side; b?: Side; window?: { ok: boolean; why: string | null }; jump?: { classes: number; text: string } | null } }
const REASON_HELP: Record<string, string> = {
  'name variant': 'Same school, back-to-back seasons, same last name, first name a nickname or a typo apart',
  transfer: 'Same name, back-to-back seasons, another school',
  'more than four seasons': 'One name at one school for a fifth season: likely two wrestlers',
  'existing profile, other school': 'One of our current profiles has this name at another school, class year fits',
  'existing profile, class year off': 'One of our profiles has this name at this school, but its class year doesn\u2019t fit',
}

function SameWrestlerTab({ gender, side, pendingSchools }: { gender: 'M' | 'F'; side: string; pendingSchools: number }) {
  const [joins, setJoins] = useState<Join[] | null>(null)
  const [reason, setReason] = useState<string>('')
  const [status, setStatus] = useState<'pending' | 'decided' | 'all'>('pending')
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [limit, setLimit] = useState(60)
  // sort by the weight-class jump (Kyle 2026-11-14); maybes with no jump go last
  const [sort, setSort] = useState<'' | 'jump-desc' | 'jump-asc'>('')
  // everything that may end up one wrestler sits together (Kyle 2026-11-14): maybes sharing a name or a side
  const [grouped, setGrouped] = useState(true)
  const load = useCallback(() => {
    fetch(`/api/admin/playoff-history?gender=${gender}&joins=1`).then(r => r.json()).then(d => (d.error ? setMsg(d.error) : setJoins(d.joins))).catch(() => setMsg('Could not load'))
  }, [gender])
  useEffect(() => { load() }, [load])
  const post = async (body: Record<string, unknown>, what: string) => {
    setBusy(what); setMsg(null)
    const res = await fetch('/api/admin/playoff-history', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ gender, ...body }) })
    const d = await res.json().catch(() => ({ error: 'The server did not answer (it may still be working — reload in a minute)' }))
    setBusy(null)
    if (!res.ok) { setMsg(d.error); return null }
    return d
  }
  const decide = async (ids: number[], decision: Join['decision']) => {
    const d = await post({ action: 'decide', ids, decision }, 'decide')
    if (!d && decision === 'same') window.scrollTo({ top: 0, behavior: 'smooth' })
    if (d) setJoins(js => js!.map(j => (ids.includes(j.id) ? { ...j, decision, decided_by: decision === 'pending' ? null : 'you' } : j)))
  }
  if (pendingSchools) return <p className="text-sm text-slate-500">Finish the Schools tab first ({pendingSchools} to decide): who is who goes by name and school.</p>
  if (!joins) return <p className="text-sm text-slate-400">{msg ?? 'Loading…'}</p>
  const reasons = [...new Set(joins.map(j => j.reason))]
  const jumpOf = (j: Join) => (j.context.jump ? Math.abs(j.context.jump.classes) : null)
  const shown = joins.filter(j => (!reason || j.reason === reason || (reason === '__window' && j.context.window && !j.context.window.ok)) && (status === 'all' || (status === 'pending' ? j.decision === 'pending' : j.decision !== 'pending')))
  // groups: maybes joined when they share a side or a name (a spelling variant links two names)
  const nm = (x: string) => x.toLowerCase().replace(/\([^)]*\)/g, '').replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim()
  const parent = new Map<string, string>()
  const find = (x: string): string => { const p = parent.get(x) ?? x; if (p === x) return x; const r = find(p); parent.set(x, r); return r }
  const unite = (a: string, b: string) => parent.set(find(a), find(b))
  for (const j of joins) {
    const a = `n|${nm(j.a_name)}`, b = j.b_wrestler_id ? `p|${j.b_wrestler_id}` : `n|${nm(j.b_name)}`
    unite(`j|${j.id}`, a); unite(a, b); if (j.b_wrestler_id) unite(b, `n|${nm(j.b_name)}`)
  }
  const groupOf = (j: Join) => find(`j|${j.id}`)
  const groupSize = new Map<string, number>(); for (const j of shown) groupSize.set(groupOf(j), (groupSize.get(groupOf(j)) ?? 0) + 1)
  const groupJump = new Map<string, number>(); for (const j of shown) groupJump.set(groupOf(j), Math.max(groupJump.get(groupOf(j)) ?? -1, jumpOf(j) ?? -1))
  const lastName = (j: Join) => nm(j.a_name).split(' ').slice(-1)[0] + ' ' + nm(j.a_name)
  const groupName = new Map<string, string>(); for (const j of shown) if (!groupName.has(groupOf(j)) || lastName(j) < groupName.get(groupOf(j))!) groupName.set(groupOf(j), lastName(j))
  const jumpKey = (j: Join) => (grouped ? groupJump.get(groupOf(j))! : jumpOf(j) ?? -1)
  shown.sort((x, y) =>
    (sort === 'jump-desc' ? jumpKey(y) - jumpKey(x) : sort === 'jump-asc' ? (jumpKey(x) < 0 ? 1 : jumpKey(y) < 0 ? -1 : jumpKey(x) - jumpKey(y)) : 0) ||
    (grouped ? groupName.get(groupOf(x))!.localeCompare(groupName.get(groupOf(y))!) || groupOf(x).localeCompare(groupOf(y)) : 0) ||
    a_seasonCmp(x, y))
  function a_seasonCmp(x: Join, y: Join) { return x.a_season - y.a_season || x.id - y.id }
  const pendingAll = joins.filter(j => j.decision === 'pending').length
  return (
    <div>
      <p className="text-sm text-slate-500 mb-3">
        Same name at the same school in back-to-back seasons is one wrestler automatically, and so is a match to one existing profile at the same school. These are the maybes: mark each <b>Same</b> or <b>Different</b>.
        When none are left, <b>Create profiles</b> gives every history entry its wrestler (existing profiles kept, new ones made for the rest).
      </p>
      <div className="flex items-center gap-2 mb-3 flex-wrap text-xs">
        <button disabled={!!busy} onClick={async () => { const d = await post({ action: 'find_joins' }, 'find'); if (d) { setMsg(`Found ${d.found} (${d.added} new)`); load() } }} className="px-2 py-1 border border-slate-300 hover:border-black disabled:opacity-40">{busy === 'find' ? 'Looking…' : joins.length ? 'Look again' : 'Find who may be the same'}</button>
        <span className="text-slate-300">|</span>
        <button onClick={() => setReason('')} className={`px-2 py-0.5 border ${!reason ? 'bg-black text-white border-black' : 'border-slate-300'}`}>All reasons ({joins.filter(j => status === 'all' || (status === 'pending') === (j.decision === 'pending')).length})</button>
        {reasons.map(r => <button key={r} title={REASON_HELP[r]} onClick={() => setReason(r)} className={`px-2 py-0.5 border ${reason === r ? 'bg-black text-white border-black' : 'border-slate-300'}`}>{r} ({joins.filter(j => j.reason === r && (status === 'all' || (status === 'pending') === (j.decision === 'pending'))).length})</button>)}
        <span className="text-slate-300">|</span>
        <button onClick={() => setReason(reason === '__window' ? '' : '__window')} className={`px-2 py-0.5 border ${reason === '__window' ? 'bg-red-700 text-white border-red-700' : 'border-red-300 text-red-700'}`}>Outside 4 years ({joins.filter(j => j.context.window && !j.context.window.ok && (status === 'all' || (status === 'pending') === (j.decision === 'pending'))).length})</button>
        <span className="text-slate-300">|</span>
        {(['pending', 'decided', 'all'] as const).map(k => <button key={k} onClick={() => setStatus(k)} className={`px-2 py-0.5 border ${status === k ? 'bg-slate-700 text-white border-slate-700' : 'border-slate-300'}`}>{k === 'pending' ? 'To decide' : k === 'decided' ? 'Decided' : 'All'}</button>)}
      </div>
      <div className="flex items-center gap-2 mb-2 text-xs">
        <span className="text-slate-500">Sort:</span>
        {([['', 'By name'], ['jump-desc', 'Biggest weight jump first'], ['jump-asc', 'Smallest weight jump first']] as const).map(([k, l]) => (
          <button key={k} onClick={() => { setSort(k); setLimit(60) }} className={`px-2 py-0.5 border ${sort === k ? 'bg-slate-700 text-white border-slate-700' : 'border-slate-300'}`}>{l}</button>
        ))}
        <label className="ml-2 flex items-center gap-1 text-slate-600"><input type="checkbox" checked={grouped} onChange={e => setGrouped(e.target.checked)} /> Keep each name together</label>
      </div>
      {reason && <p className="text-xs text-slate-500 mb-2">{reason === '__window' ? 'Joining these would put one wrestler outside four years of eligibility (more than four seasons, or seasons outside the class year): almost always different wrestlers.' : REASON_HELP[reason]}</p>}
      {msg && <p className="text-sm text-slate-700 mb-2">{msg}</p>}
      {status === 'pending' && shown.length > 0 && (
        <div className="flex items-center gap-2 mb-2 text-xs">
          <span className="text-slate-500">All {Math.min(shown.length, limit)} shown:</span>
          <button disabled={!!busy} onClick={() => { const ids = shown.slice(0, limit).map(j => j.id); if (confirm(`Mark these ${ids.length} as the same wrestler?`)) decide(ids, 'same') }} className="px-2 py-0.5 border border-emerald-600 text-emerald-700 hover:bg-emerald-50">Same</button>
          <button disabled={!!busy} onClick={() => { const ids = shown.slice(0, limit).map(j => j.id); if (confirm(`Mark these ${ids.length} as different wrestlers?`)) decide(ids, 'different') }} className="px-2 py-0.5 border border-slate-400 hover:bg-slate-50">Different</button>
        </div>
      )}
      <table className="w-full text-xs border border-slate-200">
        <thead className="bg-slate-50 border-b border-slate-200"><tr><th className={th}>Why</th><th className={th}>Wrestler</th><th className={th}>Maybe the same as</th><th className={th}></th></tr></thead>
        <tbody>{shown.slice(0, limit).map((j, i, arr) => (
          <Fragment key={j.id}>
          {grouped && (i === 0 || groupOf(arr[i - 1]) !== groupOf(j)) && (
            <tr className="bg-slate-800 text-white"><td colSpan={4} className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wide">
              {[...new Set(shown.filter(x => groupOf(x) === groupOf(j)).flatMap(x => [x.a_name, x.b_name]))].join(' · ')} — {groupSize.get(groupOf(j))} {groupSize.get(groupOf(j)) === 1 ? 'maybe' : 'maybes'}
            </td></tr>
          )}
          <tr className={`border-b border-slate-100 align-top ${j.decision === 'same' ? 'bg-emerald-50/50' : j.decision === 'different' ? 'bg-slate-50' : ''}`}>
            <td className={`${td} text-slate-500 whitespace-nowrap`}>{j.reason}
              {j.context.jump && <div className={`mt-1 font-semibold ${Math.abs(j.context.jump.classes) >= 3 ? 'text-red-700' : Math.abs(j.context.jump.classes) === 2 ? 'text-amber-700' : 'text-slate-700'}`}>Weight: {j.context.jump.text}</div>}
              {j.context.window && !j.context.window.ok && <div className="mt-1 font-semibold text-red-700 whitespace-normal max-w-[11rem]">Outside the 4-year window: {j.context.window.why}</div>}</td>
            <td className={td}><SideCell s={j.context.a} name={j.a_name} /></td>
            <td className={td}>{j.b_wrestler_id
              ? <div><a href={`/admin/${side}/wrestlers/${j.b_wrestler_id}`} target="_blank" rel="noreferrer" className="font-semibold underline">{j.b_name}</a> <span className="text-slate-400">our profile{j.context.b?.graduation_year ? ` · class of ${j.context.b.graduation_year}` : ''}</span>
                  {j.context.b?.ours?.length
                    ? j.context.b.ours.map(o => <SeasonLine key={o.season} season={o.season} weights={o.weights} school={o.schools.join(' / ')} finishes={o.finishes} />)
                    : <div className="text-slate-500">{j.context.b?.schools?.join(' / ') || 'no school on file'} · no bouts on file</div>}
                  <GapLine gap={j.context.b?.gap} /></div>
              : <SideCell s={j.context.b} name={j.b_name} />}</td>
            <td className={`${td} whitespace-nowrap`}>
              {j.decision === 'pending' ? <>
                <button onClick={() => decide([j.id], 'same')} className="px-2 py-0.5 border border-emerald-600 text-emerald-700 hover:bg-emerald-50 mr-1">Same</button>
                <button onClick={() => decide([j.id], 'different')} className="px-2 py-0.5 border border-slate-400 hover:bg-slate-50">Different</button>
              </> : <><b className={j.decision === 'same' ? 'text-emerald-700' : 'text-slate-600'}>{j.decision === 'same' ? 'Same' : 'Different'}</b> <button onClick={() => decide([j.id], 'pending')} className="ml-1 underline text-slate-400 hover:text-black">Undo</button></>}
            </td>
          </tr>
          </Fragment>
        ))}</tbody>
      </table>
      {shown.length > limit && <button onClick={() => setLimit(limit + 100)} className="mt-2 text-xs underline">Show 100 more ({shown.length - limit} left)</button>}
      {!shown.length && <p className="text-sm text-slate-400 mt-2">{joins.length ? 'Nothing here.' : 'Nothing found yet — press “Find who may be the same”.'}</p>}
      <div className="mt-5 p-3 border border-slate-200 bg-slate-50 text-sm flex items-center gap-3 flex-wrap">
        <span>{pendingAll ? <><b>{pendingAll}</b> still to decide before profiles can be made.</> : joins.length ? 'All decided.' : ''}</span>
        <button disabled={!!busy || pendingAll > 0 || !joins.length} onClick={async () => { if (!confirm('Give every history entry its wrestler now? Existing profiles are kept; new (inactive) profiles are made for everyone else.')) return; const d = await post({ action: 'assign_people' }, 'assign'); if (d) setMsg(`${d.people.toLocaleString()} wrestlers: ${d.linked.toLocaleString()} linked to existing profiles, ${d.created.toLocaleString()} new profiles; ${d.entries.toLocaleString()} entries assigned.`) }}
          className="px-3 py-1 bg-black text-white disabled:opacity-40">{busy === 'assign' ? 'Making profiles…' : 'Create profiles'}</button>
      </div>
    </div>
  )
}

// one season: weight, school, then every postseason finish (district → region → state), so an impossible run shows
// (Kyle 2026-11-14: a state champion one year and 5th in districts the next didn't happen)
function SeasonLine({ season, weights, school, finishes }: { season: string; weights: number[]; school: string; finishes?: string[] }) {
  const rank = (f: string) => (f.startsWith('District') ? 0 : f.startsWith('Region') ? 1 : 2)
  return (
    <div className="text-slate-600">
      <span className="font-medium text-slate-800">{season}</span> · wt {weights.join('/') || '—'} · {school}
      {finishes?.length ? <div className="pl-3 text-slate-500">{[...finishes].sort((a, b) => rank(a) - rank(b)).map((f, i) => <span key={i}>{i > 0 && ' → '}<span className={/· 1st/.test(f) ? 'font-semibold text-slate-800' : ''}>{f}</span></span>)}</div> : null}
    </div>
  )
}

// how the history connects to what we have: the seasons between them
function GapLine({ gap }: { gap?: Side['gap'] }) {
  if (gap == null) return null
  if (gap === 'overlap') return <div className="font-semibold text-red-700">Overlap: both have the same season — likely different wrestlers</div>
  if (!gap.length) return <div className="font-semibold text-emerald-700">No gap: our first season follows the history&apos;s last</div>
  return <div className="font-semibold text-amber-700">Gap: {gap.join(', ')} missing</div>
}

function SideCell({ s, name }: { s?: Side; name: string }) {
  if (!s) return <span className="font-semibold">{name}</span>
  return (
    <div>
      <span className="font-semibold">{s.names?.join(' / ') ?? name}</span> <span className="text-slate-500">{s.schools?.join(' / ')}</span>
      {s.auto && <div className="text-emerald-700 font-semibold">→ joins our profile automatically ({s.auto.schools.join(' / ') || 'no school'}{s.auto.graduation_year ? `, class of ${s.auto.graduation_year}` : ''})</div>}
      {s.bySeason
        ? s.bySeason.map(x => <SeasonLine key={x.season} season={x.season} weights={x.weights} school={x.school} finishes={x.finishes} />)
        : s.seasons?.map((y, i) => <div key={y} className="text-slate-600">{y} · wt {s.weights?.[i] ?? '—'}</div>)}
    </div>
  )
}
